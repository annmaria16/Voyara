import os
import json
import logging
from dotenv import load_dotenv
load_dotenv(override=True)
from services.openai_service import call_openai_chat, OpenAIServiceError

import threading
import contextvars
logger = logging.getLogger("verinova.ai_provider")
gemini_concurrency_limiter = threading.Semaphore(2)
request_id_ctx = contextvars.ContextVar("request_id", default=None)

class GeminiRateLimitError(Exception):
    def __init__(self, message: str, retry_delay_seconds: float = None):
        super().__init__(message)
        self.retry_delay_seconds = retry_delay_seconds

def truncate_large_values(data, max_len=1500):
    if isinstance(data, dict):
        new_dict = {}
        for k, v in data.items():
            if k in ("content", "html", "raw_html", "text", "body") and isinstance(v, str) and len(v) > max_len:
                new_dict[k] = v[:max_len] + f"... [truncated {len(v) - max_len} chars]"
            else:
                new_dict[k] = truncate_large_values(v, max_len)
        return new_dict
    elif isinstance(data, list):
        if len(data) > 6:
            truncated_list = [truncate_large_values(item, max_len) for item in data[:6]]
            truncated_list.append(f"... [truncated {len(data) - 6} items]")
            return truncated_list
        else:
            return [truncate_large_values(item, max_len) for item in data]
    elif isinstance(data, str):
        if len(data) > max_len:
            return data[:max_len] + f"... [truncated {len(data) - max_len} chars]"
        return data
    else:
        return data

class AIProviderInterface:
    def generate(self, messages: list, response_format: dict = None, task_id: int = None, user_id: int = None, db = None) -> dict:
        raise NotImplementedError()

    def plan(self, user_goal: str, conversation_context: list = None, user_preferences: list = None, available_tools: list = None, security_policy: str = "", automation_policy: str = "") -> dict:
        raise NotImplementedError()

    def execute(self, task_description: str, step_description: str, tool_name: str, tool_description: str, tool_schema: dict, completed_steps: list, mem_context: str = "", task_id: int = None, user_id: int = None, db = None) -> dict:
        raise NotImplementedError()


class OpenAIProvider(AIProviderInterface):
    def generate(self, messages: list, response_format: dict = None, task_id: int = None, user_id: int = None, db = None) -> dict:
        return call_openai_chat(
            messages=messages,
            response_format=response_format,
            task_id=task_id,
            user_id=user_id,
            db=db
        )

    def plan(self, user_goal: str, conversation_context: list = None, user_preferences: list = None, available_tools: list = None, security_policy: str = "", automation_policy: str = "") -> dict:
        from services.agent.tool_registry import list_tools
        tools = available_tools or list_tools()
        tools_desc = ""
        for t in tools:
            tools_desc += f"- **{t.name}**: {t.description} (Risk: {t.riskLevel}, Permissions: {t.permissions})\n"

        context_str = json.dumps(conversation_context or [])
        pref_str = json.dumps(user_preferences or [])

        system_prompt = (
            "You are the VeriNova AI Agent Task Planner. Your job is to analyze the user's goal, conversation history, user preferences, and tools to construct a structured plan with dependencies.\n\n"
            "Do NOT execute any actions. Do NOT claim the task has already been completed.\n\n"
            f"Available Tools in the Registry:\n{tools_desc}\n\n"
            "Each step must identify its tool, expected output, and list any dependencies (earlier step numbers it requires before execution).\n\n"
            "You MUST output a JSON object matching this schema:\n"
            "{\n"
            "  \"goal\": \"Concise goal of the task\",\n"
            "  \"objective\": \"Concise goal of the task\",\n"
            "  \"task_type\": \"the classification category\",\n"
            "  \"steps\": [\n"
            "    {\n"
            "      \"step_number\": 1,\n"
            "      \"description\": \"Description of what to do\",\n"
            "      \"tool\": \"Tool name from registry\",\n"
            "      \"expected_output\": \"Description of expected data return\",\n"
            "      \"dependencies\": [],\n"
            "      \"requires_confirmation\": false\n"
            "    }\n"
            "  ],\n"
            "  \"requiredTools\": [\"tool names used in steps\"],\n"
            "  \"required_tools\": [\"tool names used in steps\"],\n"
            "  \"riskLevel\": \"LOW_RISK\",\n"
            "  \"risk_level\": \"LOW_RISK\",\n"
            "  \"requiresConfirmation\": false,\n"
            "  \"requires_confirmation\": false,\n"
            "  \"successCriteria\": \"Explicit criteria to mark this task COMPLETED\"\n"
            "}"
        )

        user_prompt = (
            f"User Goal: {user_goal}\n"
            f"Conversation History: {context_str}\n"
            f"User Preferences: {pref_str}\n"
            f"Security Policy: {security_policy}\n"
            f"Automation Policy: {automation_policy}"
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        response = self.generate(messages, response_format={"type": "json_object"})
        content = response["choices"][0]["message"]["content"]
        plan_data = json.loads(content)
        if "evidence_requirements" not in plan_data:
            plan_data["evidence_requirements"] = []
        if "verification_requirements" not in plan_data:
            plan_data["verification_requirements"] = []
        for step in plan_data.get("steps", []):
            if "action" not in step:
                step["action"] = step.get("tool", "")
        return plan_data

    def execute(self, task_description: str, step_description: str, tool_name: str, tool_description: str, tool_schema: dict, completed_steps: list, mem_context: str = "", task_id: int = None, user_id: int = None, db = None) -> dict:
        system_prompt_fill = (
            "You are the VeriNova AI Agent Tool Input Generator.\n"
            "Your job is to analyze the task, completed steps, and output the correct JSON parameters for the current step's tool.\n"
            "Provide a JSON object matching format: {\"args\": { ... }}"
        )
        prompt = (
            f"Task Goal: {task_description}\n"
            f"{mem_context}"
            f"Step to execute: {step_description}\n"
            f"Tool name: {tool_name}\n"
            f"Tool description: {tool_description}\n"
            f"Tool input schema: {tool_schema}\n"
            f"Completed steps output: {json.dumps(completed_steps)}\n\n"
            f"Output the JSON parameter arguments matching the tool schema."
        )

        response = self.generate([
            {"role": "system", "content": system_prompt_fill},
            {"role": "user", "content": prompt}
        ], response_format={"type": "json_object"}, task_id=task_id, user_id=user_id, db=db)
        
        args_content = json.loads(response["choices"][0]["message"]["content"])
        return args_content.get("args", {})


class LocalProvider(AIProviderInterface):
    def generate(self, messages: list, response_format: dict = None, task_id: int = None, user_id: int = None, db = None) -> dict:
        system_msg = next((m["content"] for m in messages if m["role"] == "system"), "")
        user_msg = next((m["content"] for m in messages if m["role"] == "user"), "")
        
        content = ""
        # 1. User Preference Extractor
        if "User Preference Extractor" in system_msg:
            content = json.dumps({
                "has_memory": False,
                "memories": []
            })
        # 2. Tool Input Generator
        elif "Tool Input Generator" in system_msg:
            tool_name = ""
            task_goal = ""
            for line in user_msg.split("\n"):
                if "Tool name: " in line:
                    tool_name = line.split("Tool name: ")[-1].strip()
                if "Task Goal: " in line:
                    task_goal = line.split("Task Goal: ")[-1].strip()
            
            args = self._mock_args(tool_name, task_goal)
            content = json.dumps({"args": args})
        # 3. Final Responder
        elif "Final Responder" in system_msg:
            content = (
                "### Active AI Provider: Local Development\n\n"
                "This is a local development mock response. VeriNova is currently running in **Local/Development Mode** ($0 API costs).\n\n"
                "**Facts**:\n"
                "- System is offline/local mode. No external OpenAI API requests were made.\n"
                "- Task description: \"" + user_msg.split("Task Goal: ")[-1].split("\n")[0] + "\"\n"
            )
            
            if "explain what verinova is" in user_msg.lower():
                content += (
                    "- VeriNova is a secure, multi-agent AI orchestration platform featuring structured execution planning, policy gates, and post-action verification.\n"
                    "- The platform currently supports three core capabilities:\n"
                    "  1. **Dynamic Task Deconstruction & Planning**: Decomposing user goals into structured dependency graphs.\n"
                    "  2. **Confirmation Gatekeeper**: Pausing high-risk operations until user approval is received.\n"
                    "  3. **Multi-Agent Resource Locking**: Preventing concurrent agent conflicts with shared state locks.\n\n"
                    "**Inferences & Recommendations**:\n"
                    "- You are running in free development mode, which successfully prevents external billing while maintaining full UI functionality.\n"
                    "- You can switch back to production OpenAI integration by setting `AI_PROVIDER=openai` in `.env`.\n\n"
                    "**Limitations & Unknowns**:\n"
                    "- Actual external service execution (purchasing, booking, sending emails) is restricted or simulated. Real payments or account changes will not be finalized."
                )
            else:
                content += (
                    "- Task was processed locally using mock logic.\n\n"
                    "**Inferences & Recommendations**:\n"
                    "- Development mode works structurally. To run complex real tasks, switch `AI_PROVIDER` to `openai`.\n\n"
                    "**Limitations & Unknowns**:\n"
                    "- The response is programmatically generated in local development mode."
                )
        else:
            content = "Response generated by Local Development AI Provider."

        return {
            "choices": [{
                "message": {
                    "role": "assistant",
                    "content": content
                }
            }],
            "usage": {
                "prompt_tokens": 0,
                "completion_tokens": 0
            }
        }

    def plan(self, user_goal: str, conversation_context: list = None, user_preferences: list = None, available_tools: list = None, security_policy: str = "", automation_policy: str = "") -> dict:
        goal_lower = user_goal.lower()
        steps = []

        if any(x in goal_lower for x in ("hotel", "travel", "trip", "kochi")):
            steps.append({
                "step_number": 1,
                "description": "Simulate booking Kochi hotel",
                "tool": "execute_booking",
                "expected_output": "Booking reference details",
                "dependencies": [],
                "requires_confirmation": True
            })
        elif any(x in goal_lower for x in ("buy", "price", "laptop", "phone", "compare", "purchase")):
            steps.append({
                "step_number": 1,
                "description": "Compare product offers",
                "tool": "compare_shopping_offers",
                "expected_output": "Compared offers array",
                "dependencies": [],
                "requires_confirmation": False
            })
        elif any(x in goal_lower for x in ("email", "draft", "send")):
            steps.append({
                "step_number": 1,
                "description": "Draft email notification",
                "tool": "draft_email",
                "expected_output": "Email draft details",
                "dependencies": [],
                "requires_confirmation": False
            })
        elif "weather" in goal_lower:
            steps.append({
                "step_number": 1,
                "description": "Get weather report",
                "tool": "weather_lookup",
                "expected_output": "Weather conditions data",
                "dependencies": [],
                "requires_confirmation": False
            })

        if not steps:
            # Default fallback search plan for general queries (like VeriNova AI research)
            steps.append({
                "step_number": 1,
                "description": f"Search the web for up-to-date information on: {user_goal}",
                "tool": "web_search",
                "expected_output": "Search result list containing sources and links.",
                "dependencies": [],
                "requires_confirmation": False
            })
            steps.append({
                "step_number": 2,
                "description": "Fetch details from the top search source link to compile evidence.",
                "tool": "web_fetch",
                "expected_output": "Detailed scraped webpage content text.",
                "dependencies": [1],
                "requires_confirmation": False
            })

        required_tools = [s["tool"] for s in steps]
        
        plan_data = {
            "goal": user_goal,
            "objective": user_goal,
            "task_type": "agent_planning",
            "steps": steps,
            "requiredTools": required_tools,
            "required_tools": required_tools,
            "riskLevel": "HIGH_RISK" if any(s["requires_confirmation"] for s in steps) else "LOW_RISK",
            "risk_level": "HIGH" if any(s["requires_confirmation"] for s in steps) else "LOW",
            "requiresConfirmation": any(s["requires_confirmation"] for s in steps),
            "requires_confirmation": any(s["requires_confirmation"] for s in steps),
            "successCriteria": "Goal completed successfully via Local/Development AI",
            "evidence_requirements": ["Validate action receipt and status"],
            "verification_requirements": ["Confirm task execution state is COMPLETED"]
        }
        
        for idx, step in enumerate(steps):
            step["step_id"] = step.get("step_number", idx + 1)
            step["dependencies"] = step.get("dependencies", [])
            step["status"] = "PENDING"
            step["action"] = step.get("tool", "")
            
        return plan_data

    def execute(self, task_description: str, step_description: str, tool_name: str, tool_description: str, tool_schema: dict, completed_steps: list, mem_context: str = "", task_id: int = None, user_id: int = None, db = None) -> dict:
        return self._mock_args(tool_name, task_description)

    def _mock_args(self, tool_name: str, task_description: str = "") -> dict:
        tool_lower = (tool_name or "").lower()
        if "booking" in tool_lower:
            return {"item_type": "hotel", "item_name": "Cozy Center Suite", "price": 4500.0, "details": "Guest: Local Guest"}
        elif "purchase" in tool_lower:
            return {"product_id": "laptop_123"}
        elif "email" in tool_lower:
            return {"to_email": "recipient@example.com", "subject": "Notification", "body": "Local mode notification message"}
        elif "weather" in tool_lower:
            return {"location": "Kochi", "date": "tomorrow"}
        elif "shopping" in tool_lower or "compare" in tool_lower:
            return {"query": task_description or "laptop"}
        elif "search" in tool_lower:
            return {"query": task_description or "VeriNova AI capabilities"}
        elif "fetch" in tool_lower:
            return {"url": "https://verinova.ai"}
        return {}


def _record_gemini_cost_metrics(model_name: str, res_json: dict, task_id: int, user_id: int, db):
    if not db:
        return
        
    usage = res_json.get("usageMetadata", {})
    input_tokens = usage.get("promptTokenCount", 0)
    output_tokens = usage.get("candidatesTokenCount", 0)
    
    # Gemini 2.0 Flash pricing: $0.075 / 1M input tokens, $0.30 / 1M output tokens
    cost = (input_tokens * 0.075 / 1000000) + (output_tokens * 0.30 / 1000000)
    
    try:
        import core_models
        cost_record = core_models.AiCostLog(
            task_id=task_id,
            user_id=user_id,
            model=model_name,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            estimated_cost=cost
        )
        db.add(cost_record)
        
        # Log to model_usages table
        model_usage = core_models.ModelUsage(
            task_id=task_id,
            model_name=model_name,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost_usd=cost
        )
        db.add(model_usage)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to record Gemini AI cost log metrics: {str(e)}")


class GeminiProvider(AIProviderInterface):
    def generate(
        self,
        messages: list,
        response_format: dict = None,
        task_id: int = None,
        user_id: int = None,
        db=None,
        is_retry: bool = False
    ) -> dict:
        """
        Generate a response using Gemini.

        Important:
        - Normal generation does NOT automatically enable Google Search.
        - Google Search is enabled only when explicitly requested with:
            response_format={"use_web_search": True}
        - Supports OpenAI-style messages.
        - Supports JSON response mode.
        - Preserves the existing VeriNova return format.
        """

        import urllib.request
        import urllib.parse
        import urllib.error
        from datetime import datetime

        gemini_key = os.getenv("GEMINI_API_KEY", "").strip()

        if not gemini_key:
            raise Exception("Gemini API key is not configured.")

        # Use the model configured in .env.
        model = os.getenv(
            "GEMINI_MODEL",
            "gemini-3.5-flash"
        ).strip()

        # ---------------------------------------------------------
        # 1. Convert OpenAI-style messages to Gemini format
        # ---------------------------------------------------------

        system_instruction = None
        gemini_contents = []

        if not isinstance(messages, list):
            raise TypeError(
                "GeminiProvider.generate() expects messages to be a list."
            )

        for msg in messages:

            if not isinstance(msg, dict):
                raise TypeError(
                    f"Invalid message. Expected dict, got {type(msg).__name__}."
                )

            role = msg.get("role", "user")
            content = msg.get("content", "")

            if content is None:
                content = ""

            content = str(content)

            # Gemini handles system instruction separately.
            if role == "system":

                if system_instruction is None:
                    system_instruction = {
                        "parts": [
                            {
                                "text": content
                            }
                        ]
                    }
                else:
                    # Combine multiple system messages.
                    system_instruction["parts"].append(
                        {
                            "text": content
                        }
                    )

                continue

            # Gemini uses:
            # user
            # model
            gemini_role = (
                "model"
                if role == "assistant"
                else "user"
            )

            gemini_contents.append(
                {
                    "role": gemini_role,
                    "parts": [
                        {
                            "text": content
                        }
                    ]
                }
            )

        if not gemini_contents:
            raise ValueError(
                "No user/assistant messages were supplied to Gemini."
            )

        # ---------------------------------------------------------
        # 2. Response format
        # ---------------------------------------------------------

        response_mime_type = None

        if (
            isinstance(response_format, dict)
            and response_format.get("type") == "json_object"
        ):
            response_mime_type = "application/json"

        # ---------------------------------------------------------
        # 3. Build Gemini request
        # ---------------------------------------------------------

        url = (
            "https://generativelanguage.googleapis.com/"
            f"v1beta/models/{model}:generateContent"
            f"?key={gemini_key}"
        )

        payload = {
            "contents": gemini_contents
        }

        if system_instruction:
            payload["systemInstruction"] = system_instruction

        # Generation configuration.
        generation_config = {
            "temperature": 0.2,
            "maxOutputTokens": 2048
        }

        if response_mime_type:
            generation_config["maxOutputTokens"] = 1024
            generation_config["responseMimeType"] = response_mime_type

        payload["generationConfig"] = generation_config

        # ---------------------------------------------------------
        # 4. Google Search is OFF by default
        # ---------------------------------------------------------
        #
        # This is the important fix.
        #
        # Previously VeriNova automatically added:
        #
        #     "tools": [{"googleSearch": {}}]
        #
        # to every normal request.
        #
        # That caused unnecessary quota usage / 429 responses.
        #
        # Search should only happen when explicitly requested.
        # ---------------------------------------------------------

        enable_search = False

        if (
            isinstance(response_format, dict)
            and response_format.get("use_web_search") is True
        ):
            enable_search = True

        if enable_search:
            payload["tools"] = [
                {
                    "googleSearch": {}
                }
            ]

        # ---------------------------------------------------------
        # 5. HTTP request
        # ---------------------------------------------------------

        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

        req_data = json.dumps(payload).encode("utf-8")

        req = urllib.request.Request(
            url,
            data=req_data,
            headers=headers,
            method="POST"
        )

        logger.info(f"Gemini generate content: sending request to model={model}...")

        # ---------------------------------------------------------
        # 6. Call Gemini with retry/backoff & Concurrency Limiter
        # ---------------------------------------------------------
        import uuid
        ctx_id = request_id_ctx.get()
        request_id = ctx_id if ctx_id else (f"task_{task_id}" if task_id else f"req_{uuid.uuid4().hex[:6]}")

        # Concurrency Limiter: Wait up to 15 seconds. If busy, raise GeminiRateLimitError.
        acquired = gemini_concurrency_limiter.acquire(timeout=15.0)
        if not acquired:
            raise GeminiRateLimitError("AI service is busy handling other requests. Please try again shortly.", retry_delay_seconds=15)

        import time
        import random

        MAX_ATTEMPTS = 3
        res_json = None

        try:
            for attempt in range(1, MAX_ATTEMPTS + 1):
                logger.info(f"[Gemini] request_id={request_id} attempt={attempt}")
                try:
                    with urllib.request.urlopen(
                        req,
                        timeout=15
                    ) as response:

                        status_code = response.status
                        res_data = response.read().decode("utf-8")

                        if not res_data:
                            raise Exception("Gemini returned an empty HTTP response.")

                        try:
                            res_json = json.loads(res_data)
                        except json.JSONDecodeError:
                            logger.error(f"[Gemini] request_id={request_id} status=InvalidJSON")
                            raise Exception("Gemini returned an invalid JSON response.")

                        logger.info(f"[Gemini] request_id={request_id} status=200")
                        logger.info(f"[Gemini] request_id={request_id} completed")
                        break

                except urllib.error.HTTPError as e:
                    error_body = ""
                    try:
                        error_body = e.read().decode("utf-8")
                    except Exception:
                        pass

                    logger.info(f"[Gemini] request_id={request_id} status={e.code}")

                    # Abort immediately on non-retryable errors (not 429, not 5xx)
                    if e.code not in (429, 500, 502, 503, 504):
                        if e.code == 400:
                            raise Exception(f"Gemini rejected request (HTTP 400): {error_body}")
                        elif e.code in (401, 403):
                            raise Exception(f"Gemini authentication/permission error (HTTP {e.code}): {error_body}")
                        else:
                            raise Exception(f"Gemini API request failed with HTTP {e.code}: {error_body}")

                    # Determine retry delay from Retry-After header
                    retry_seconds = None
                    retry_after_hdr = e.headers.get("Retry-After")
                    if retry_after_hdr:
                        try:
                            retry_seconds = float(retry_after_hdr)
                        except ValueError:
                            pass

                    # Parse from JSON details if 429
                    if e.code == 429 and not retry_seconds:
                        try:
                            err_data = json.loads(error_body)
                            details = err_data.get("error", {}).get("details", [])
                            for detail in details:
                                if "RetryInfo" in detail.get("@type", "") or "retryDelay" in detail:
                                    delay_str = detail.get("retryDelay", "60s")
                                    if delay_str.endswith("s"):
                                        retry_seconds = float(delay_str[:-1])
                                    else:
                                        retry_seconds = float(delay_str)
                                    break
                        except Exception:
                            pass

                    if attempt >= MAX_ATTEMPTS:
                        if e.code == 429:
                            msg = "Gemini API rate limit exceeded (HTTP 429)."
                            if retry_seconds:
                                msg += f" Please retry in {int(retry_seconds)} seconds."
                            else:
                                msg += " Please try again in a minute."
                            raise GeminiRateLimitError(msg, retry_delay_seconds=retry_seconds)
                        else:
                            raise Exception(f"Gemini API request failed after all retries (HTTP {e.code}): {error_body}")

                    # Exponential backoff: 2s, 4s, 8s + jitter
                    delay = (2 ** attempt) + random.uniform(0.2, 0.8)
                    if retry_seconds and retry_seconds > delay:
                        delay = retry_seconds

                    logger.info(f"[Gemini] request_id={request_id} retry={delay:.2f}")
                    time.sleep(delay)

                except urllib.error.URLError as e:
                    logger.info(f"[Gemini] request_id={request_id} status=NetworkError")
                    if attempt >= MAX_ATTEMPTS:
                        raise Exception(f"Gemini network error after all retries: {str(e.reason)}")

                    delay = (2 ** attempt) + random.uniform(0.2, 0.8)
                    logger.info(f"[Gemini] request_id={request_id} retry={delay:.2f}")
                    time.sleep(delay)
        finally:
            gemini_concurrency_limiter.release()

        # ---------------------------------------------------------
        # 7. Validate Gemini response
        # ---------------------------------------------------------

        candidates = res_json.get(
            "candidates",
            []
        )

        if not candidates:

            prompt_feedback = res_json.get(
                "promptFeedback"
            )

            raise Exception(
                "Gemini returned no candidates. "
                f"Prompt feedback: {prompt_feedback}"
            )

        first_candidate = candidates[0]

        finish_reason = first_candidate.get(
            "finishReason"
        )

        candidate_content = first_candidate.get(
            "content",
            {}
        )

        parts = candidate_content.get(
            "parts",
            []
        )

        # ---------------------------------------------------------
        # 8. Extract text
        # ---------------------------------------------------------

        text_parts = []

        for part in parts:

            if not isinstance(part, dict):
                continue

            text = part.get("text")

            if text:
                text_parts.append(
                    str(text)
                )

        content_text = "\n".join(
            text_parts
        ).strip()

        if not content_text:

            logger.error(
                "Gemini returned no text. "
                f"finishReason={finish_reason}, "
                f"response={res_json}"
            )

            raise Exception(
                "Gemini returned an empty response."
            )

        # ---------------------------------------------------------
        # 9. Save grounding sources if Search was explicitly used
        # ---------------------------------------------------------

        grounding_metadata = first_candidate.get(
            "groundingMetadata",
            {}
        )

        grounding_chunks = grounding_metadata.get(
            "groundingChunks",
            []
        )

        if (
            enable_search
            and grounding_chunks
            and db
            and task_id
        ):

            try:

                import core_models

                existing_ev = (
                    db.query(
                        core_models.Evidence
                    )
                    .filter(
                        core_models.Evidence.task_id == task_id
                    )
                    .all()
                )

                existing_urls = {
                    ev.evidence_data.get("url")
                    for ev in existing_ev
                    if ev.evidence_data
                }

                for idx, chunk in enumerate(
                    grounding_chunks
                ):

                    web_data = chunk.get(
                        "web",
                        {}
                    )

                    uri = web_data.get(
                        "uri"
                    )

                    title = web_data.get(
                        "title",
                        f"Source {idx + 1}"
                    )

                    if (
                        uri
                        and uri not in existing_urls
                    ):

                        ev_record = (
                            core_models.Evidence(
                                task_id=task_id,
                                source_type="web",
                                source_name=(
                                    urllib.parse.urlparse(
                                        uri
                                    ).netloc
                                    or "google.com"
                                ),
                                description=title,
                                evidence_data={
                                    "title": title,
                                    "url": uri,
                                    "domain": (
                                        urllib.parse.urlparse(
                                            uri
                                        ).netloc
                                        or "google.com"
                                    ),
                                    "snippet": title,
                                    "retrieved_at": (
                                        datetime.utcnow()
                                        .isoformat()
                                    )
                                },
                                status="passed"
                            )
                        )

                        db.add(
                            ev_record
                        )

                db.commit()

            except Exception as ev_err:

                logger.error(
                    "Failed to save Gemini grounding "
                    f"sources: {str(ev_err)}"
                )

        # ---------------------------------------------------------
        # 10. JSON validation / repair
        # ---------------------------------------------------------

        if (
            response_mime_type == "application/json"
            and not is_retry
        ):

            try:

                json.loads(
                    content_text
                )

            except Exception as json_err:

                logger.warning(
                    "Gemini returned invalid JSON for "
                    f"task {task_id}. "
                    f"Attempting repair: {json_err}"
                )

                repair_messages = list(
                    messages
                )

                repair_messages.append(
                    {
                        "role": "assistant",
                        "content": content_text
                    }
                )

                repair_messages.append(
                    {
                        "role": "user",
                        "content": (
                            "Your previous response was not valid JSON. "
                            "Return ONLY valid JSON. "
                            "Do not include markdown fences, explanations, "
                            "or any text outside the JSON object. "
                            f"Validation error: {json_err}"
                        )
                    }
                )

                return self.generate(
                    messages=repair_messages,
                    response_format=response_format,
                    task_id=task_id,
                    user_id=user_id,
                    db=db,
                    is_retry=True
                )

        # ---------------------------------------------------------
        # 11. Usage metrics
        # ---------------------------------------------------------

        usage = res_json.get(
            "usageMetadata",
            {}
        )

        prompt_tokens = usage.get(
            "promptTokenCount",
            0
        )

        completion_tokens = usage.get(
            "candidatesTokenCount",
            0
        )

        try:

            _record_gemini_cost_metrics(
                model,
                res_json,
                task_id,
                user_id,
                db
            )

        except Exception as metrics_error:

            # Metrics must NEVER make an otherwise
            # successful AI request fail.
            logger.warning(
                "Failed to record Gemini cost metrics: "
                f"{metrics_error}"
            )

        # ---------------------------------------------------------
        # 12. Return OpenAI-compatible structure
        # ---------------------------------------------------------

        return {
            "choices": [
                {
                    "message": {
                        "role": "assistant",
                        "content": content_text
                    }
                }
            ],
            "usage": {
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens
            },
            "model": model,
            "finish_reason": finish_reason,
            "grounding_metadata": (
                grounding_metadata
                if enable_search
                else {}
            )
        }

    def plan(self, user_goal: str, conversation_context: list = None, user_preferences: list = None, available_tools: list = None, security_policy: str = "", automation_policy: str = "") -> dict:
        from services.agent.tool_registry import list_tools
        tools = available_tools or list_tools()
        tools_desc = ""
        for t in tools:
            tools_desc += f"- **{t.name}**: {t.description} (Risk: {t.riskLevel}, Permissions: {t.permissions})\n"

        context_str = json.dumps(conversation_context or [])
        pref_str = json.dumps(user_preferences or [])

        system_prompt = (
            "You are the VeriNova AI Agent Task Planner. Your job is to analyze the user's goal, conversation history, user preferences, and tools to construct a structured plan with dependencies.\n\n"
            "Return ONLY valid JSON. Do not use markdown code fences. Do not include explanations before or after the JSON. The first character must be { and the final character must be }.\n\n"
            "Do NOT execute any actions. Do NOT claim the task has already been completed.\n\n"
            f"Available Tools in the Registry:\n{tools_desc}\n\n"
            "Each step must identify its tool, expected output, and list any dependencies (earlier step numbers it requires before execution).\n\n"
            "You MUST output a JSON object matching this schema:\n"
            "{\n"
            "  \"goal\": \"Concise goal of the task\",\n"
            "  \"objective\": \"Concise goal of the task\",\n"
            "  \"task_type\": \"the classification category\",\n"
            "  \"steps\": [\n"
            "    {\n"
            "      \"step_number\": 1,\n"
            "      \"description\": \"Description of what to do\",\n"
            "      \"tool\": \"Tool name from registry\",\n"
            "      \"expected_output\": \"Description of expected data return\",\n"
            "      \"dependencies\": [],\n"
            "      \"requires_confirmation\": false\n"
            "    }\n"
            "  ],\n"
            "  \"requiredTools\": [\"tool names used in steps\"],\n"
            "  \"required_tools\": [\"tool names used in steps\"],\n"
            "  \"riskLevel\": \"LOW_RISK\",\n"
            "  \"risk_level\": \"LOW_RISK\",\n"
            "  \"requiresConfirmation\": false,\n"
            "  \"requires_confirmation\": false,\n"
            "  \"successCriteria\": \"Explicit criteria to mark this task COMPLETED\"\n"
            "}"
        )

        user_prompt = (
            f"User Goal: {user_goal}\n"
            f"Conversation History: {context_str}\n"
            f"User Preferences: {pref_str}\n"
            f"Security Policy: {security_policy}\n"
            f"Automation Policy: {automation_policy}"
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        import time

        logger.info("AI PLAN: sending request to Gemini...")
        plan_start = time.time()

        try:
            response = self.generate(
                messages,
                response_format={"type": "json_object"}
            )

            logger.info(
                "AI PLAN: Gemini returned in %.2f seconds",
                time.time() - plan_start
            )
            content = response["choices"][0]["message"]["content"]
            logger.info("AI PLAN: received response content")
            logger.info("AI PLAN: content length=%d", len(content))
            plan_data = json.loads(content)
            logger.info("AI PLAN: JSON parsed successfully")
            logger.info("AI PLAN: steps=%d", len(plan_data.get("steps", [])))
        except Exception as e:
            logger.error(f"Gemini plan generation failed: {str(e)}")
            raise

        if "evidence_requirements" not in plan_data:
            plan_data["evidence_requirements"] = []
        if "verification_requirements" not in plan_data:
            plan_data["verification_requirements"] = []
        for step in plan_data.get("steps", []):
            if "action" not in step:
                step["action"] = step.get("tool", "")
        return plan_data

    def execute(self, task_description: str, step_description: str, tool_name: str, tool_description: str, tool_schema: dict, completed_steps: list, mem_context: str = "", task_id: int = None, user_id: int = None, db = None) -> dict:
        system_prompt_fill = (
            "You are the VeriNova AI Agent Tool Input Generator.\n"
            "Your job is to analyze the task, completed steps, and output the correct JSON parameters for the current step's tool.\n"
            "Return ONLY valid JSON. Do not use markdown code fences. Do not include explanations before or after the JSON. The first character must be { and the final character must be }.\n"
            "Provide a JSON object matching format: {\"args\": { ... }}"
        )
        truncated_steps = truncate_large_values(completed_steps)
        prompt = (
            f"Task Goal: {task_description}\n"
            f"{mem_context}"
            f"Step to execute: {step_description}\n"
            f"Tool name: {tool_name}\n"
            f"Tool description: {tool_description}\n"
            f"Tool input schema: {tool_schema}\n"
            f"Completed steps output: {json.dumps(truncated_steps)}\n\n"
            f"Output the JSON parameter arguments matching the tool schema."
        )

        try:
            response = self.generate([
                {"role": "system", "content": system_prompt_fill},
                {"role": "user", "content": prompt}
            ], response_format={"type": "json_object"}, task_id=task_id, user_id=user_id, db=db)
            
            args_content = json.loads(response["choices"][0]["message"]["content"])
            return args_content.get("args", {})
        except Exception as e:
            logger.error(f"Gemini tool argument generation failed: {str(e)}")
            raise


def get_active_provider() -> AIProviderInterface:
    provider = os.getenv("AI_PROVIDER", "gemini").strip().lower()
    if provider == "local":
        active = LocalProvider()
    elif provider == "openai":
        from services.openai_service import OPENAI_API_KEY
        if not OPENAI_API_KEY:
            raise OpenAIServiceError("OpenAI API key is missing. Please set the OPENAI_API_KEY environment variable.")
        active = OpenAIProvider()
    else:
        # Default is Gemini
        gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
        if not gemini_key:
            raise Exception("Gemini API key is not configured.")
        active = GeminiProvider()
        
    print("\n" + "="*50)
    print("AI PROVIDER DEBUG:")
    print(f"configured provider = {provider}")
    print(f"selected provider = {active.__class__.__name__}")
    print(f"provider class = {active.__class__}")
    print("="*50 + "\n", flush=True)
    
    return active
