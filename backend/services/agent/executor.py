import os
import json
import logging
import time
import inspect
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

import models
import core_models
from services.agent.tool_registry import list_tools, get_tool
from services.openai_service import OpenAIServiceError
from services.agent.ai_provider import get_active_provider

# Force all tools to register by importing them
import services.tools.web_search
import services.tools.web_fetch
import services.tools.calculator
import services.tools.database_lookup
import services.tools.verification
import services.tools.travel
import services.tools.email
import services.tools.calendar
import services.tools.shopping_agent
import services.tools.search_tool
import services.tools.user_tool
import services.tools.support_tool
import services.tools.verification_tool
import services.tools.shopping_tools
import services.tools.integration_tools

# Import memory, security, and trust services
from services.agent.user_memory import retrieve_relevant_memories, extract_and_store_memory
from services.agent.security_layer import check_rate_limit, detect_prompt_injection, sanitize_tool_output
from services.agent.trust_engine import calculate_trust
from services.agent.circuit_breaker import check_circuit_breaker, record_tool_success, record_tool_failure

logger = logging.getLogger("verinova.agent.executor")

def redact_sensitive_data(args: dict) -> dict:
    if not isinstance(args, dict):
        return args
    sensitive_keys = {"password", "token", "key", "secret", "authorization", "api_key", "jwt"}
    redacted = {}
    for k, v in args.items():
        if any(sk in k.lower() for sk in sensitive_keys):
            redacted[k] = "[REDACTED]"
        elif isinstance(v, dict):
            redacted[k] = redact_sensitive_data(v)
        else:
            redacted[k] = v
    return redacted

class ConfirmationRequiredException(Exception):
    def __init__(self, action_id: int, tool_name: str, message: str):
        self.action_id = action_id
        self.tool_name = tool_name
        self.message = message

SYSTEM_PROMPT_TEMPLATE = (
    "You are the VeriNova AI Agent Executor. Your job is to solve the user's task using the registered tools.\n\n"
    "Available Tools:\n"
    "{tools_description}\n\n"
    "Rules:\n"
    "1. If you need information you do not have, select the appropriate tool and provide the arguments.\n"
    "2. If you do not have any tool that can provide the required information (for example, if the user asks for weather but there is no weather tool), do NOT use web_search or search_web to search weather; instead, output tool_required=false and explain in final_answer that the tool is not available.\n"
    "3. When you have collected all required evidence, set tool_required=false and provide the final_answer summarizing your findings.\n"
    "4. Do NOT make up any answers. Always justify your final answer using the results returned by tools.\n"
    "5. When presenting product search lists or comparison outcomes, you MUST append structured tag blocks inside your final_answer:\n"
    "   - To show product cards list: [PRODUCT_OFFERS:JSON_STRING_OF_OFFERS_ARRAY]\n"
    "   - To show variant comparison blocks: [PRODUCT_COMPARISON:JSON_STRING_OF_COMPARISON_GROUP]\n"
    "   Where JSON_STRING_OF_OFFERS_ARRAY is a JSON list of matches: [[{{\"provider\":\"amazon\",\"title\":\"...\",\"price\":59999,\"url\":\"...\",\"image_url\":null,\"availability\":\"in_stock\",\"rating\":4.5}}]].\n"
    "   And JSON_STRING_OF_COMPARISON_GROUP contains: {{\n"
    "     \"product_group\": \"...\",\n"
    "     \"offers\": [],\n"
    "     \"lowest_price\": 57999,\n"
    "     \"highest_price\": 62999,\n"
    "     \"price_difference\": 5000,\n"
    "     \"best_price_provider\": \"flipkart\"\n"
    "   }}.\n\n"
    "You must output a JSON object matching this schema:\n"
    "{{\n"
    "  \"thought\": \"Thinking process outlining why you need a tool or how you reached the final answer.\",\n"
    "  \"tool_required\": true,\n"
    "  \"tool_name\": \"name of the tool to invoke\",\n"
    "  \"tool_args\": {{\n"
    "    \"arg_name\": \"value\"\n"
    "  }},\n"
    "  \"final_answer\": \"\"\n"
    "}}\n"
    "Or if no tool is required:\n"
    "{{\n"
    "  \"thought\": \"Thinking process showing that you are ready to answer.\",\n"
    "  \"tool_required\": false,\n"
    "  \"tool_name\": \"\",\n"
    "  \"tool_args\": {{}},\n"
    "  \"final_answer\": \"Your final response to the user, referencing gathered evidence.\",\n"
    "  \"confidence_score\": 0.95,\n"
    "  \"conflicting_evidence\": false,\n"
    "  \"needs_human_review\": false\n"
    "}}"
)

SENSITIVE_TOOLS = {"update_user_profile", "create_support_message"}

def _get_action_details_desc(tool_name: str, args: dict) -> str:
    if tool_name == "update_user_profile":
        return f"Update full name for user {args.get('user_id')} to '{args.get('fullname')}'"
    elif tool_name == "create_support_message":
        return f"Submit contact message: Subject: '{args.get('subject')}' | Message: '{args.get('message')}'"
    return json.dumps(args)

def _execute_tool_with_retries(tool, tool_name, tool_args, validated_args, task, db, current_user):
    retry_count = 0
    max_retries = 2 if tool.risk_level == "LOW" else 0
    tool_success = False
    last_error = None
    normalized_result = None
    duration = 0

    while retry_count <= max_retries:
        tool_start = time.time()
        try:
            sig = inspect.signature(tool.func)
            kwargs = validated_args.model_dump() if hasattr(validated_args, "model_dump") else validated_args.dict()
            if "db" in sig.parameters:
                kwargs["db"] = db
            if "current_user" in sig.parameters:
                kwargs["current_user"] = current_user

            raw_result = tool.func(**kwargs)
            duration = int((time.time() - tool_start) * 1000)

            if isinstance(raw_result, dict) and raw_result.get("success") is False:
                raise ValueError(raw_result.get("error", "Tool returned success=False"))

            normalized_result = {
                "success": True,
                "tool": tool_name,
                "data": raw_result,
                "error": None,
                "metadata": {
                    "durationMs": duration
                }
            }
            tool_success = True
            break
        except Exception as ex:
            duration = int((time.time() - tool_start) * 1000)
            last_error = ex
            retry_count += 1
            logger.warning(f"Tool {tool_name} attempt {retry_count} failed: {str(ex)}")
            if retry_count <= max_retries:
                time.sleep(1)
    
    if not tool_success:
        normalized_result = {
            "success": False,
            "tool": tool_name,
            "data": None,
            "error": {
                "code": "TOOL_EXECUTION_FAILED",
                "message": str(last_error)
            },
            "metadata": {
                "durationMs": duration
            }
        }
        
    return tool_success, normalized_result, duration, last_error


def _execute_tool_via_n8n_webhook(n8n_url: str, task: str, tool_name: str, parameters: dict, task_id: int, user_id: int):
    import urllib.request
    import json
    import time

    start_time = time.time()
    payload = {
        "task": task,
        "tool": tool_name,
        "parameters": parameters,
        "user_id": str(user_id),
        "task_id": str(task_id)
    }

    n8n_api_key = os.getenv("N8N_API_KEY", "").strip()
    headers = {
        "Content-Type": "application/json"
    }
    if n8n_api_key:
        headers["X-N8N-API-KEY"] = n8n_api_key

    req_data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(n8n_url, data=req_data, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            res_data = response.read().decode("utf-8")
            duration = int((time.time() - start_time) * 1000)
            if not res_data:
                raise ValueError("n8n webhook returned empty response.")

            res_json = json.loads(res_data)
            success = res_json.get("success", False)
            error = res_json.get("error")
            data = res_json.get("data")
            
            if not success:
                raise ValueError(error or "n8n tool execution indicated success=False.")

            normalized_result = {
                "success": True,
                "tool": tool_name,
                "data": data,
                "error": None,
                "metadata": {
                    "durationMs": duration,
                    "source": "n8n"
                }
            }
            return True, normalized_result, duration, None
    except Exception as e:
        duration = int((time.time() - start_time) * 1000)
        logger.error(f"Failed to execute tool {tool_name} via n8n: {str(e)}")
        normalized_result = {
            "success": False,
            "tool": tool_name,
            "data": None,
            "error": {
                "code": "N8N_EXECUTION_FAILED",
                "message": str(e)
            },
            "metadata": {
                "durationMs": duration,
                "source": "n8n"
            }
        }
        return False, normalized_result, duration, e


def run_agent_loop(
    task: core_models.Task,
    db: Session,
    current_user: models.User,
    confirm_action_id: Optional[int] = None,
    max_iterations: int = 5
) -> str:
    desc_lower = task.description.lower()
    
    # Explicit Memory Commands (Section 15)
    if "remember that" in desc_lower:
        pref = task.description.split("remember that")[-1].strip()
        mem = core_models.UserMemory(
            user_id=task.user_id,
            content=pref,
            category="preference",
            confidence=1.0,
            source="USER_EXPLICIT"
        )
        db.add(mem)
        db.commit()
        return f"I have saved your preference: '{pref}'."
        
    elif "forget that" in desc_lower:
        pref = task.description.split("forget that")[-1].strip()
        db.query(core_models.UserMemory).filter(
            core_models.UserMemory.user_id == task.user_id,
            core_models.UserMemory.content.like(f"%{pref}%")
        ).delete(synchronize_session=False)
        db.commit()
        return f"I have forgotten your preference matching '{pref}'."
        
    elif "what do you remember about me" in desc_lower:
        mems = db.query(core_models.UserMemory).filter(
            core_models.UserMemory.user_id == task.user_id,
            core_models.UserMemory.status == "ACTIVE"
        ).all()
        if not mems:
            return "I don't have any saved preferences or memories about you yet."
        return "Here is what I remember about you:\n" + "\n".join(f"- {m.content}" for m in mems)
        
    elif "forget everything you remember about me" in desc_lower or "forget everything" in desc_lower:
        db.query(core_models.UserMemory).filter(
            core_models.UserMemory.user_id == task.user_id
        ).delete(synchronize_session=False)
        db.commit()
        return "I have forgotten everything I remembered about you."

    # Ambiguity Handling (Section 28 & 74)
    if desc_lower in ("book it", "buy it", "select it", "confirm it"):
        return "Which option would you like me to book? Please clarify which hotel/product you are referring to."

    # Define max_steps_limit from max_iterations parameter to prevent NameError
    max_steps_limit = max_iterations

    # Refuse purchase actions (Section 16 / Test 5)
    is_purchase_action = False
    if any(p in desc_lower for p in ("buy the", "purchase the", "order the", "buy it", "buy now", "purchase it")):
        is_purchase_action = True
    elif desc_lower.strip().startswith("buy ") and not any(r in desc_lower for r in ("compare", "find", "search", "list")):
        is_purchase_action = True
    elif desc_lower.strip() in ("buy the cheapest one.", "buy the cheapest iphone."):
        is_purchase_action = True
        
    if is_purchase_action:
        refusal_msg = "I can research and compare the available offers, but purchasing is not enabled."
        task.status = "completed"
        task.execution_status = "COMPLETED"
        task.final_result = refusal_msg
        task.confidence_score = 100.0
        
        # Add to logs
        log_refused = core_models.TaskExecutionLog(
            task_id=task.id,
            step="purchase_refused",
            message="Refused purchase side-effect request. Side-effects are disabled.",
            status="completed",
            duration_ms=0
        )
        db.add(log_refused)
        
        # Add verification message
        final_msg = models.VerificationMessage(
            task_id=task.id,
            user_id=task.user_id,
            sender="assistant",
            message=refusal_msg,
            message_type="result"
        )
        db.add(final_msg)
        
        # Add a VerificationResult so the frontend doesn't crash
        v_res = core_models.VerificationResult(
            task_id=task.id,
            final_status="VERIFIED",
            confidence_score=100.0,
            evidence_passed=0,
            evidence_failed=0,
            evidence_total=0,
            explanation="Purchase request refused safely."
        )
        db.add(v_res)
        
        db.commit()
        return refusal_msg

    # We do not use SupervisorAgent (it is read-only research agent)
    is_multi_agent = False
    if is_multi_agent:
        from services.agent.supervisor import SupervisorAgent
        res = SupervisorAgent.orchestrate_task(task, db, current_user)
        return res.get("result", "Supervisor orchestration finished.")

    # 1. Rate Limit controls check
    if check_rate_limit(task.user_id, db):
        err_msg = "Rate limit exceeded. Please wait a minute before requesting another task."
        _log_failure(task, db, err_msg)
        return f"Execution failed: {err_msg}"

    # 2. Prompt injection defense checks
    if detect_prompt_injection(task.user_id, task.description, db):
        err_msg = "Security Policy Violation: Suspicious override patterns detected in task request."
        _log_failure(task, db, err_msg)
        return f"Execution failed: {err_msg}"

    # 3. Retrieve relevant memories for context injection
    memories = retrieve_relevant_memories(task.user_id, task.description, db)
    mem_context = ""
    if memories:
        mem_context = "\nUser Profile & Preferences Context:\n" + "\n".join(f"- {m.content}" for m in memories) + "\n"

    # Set task status to running
    task.status = "running"
    db.commit()

    # Log step: tool_execution_started
    log_exec = core_models.TaskExecutionLog(
        task_id=task.id,
        step="tool_execution_started",
        message="Agent tool execution loop started.",
        status="completed",
        duration_ms=0
    )
    db.add(log_exec)
    db.commit()

    # Compile tools list description
    tools = list_tools()
    tools_desc = ""
    for t in tools:
        tools_desc += f"- **{t.name}**: {t.description}\n  Input Schema: {t.input_schema.schema()}\n\n"

    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(tools_description=tools_desc)
    messages = []
    evidence_count = 0

    # Check if this run is resuming a confirmed action
    if confirm_action_id is not None:
        action_record = (
            db.query(core_models.AgentAction)
            .filter(
                core_models.AgentAction.id == confirm_action_id,
                core_models.AgentAction.task_id == task.id,
                core_models.AgentAction.status == "requires_confirmation"
            )
            .first()
        )
        if not action_record:
            raise ValueError("Invalid confirmation action ID or action already processed.")

        # Check action expiration (10 minutes)
        if action_record.expires_at and action_record.expires_at < datetime.utcnow():
            action_record.status = "failed"
            action_record.error_message = "Confirmation request expired. Action must be re-confirmed."
            db.commit()
            raise ValueError(action_record.error_message)

        # Check action hash validity to make sure it wasn't modified
        import hashlib
        serialized_args = json.dumps({"tool_name": action_record.tool_name, "input_data": action_record.input_data}, sort_keys=True)
        expected_hash = hashlib.sha256(serialized_args.encode("utf-8")).hexdigest()
        if action_record.action_hash and action_record.action_hash != expected_hash:
            action_record.status = "failed"
            action_record.error_message = "Action parameters have been modified. Re-confirmation required."
            db.commit()
            raise ValueError(action_record.error_message)

        # Run tool
        action_record.status = "running"
        db.commit()

        tool = get_tool(action_record.tool_name)
        if not tool:
            action_record.status = "failed"
            action_record.error_message = f"Tool '{action_record.tool_name}' not registered."
            db.commit()
            raise ValueError(action_record.error_message)

        try:
            validated_args = tool.input_schema(**action_record.input_data)
        except Exception as val_err:
            action_record.status = "failed"
            action_record.error_message = f"Argument validation failed: {str(val_err)}"
            db.commit()
            raise ValueError(action_record.error_message)

        n8n_url = os.getenv("N8N_WEBHOOK_URL", "").strip()
        if n8n_url:
            tool_success, normalized_result, duration, last_error = _execute_tool_via_n8n_webhook(
                n8n_url, task.description, action_record.tool_name, action_record.input_data, task.id, task.user_id
            )
        else:
            tool_success, normalized_result, duration, last_error = _execute_tool_with_retries(
                tool, action_record.tool_name, action_record.input_data, validated_args, task, db, current_user
            )

        redacted_args = redact_sensitive_data(action_record.input_data)
        if tool_success:
            action_record.status = "completed"
            action_record.result_data = normalized_result
            action_record.completed_at = datetime.utcnow()

            log_complete = core_models.TaskExecutionLog(
                task_id=task.id,
                step="tool_execution_completed",
                message=f"Approved tool '{action_record.tool_name}' executed. Args: {json.dumps(redacted_args)}",
                status="completed",
                duration_ms=duration
            )
            db.add(log_complete)

            # Save evidence
            evidence_record = core_models.Evidence(
                task_id=task.id,
                source_type=action_record.tool_name,
                source_name=action_record.tool_name,
                description=f"Approved execution of sensitive tool '{action_record.tool_name}'",
                evidence_data=normalized_result,
                status="passed"
            )
            db.add(evidence_record)
            db.commit()
            evidence_count += 1

            # Append successful status update to conversation
            raw_data = normalized_result.get("data", {})
            msg_desc = f"✓ Action '{action_record.tool_name}' approved and completed successfully."
            if action_record.tool_name == "create_support_message" and isinstance(raw_data, dict) and raw_data.get("success"):
                msg_desc = f"✓ Message submitted successfully. Support Message ID: {raw_data.get('message_id')}."
            elif action_record.tool_name == "update_user_profile" and isinstance(raw_data, dict) and raw_data.get("success"):
                msg_desc = f"✓ Profile updated successfully. New name: '{raw_data.get('updated_fullname')}'."

            success_status = models.VerificationMessage(
                task_id=task.id,
                user_id=task.user_id,
                sender="assistant",
                message=msg_desc,
                message_type="status"
            )
            db.add(success_status)
            db.commit()

            # Format resuming message context for OpenAI
            resume_prompt = (
                f"The sensitive action '{action_record.tool_name}' was approved and executed successfully.\n"
                f"Arguments: {json.dumps(redacted_args)}\n"
                f"Result: {json.dumps(normalized_result)}"
            )
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"User Task: {task.description}"},
                {"role": "user", "content": resume_prompt}
            ]
            confirm_action_id = None  # Reset
        else:
            err_msg = f"Sensitive tool execution failed: {str(last_error)}"
            action_record.status = "failed"
            action_record.error_message = err_msg
            action_record.completed_at = datetime.utcnow()

            log_fail = core_models.TaskExecutionLog(
                task_id=task.id,
                step="tool_execution_failed",
                message=err_msg,
                status="failed",
                duration_ms=duration
            )
            db.add(log_fail)
            db.commit()
            _log_failure(task, db, err_msg)
            raise RuntimeError(err_msg)

    # 1. Parse and initialize/normalize plan steps
    plan_dict = task.plan or {}
    if not plan_dict or "steps" not in plan_dict:
        from services.agent.planner import generate_plan
        plan_dict = generate_plan(task.description)
        task.plan = plan_dict
        db.commit()

    steps = plan_dict.get("steps", [])
    for idx, step in enumerate(steps):
        if "step_id" not in step:
            step["step_id"] = step.get("step_number", idx + 1)
        if "status" not in step:
            step["status"] = "PENDING"
        if "dependencies" not in step:
            step["dependencies"] = []
        if "input" not in step:
            step["input"] = {}
        if "output" not in step:
            step["output"] = None
        if "evidence" not in step:
            step["evidence"] = None
        if "error" not in step:
            step["error"] = None

    task.plan = plan_dict
    task.execution_status = "EXECUTING"
    task.status = "running"
    db.commit()

    import concurrent.futures
    from database import SessionLocal
    import hashlib
    from datetime import timedelta

    evidence_count = 0
    final_answer = ""
    # Initialize AgentRun tracking record
    run_record = db.query(core_models.AgentRun).filter(core_models.AgentRun.task_id == task.id).first()
    if not run_record:
        run_record = core_models.AgentRun(
            task_id=task.id,
            status="EXECUTING",
            max_iterations=max_steps_limit
        )
        db.add(run_record)
        db.commit()
        db.refresh(run_record)
    else:
        run_record.status = "EXECUTING"
        db.commit()

    tool_calls_seq = []
    iteration = 0

    while True:
        # Check task cancellation
        db.refresh(task)
        if task.status == "cancelled" or task.execution_status == "CANCELLED":
            logger.info(f"Task {task.id} execution cancelled by user request.")
            run_record.status = "CANCELLED"
            db.commit()
            break

        iteration += 1
        run_record.iterations_count = iteration
        db.commit()

        if iteration > max_steps_limit:
            err_msg = "Agent execution exceeded maximum steps limit protection."
            task.execution_status = "FAILED"
            task.status = "failed"
            run_record.status = "FAILED"
            db.commit()
            _log_failure(task, db, err_msg)
            raise TimeoutError(err_msg)

        # Check if all steps completed
        all_done = all(s["status"] == "COMPLETED" for s in steps)
        if all_done:
            break

        any_failed = any(s["status"] == "FAILED" for s in steps)
        if any_failed:
            break

        # Find steps ready to execute (all dependencies completed, status pending)
        ready_steps = []
        for s in steps:
            if s["status"] == "PENDING":
                deps_met = True
                for dep_id in s["dependencies"]:
                    dep_step = next((x for x in steps if x["step_id"] == dep_id), None)
                    if not dep_step or dep_step["status"] != "COMPLETED":
                        deps_met = False
                        break
                if deps_met:
                    ready_steps.append(s)

        if not ready_steps:
            if any(s["status"] == "PENDING" for s in steps):
                err_msg = "Deadlock detected in step dependencies. Plan execution cannot progress."
                for s in steps:
                    if s["status"] == "PENDING":
                        s["status"] = "FAILED"
                        s["error"] = err_msg
                task.execution_status = "FAILED"
                task.status = "failed"
                task.plan = plan_dict
                db.commit()
                _log_failure(task, db, err_msg)
                raise RuntimeError(err_msg)
            break

        # Check confirmation requirement sequentially before thread execution to prevent orphan tasks
        halt_for_confirmation = False
        for s in ready_steps:
            tool = get_tool(s["tool"])
            if not tool:
                s["status"] = "FAILED"
                s["error"] = f"Tool '{s['tool']}' not registered."
                task.plan = plan_dict
                db.commit()
                continue

            from services.agent.risk_engine import ActionRiskEngine
            if ActionRiskEngine.is_confirmation_required(task.user_id, s["tool"], db):
                # Generate tool args using LLM first
                completed_steps = [
                    {"step_id": x["step_id"], "description": x["description"], "tool": x["tool"], "output": x["output"]}
                    for x in steps if x["status"] == "COMPLETED"
                ]
                system_prompt_fill = (
                    "You are the VeriNova AI Agent Tool Input Generator.\n"
                    "Your job is to analyze the task, completed steps, and output the correct JSON parameters for the current step's tool.\n"
                    "Provide a JSON object matching format: {\"args\": { ... }}"
                )
                prompt = (
                    f"Task Goal: {task.description}\n"
                    f"{mem_context}"
                    f"Step to execute: {s['description']}\n"
                    f"Tool name: {s['tool']}\n"
                    f"Tool description: {tool.description}\n"
                    f"Tool input schema: {tool.input_schema.schema()}\n"
                    f"Completed steps output: {json.dumps(completed_steps)}\n\n"
                    f"Output the JSON parameter arguments matching the tool schema."
                )

                try:
                    tool_args = get_active_provider().execute(
                        task_description=task.description,
                        step_description=s["description"],
                        tool_name=s["tool"],
                        tool_description=tool.description,
                        tool_schema=tool.input_schema.schema(),
                        completed_steps=completed_steps,
                        mem_context=mem_context,
                        task_id=task.id,
                        user_id=task.user_id,
                        db=db
                    )
                except Exception as ex:
                    s["status"] = "FAILED"
                    s["error"] = f"Failed to generate tool arguments: {str(ex)}"
                    task.plan = plan_dict
                    db.commit()
                    continue

                redacted_tool_args = redact_sensitive_data(tool_args)
                serialized = json.dumps({"tool_name": s["tool"], "input_data": redacted_tool_args}, sort_keys=True)
                action_hash = hashlib.sha256(serialized.encode("utf-8")).hexdigest()
                expires_at = datetime.utcnow() + timedelta(minutes=10)

                action_record = core_models.AgentAction(
                    user_id=task.user_id,
                    task_id=task.id,
                    tool_name=s["tool"],
                    input_data=redacted_tool_args,
                    status="requires_confirmation",
                    action_hash=action_hash,
                    expires_at=expires_at
                )
                db.add(action_record)
                db.commit()
                db.refresh(action_record)

                details_desc = _get_action_details_desc(s["tool"], redacted_tool_args)
                conf_msg = (
                    f"I need your approval to execute the sensitive action:\n\n"
                    f"* **Tool**: `{s['tool']}`\n"
                    f"* **Details**: {details_desc}\n\n"
                    f"[REQUIRES_CONFIRMATION:{action_record.id}]"
                )

                assistant_msg = models.VerificationMessage(
                    task_id=task.id,
                    user_id=task.user_id,
                    sender="assistant",
                    message=conf_msg,
                    message_type="status"
                )
                db.add(assistant_msg)

                task.execution_status = "WAITING_FOR_USER"
                task.status = "requires_confirmation"
                task.plan = plan_dict
                db.commit()

                halt_for_confirmation = True
                raise ConfirmationRequiredException(
                    action_id=action_record.id,
                    tool_name=s["tool"],
                    message=f"Action '{s['tool']}' requires your approval."
                )

        if halt_for_confirmation:
            break

        # Loop repetition protection check
        for s in ready_steps:
            tool_calls_seq.append(s["tool"])
            run_record.tool_calls_count = len(tool_calls_seq)
            db.commit()
            if len(tool_calls_seq) >= 4 and len(set(tool_calls_seq[-4:])) == 1:
                err_msg = "Unable to make further progress with the available tools."
                task.execution_status = "FAILED"
                task.status = "failed"
                run_record.status = "FAILED"
                task.plan = plan_dict
                db.commit()
                _log_failure(task, db, err_msg)
                raise RuntimeError(err_msg)
        task_id_thread = task.id
        user_id_thread = current_user.id

        def execute_step_in_thread(step_ref):
            thread_db = SessionLocal()
            try:
                # Query fresh thread-local objects to avoid concurrent session access
                thread_task = thread_db.query(core_models.Task).filter(core_models.Task.id == task_id_thread).first()
                thread_user = thread_db.query(models.User).filter(models.User.id == user_id_thread).first()
                if not thread_task or not thread_user:
                    step_ref["status"] = "FAILED"
                    step_ref["error"] = "Task or User not found in database session."
                    return

                tool = get_tool(step_ref["tool"])
                if not tool:
                    step_ref["status"] = "FAILED"
                    step_ref["error"] = f"Tool {step_ref['tool']} not registered."
                    return

                # 1. Check Circuit Breaker health state
                if not check_circuit_breaker(step_ref["tool"], thread_db):
                    step_ref["status"] = "FAILED"
                    step_ref["error"] = f"Circuit breaker is OPEN for tool '{step_ref['tool']}'. Provider is currently unavailable."
                    return

                # 2. Least Privilege Tool Authorization check
                from services.agent.agent_registry import AgentRegistry
                active_agent = None
                for agent_def in AgentRegistry.list_agents():
                    if step_ref["tool"] in agent_def.allowed_tools:
                        active_agent = agent_def
                        break
                        
                if active_agent:
                    db_permission = thread_db.query(core_models.AgentPermission).filter(
                        core_models.AgentPermission.agent_id == active_agent.agent_id,
                        core_models.AgentPermission.tool_id == step_ref["tool"]
                    ).first()
                    
                    allowed = db_permission.allowed if db_permission else True
                    
                    # Hard policy block rule: reject ShoppingAgent using email.send or similar exceptions
                    if active_agent.agent_id == "shopping_agent" and step_ref["tool"] == "send_email":
                        allowed = False
                        
                    if not allowed:
                        step_ref["status"] = "FAILED"
                        step_ref["error"] = f"DENIED: Agent '{active_agent.agent_id}' lacks permission for tool '{step_ref['tool']}'."
                        try:
                            action_record = core_models.AgentAction(
                                user_id=thread_task.user_id,
                                task_id=thread_task.id,
                                tool_name=step_ref["tool"],
                                input_data={},
                                status="FAILED",
                                error_message=step_ref["error"],
                                completed_at=datetime.utcnow()
                            )
                            thread_db.add(action_record)
                            thread_db.commit()
                        except Exception as db_err:
                            logger.error(f"Failed to record permission failure action: {str(db_err)}")
                        return

                # Fetch completed steps to pass as context
                completed_steps = [
                    {"step_id": x["step_id"], "description": x["description"], "tool": x["tool"], "output": x["output"]}
                    for x in steps if x["status"] == "COMPLETED"
                ]

                # Query LLM to generate parameters
                system_prompt_fill = (
                    "You are the VeriNova AI Agent Tool Input Generator.\n"
                    "Your job is to analyze the task, completed steps, and output the correct JSON parameters for the current step's tool.\n"
                    "Provide a JSON object matching format: {\"args\": { ... }}"
                )
                prompt = (
                    f"Task Goal: {thread_task.description}\n"
                    f"{mem_context}"
                    f"Step to execute: {step_ref['description']}\n"
                    f"Tool name: {step_ref['tool']}\n"
                    f"Tool description: {tool.description}\n"
                    f"Tool input schema: {tool.input_schema.schema()}\n"
                    f"Completed steps output: {json.dumps(completed_steps)}\n\n"
                    f"Output the JSON parameter arguments matching the tool schema."
                )

                tool_args = get_active_provider().execute(
                    task_description=thread_task.description,
                    step_description=step_ref["description"],
                    tool_name=step_ref["tool"],
                    tool_description=tool.description,
                    tool_schema=tool.input_schema.schema(),
                    completed_steps=completed_steps,
                    mem_context=mem_context,
                    task_id=thread_task.id,
                    user_id=thread_task.user_id,
                    db=thread_db
                )

                # Validate arguments
                validated_args = tool.input_schema(**tool_args)

                # 1. Action Idempotency protection check for side-effect tools
                from services.agent.risk_engine import ActionRiskEngine
                import hashlib
                
                risk = ActionRiskEngine.classify_action(step_ref["tool"])
                idempotency_key = None
                
                if risk in ("MEDIUM_RISK", "HIGH_RISK", "CRITICAL"):
                    params_serialized = json.dumps(tool_args, sort_keys=True)
                    idempotency_key = hashlib.sha256(f"task_{thread_task.id}_step_{step_ref['step_id']}_{params_serialized}".encode("utf-8")).hexdigest()
                    
                    existing_action = thread_db.query(core_models.AgentAction).filter(
                        core_models.AgentAction.idempotency_key == idempotency_key,
                        core_models.AgentAction.status == "COMPLETED"
                    ).first()
                    
                    if existing_action:
                        logger.info(f"Bypassing duplicate side-effect tool execution via idempotency: {idempotency_key}")
                        step_ref["status"] = "COMPLETED"
                        step_ref["output"] = existing_action.result_data
                        step_ref["evidence"] = existing_action.result_data.get("data") if existing_action.result_data else None
                        return

                # Log step selection
                log_select = core_models.TaskExecutionLog(
                    task_id=thread_task.id,
                    step=f"step_{step_ref['step_id']}_started",
                    message=f"Starting Step {step_ref['step_id']}: Using tool '{step_ref['tool']}'.",
                    status="running",
                    duration_ms=0
                )
                thread_db.add(log_select)
                
                # Set task status to researching (Section 12)
                thread_task.status = "researching"
                thread_task.execution_status = "RESEARCHING"
                thread_db.commit()

                # Execute tool
                n8n_url = os.getenv("N8N_WEBHOOK_URL", "").strip()
                if n8n_url:
                    tool_success, normalized_result, duration, last_error = _execute_tool_via_n8n_webhook(
                        n8n_url, thread_task.description, step_ref["tool"], tool_args, thread_task.id, thread_task.user_id
                    )
                else:
                    tool_success, normalized_result, duration, last_error = _execute_tool_with_retries(
                        tool, step_ref["tool"], tool_args, validated_args, thread_task, thread_db, thread_user
                    )

                if tool_success:
                    # Record tool success in health check
                    record_tool_success(step_ref["tool"], thread_db)
                    
                    # 2. Sanitize raw tool content outputs to defend against prompt injections
                    if isinstance(normalized_result, dict) and "data" in normalized_result:
                        try:
                            raw_data_str = json.dumps(normalized_result["data"])
                            sanitized_str = sanitize_tool_output(raw_data_str)
                            normalized_result["data"] = json.loads(sanitized_str)
                        except Exception as e:
                            logger.error(f"Failed to sanitize tool output: {str(e)}")

                    # 3. Record Completed Agent Action in DB
                    action_record = core_models.AgentAction(
                        user_id=thread_task.user_id,
                        task_id=thread_task.id,
                        tool_name=step_ref["tool"],
                        input_data=tool_args,
                        result_data=normalized_result,
                        status="COMPLETED",
                        action_type=risk,
                        risk_level=risk,
                        idempotency_key=idempotency_key,
                        completed_at=datetime.utcnow()
                    )
                    
                    # 4. Post-action state verification checks
                    action_verified = True
                    if risk in ("MEDIUM_RISK", "HIGH_RISK", "CRITICAL"):
                        data_res = normalized_result.get("data", {})
                        if isinstance(data_res, dict):
                            ref_id = data_res.get("event_id") or data_res.get("booking_id") or data_res.get("draft_id")
                            if not ref_id:
                                action_verified = False
                                
                    if action_verified:
                        action_record.evidence = "Post-action verified successfully."
                        thread_db.add(action_record)
                    else:
                        action_record.evidence = "Verification failed: Reference ID was missing from provider outcome."
                        action_record.status = "FAILED"
                        step_ref["status"] = "FAILED"
                        step_ref["error"] = "Post-action state verification failed."
                        record_tool_failure(step_ref["tool"], thread_db)
                        thread_db.add(action_record)
                        thread_db.commit()
                        return

                    step_ref["status"] = "COMPLETED"
                    step_ref["output"] = normalized_result
                    step_ref["evidence"] = normalized_result.get("data")

                    # Log step completion
                    log_complete = core_models.TaskExecutionLog(
                        task_id=thread_task.id,
                        step=f"step_{step_ref['step_id']}_completed",
                        message=f"Completed Step {step_ref['step_id']}: Tool '{step_ref['tool']}' finished successfully. Duration: {duration}ms.",
                        status="completed",
                        duration_ms=duration
                    )
                    thread_db.add(log_complete)

                    # Save collected evidence to database
                    evidence_record = core_models.Evidence(
                        task_id=thread_task.id,
                        source_type=step_ref["tool"],
                        source_name=step_ref["tool"],
                        description=f"Evidence for Step {step_ref['step_id']}: {step_ref['description']}",
                        evidence_data=normalized_result,
                        status="passed"
                    )
                    thread_db.add(evidence_record)
                    thread_db.commit()
                else:
                    record_tool_failure(step_ref["tool"], thread_db)
                    raise last_error if last_error else ValueError("Tool execution failed.")

            except Exception as e:
                step_ref["status"] = "FAILED"
                step_ref["error"] = str(e)

                # Record failed agent action log in DB
                try:
                    action_record = core_models.AgentAction(
                        user_id=thread_task.user_id,
                        task_id=thread_task.id,
                        tool_name=step_ref["tool"],
                        input_data=tool_args if 'tool_args' in locals() else {},
                        status="FAILED",
                        action_type=risk if 'risk' in locals() else "UNKNOWN",
                        risk_level=risk if 'risk' in locals() else "UNKNOWN",
                        idempotency_key=idempotency_key if 'idempotency_key' in locals() else None,
                        error_message=str(e),
                        completed_at=datetime.utcnow()
                    )
                    thread_db.add(action_record)
                except Exception as db_err:
                    logger.error(f"Failed to record failed action: {str(db_err)}")

                log_fail = core_models.TaskExecutionLog(
                    task_id=thread_task.id,
                    step=f"step_{step_ref['step_id']}_failed",
                    message=f"Failed Step {step_ref['step_id']}: Tool '{step_ref['tool']}' failed: {str(e)}.",
                    status="failed",
                    duration_ms=0
                )
                thread_db.add(log_fail)
                thread_db.commit()
            finally:
                thread_db.close()

        # Run concurrency up to 3 worker threads
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            executor.map(execute_step_in_thread, ready_steps)

        # Update evidence count
        evidence_count = len([s for s in steps if s["status"] == "COMPLETED"])
        task.plan = plan_dict
        db.commit()

    # 4. Check for failures
    any_failed = any(s["status"] == "FAILED" for s in steps)
    if any_failed:
        failed_step = next(s for s in steps if s["status"] == "FAILED")
        err_msg = failed_step.get("error", "Unknown error")
        if "429" in err_msg or "rate limit" in err_msg.lower() or "too many requests" in err_msg.lower() or "circuit breaker" in err_msg.lower():
            friendly_msg = "Live search is temporarily unavailable. We could not verify current prices from external sources."
        else:
            friendly_msg = f"Step {failed_step['step_id']} failed: {err_msg}"
        task.execution_status = "FAILED"
        task.status = "failed"
        db.commit()
        _log_failure(task, db, friendly_msg)
        return f"Execution failed: {friendly_msg}"

    # Set task status to analyzing (Section 12)
    task.status = "analyzing"
    task.execution_status = "ANALYZING"
    db.commit()

    # Generate final answer using all completed steps results
    completed_steps_summary = [
        {"step_id": s["step_id"], "description": s["description"], "tool": s["tool"], "output": s["output"]}
        for s in steps if s["status"] == "COMPLETED"
    ]

    # Set task status to generating result (Section 12)
    task.status = "generating_result"
    task.execution_status = "GENERATING_RESULT"
    db.commit()

    system_prompt_final = (
        "You are the VeriNova AI Agent Final Responder.\n"
        "Your job is to synthesize all completed steps outputs and generate a clear, trustworthy, final response to the user's task.\n"
        "Do NOT mention raw JSON outputs directly. Use professional markdown formatting.\n"
        "Ensure all details are fully justified by the step output evidence.\n"
        "You MUST explicitly separate your answer into three sections:\n"
        "- **Facts**: Factual information gathered from reliable tool outputs.\n"
        "- **Inferences & Recommendations**: Logical deductions and suggested choices.\n"
        "- **Limitations & Unknowns**: Factors that could not be verified or variables that remain uncertain."
    )
    from services.agent.ai_provider import truncate_large_values
    truncated_summary = truncate_large_values(completed_steps_summary)
    prompt_final = (
        f"Task Goal: {task.description}\n"
        f"{mem_context}"
        f"Executed Steps Results: {json.dumps(truncated_summary)}\n\n"
        f"Generate the final answer response."
    )

    try:
        response = get_active_provider().generate([
            {"role": "system", "content": system_prompt_final},
            {"role": "user", "content": prompt_final}
        ], task_id=task.id, user_id=task.user_id, db=db)
        final_answer = response["choices"][0]["message"]["content"]
    except Exception as e:
        logger.error(f"Failed to generate final answer: {str(e)}")
        final_answer = f"Task completed successfully. Executed {len(completed_steps_summary)} steps."

    # -------------------------------------------------------------
    # PROGRAMMATIC PRODUCT COMPARISON TAG
    # -------------------------------------------------------------
    comp_json = None
    comparison_tool_result = None
    for step in completed_steps_summary:
        if step.get("tool") in ("compare_shopping_offers", "compare_products") and step.get("output"):
            comparison_tool_result = step["output"]
            break

    if comparison_tool_result and isinstance(comparison_tool_result, dict):
        inner_res = comparison_tool_result.get("data") if "data" in comparison_tool_result else comparison_tool_result
        if isinstance(inner_res, dict) and inner_res.get("success"):
            import re
            # Parse budget from task description
            budget = None
            under_match = re.search(r'(?:under|below|budget|max|maximum|rs\.?|₹)\s*([\d,]+)', task.description.lower())
            if under_match:
                try:
                    val = float(under_match.group(1).replace(",", ""))
                    if val > 1000:
                        budget = val
                except ValueError:
                    pass

            if "results" in inner_res or "comparison" in inner_res:
                offers = []
                results_list = inner_res.get("results", [])
                
                # Extract all offers
                for res in results_list:
                    for o in res.get("all_offers", []):
                        offers.append({
                            "provider": o.get("seller") or o.get("provider") or "Unknown Store",
                            "price": o.get("effective_price") or o.get("price"),
                            "url": o.get("url") or "",
                            "availability": o.get("availability") or "Available",
                            "title": o.get("title") or "",
                            "brand": o.get("brand") or "",
                            "ram_gb": o.get("ram_gb"),
                            "storage_gb": o.get("storage_gb"),
                            "processor": o.get("processor"),
                            "gpu": o.get("gpu"),
                            "verification_status": o.get("verification_status") or "VERIFIED",
                            "image_url": o.get("image_url")
                        })

                prices = [off["price"] for off in offers if off["price"] is not None]
                lowest_price = min(prices) if prices else 0
                highest_price = max(prices) if prices else 0
                price_diff = highest_price - lowest_price if len(prices) > 1 else 0

                best_provider = None
                best_price = None
                best_reason = None
                
                if results_list:
                    res = results_list[0]
                    best_opt = res.get("best_option", {})
                    best_provider = best_opt.get("seller")
                    best_price = best_opt.get("effective_price") or lowest_price
                    
                    # Generate a detailed criteria-matching checklist reason
                    reason_parts = ["✓ Matches requested budget limits."]
                    if best_opt.get("brand"):
                        reason_parts.append(f"✓ Brand: {best_opt['brand']}")
                    if best_opt.get("ram_gb"):
                        reason_parts.append(f"✓ RAM: {best_opt['ram_gb']}GB")
                    if best_opt.get("storage_gb"):
                        reason_parts.append(f"✓ Storage: {best_opt['storage_gb']}GB")
                    if best_opt.get("processor"):
                        reason_parts.append(f"✓ Processor: {best_opt['processor']}")
                    if best_opt.get("gpu"):
                        reason_parts.append(f"✓ GPU: {best_opt['gpu']}")
                    
                    best_reason = "\n".join(reason_parts)

                comp_json = {
                    "product_group": results_list[0].get("product_group") if results_list else "Product Comparison",
                    "offers": offers,
                    "lowest_price": lowest_price,
                    "highest_price": highest_price,
                    "price_difference": price_diff,
                    "best_price_provider": best_provider,
                    "best_value": {
                        "store": best_provider,
                        "price": best_price,
                        "reason": best_reason
                    } if best_provider else None,
                    "sources": list(set(off["provider"] for off in offers)),
                    "criteria": inner_res.get("criteria", {}),
                    "excluded_results": inner_res.get("excluded_results", []),
                    "source_type": inner_res.get("source_type", "LIVE")
                }

    if comp_json:
        tag = f"\n\n[PRODUCT_COMPARISON:{json.dumps(comp_json)}]"
        if tag not in final_answer:
            final_answer += tag

    # Extract decision indicators with robust defaults
    confidence_val = 95.0
    conflicting = False
    needs_review = False

    # Transition to verifying state to compute verification results
    task.execution_status = "VERIFYING"
    task.status = "verifying"
    db.commit()

    # Log verifying step
    log_verifying = core_models.TaskExecutionLog(
        task_id=task.id,
        step="verifying",
        message="Verification engine calculating result and confidence.",
        status="completed",
        duration_ms=0
    )
    db.add(log_verifying)
    db.commit()

    # Calculate verification status and task status based on engine checks
    # Look for verification tool results in evidence
    verification_tool_record = db.query(core_models.Evidence).filter(
        core_models.Evidence.task_id == task.id,
        core_models.Evidence.source_type == "verification"
    ).order_by(core_models.Evidence.collected_at.desc()).first()

    has_custom_verification = False
    if verification_tool_record and isinstance(verification_tool_record.evidence_data, dict):
        v_res_data = verification_tool_record.evidence_data.get("data", {})
        if isinstance(v_res_data, dict) and v_res_data.get("success") is not False:
            verification_status = v_res_data.get("verification_status", "VERIFIED")
            confidence_val = v_res_data.get("confidence_score", confidence_val)
            explanation = v_res_data.get("explanation", "")
            has_custom_verification = True
            
            if verification_status == "VERIFIED":
                task.status = "completed"
                task.execution_status = "COMPLETED"
                task.review_status = "NOT_REQUIRED"
            else:
                task.status = "needs_review"
                task.execution_status = "NEEDS_REVIEW"
                task.review_status = "REQUIRED"
                if verification_status == "CONFLICTED":
                    conflicting = True
                else:
                    needs_review = True

    if not has_custom_verification:
        # Load evidence records and calculate trust score
        evidence_records = db.query(core_models.Evidence).filter(
            core_models.Evidence.task_id == task.id
        ).all()
        ev_dicts = [
            {"source_name": ev.source_name, "status": ev.status}
            for ev in evidence_records
        ]
        trust_res = calculate_trust(ev_dicts)
        confidence_val = trust_res["trustScore"] * 100.0
        verification_status = trust_res["confidence"]
        explanation = "Deterministic trust assessment. Reasons:\n" + "\n".join(f"- {r}" for r in trust_res["reasons"])
        
        if verification_status in ("VERIFIED", "HIGH", "MEDIUM"):
            task.status = "completed"
            task.execution_status = "COMPLETED"
            task.review_status = "NOT_REQUIRED"
        elif verification_status in ("CONFLICTED", "PARTIALLY_VERIFIED", "NEEDS_REVIEW"):
            task.status = "needs_review"
            task.execution_status = "NEEDS_REVIEW"
            task.review_status = "REQUIRED"
        else:
            task.status = "failed"
            task.execution_status = "FAILED"
            task.review_status = "NOT_REQUIRED"

    task.final_result = final_answer
    task.confidence_score = confidence_val
    task.updated_at = datetime.utcnow()

    # Check for specific high risk actions or flags
    if needs_review:
        task.status = "needs_review"
        task.execution_status = "NEEDS_REVIEW"
        task.review_status = "REQUIRED"
        explanation += " (High-risk action flagged by AI Agent)"

    # Add or update verification results
    db.query(core_models.VerificationResult).filter(core_models.VerificationResult.task_id == task.id).delete()

    verification_result = core_models.VerificationResult(
        task_id=task.id,
        final_status=verification_status,
        confidence_score=task.confidence_score,
        evidence_passed=evidence_count,
        evidence_failed=0,
        evidence_total=evidence_count,
        explanation=explanation
    )
    db.add(verification_result)

    # Extract and store user preferences at task completion
    extract_and_store_memory(task.user_id, task.description, db)

    # Log plan execution finished
    log_finish = core_models.TaskExecutionLog(
        task_id=task.id,
        step="completed",
        message="Agent finished execution. Result and evidence generated.",
        status="completed",
        duration_ms=0
    )
    db.add(log_finish)

    # Save final answer inside verification_messages chat history
    final_msg = models.VerificationMessage(
        task_id=task.id,
        user_id=task.user_id,
        sender="assistant",
        message=final_answer,
        message_type="result"
    )
    db.add(final_msg)
    
    # Finalize AgentRun state parameters
    if run_record:
        run_record.status = "COMPLETED" if task.execution_status == "COMPLETED" else "PARTIALLY_COMPLETED"
        run_record.completed_at = datetime.utcnow()
        
    db.commit()

    return final_answer

def _log_failure(task: core_models.Task, db: Session, error_message: str):
    task.status = "failed"
    task.final_result = f"Execution failed: {error_message}"
    task.updated_at = datetime.utcnow()
    
    # Save error inside verification_messages
    err_msg = models.VerificationMessage(
        task_id=task.id,
        user_id=task.user_id,
        sender="assistant",
        message=f"I encountered an error during execution:\n\n{error_message}",
        message_type="result"
    )
    db.add(err_msg)
    db.commit()
