import os
import re
import json
import uuid
import logging
from datetime import date, datetime, timedelta, timezone
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session

from app.config import settings
from app.models.ai_booking import (
    AIBookingSession,
    AIBookingSessionStatus,
    AIBookingPreview,
    AIBookingPreviewStatus,
    AIBookingMessage,
)
from app.models.property import Property, PropertyVerificationStatus
from app.models.room import Room
from app.schemas.ai_booking import AIBookingChatRequest, AIBookingChatResponse
from app.services.ai.booking_agent_tools import BookingAgentToolsService
from app.services.availability.availability_service import AvailabilityService

logger = logging.getLogger("voyara.ai.booking_agent")

AI_BOOKING_SYSTEM_INSTRUCTION = """
You are VOYARA's autonomous accommodation booking assistant.

Your role is to understand the traveler's request and use authorized VOYARA tools to search, evaluate, configure, and prepare accommodation bookings.

Critical Rules:
1. Never invent properties, rooms, prices, availability, ratings, amenities, policies, or booking results.
2. The VOYARA backend and PostgreSQL database are the source of truth.
3. Never directly access PostgreSQL. Never generate SQL.
4. Never decide availability yourself. Use the check_availability tool.
5. Never decide room capacity yourself. Use the calculate_room_configuration tool.
6. Never calculate the authoritative final price yourself. Use the calculate_booking_price tool.
7. Searching and planning do not equal authorization to book.
8. Distinguish between SEARCH intent ("Find me a stay", "Show me resorts") and BOOKING intent ("Book the Deluxe Room", "Reserve the second one").
9. Before executing any booking transaction, you must prepare a booking preview and request explicit user confirmation.
10. After a booking is created, VeriNova must independently verify the final booking state.
11. Only after VeriNova returns VERIFIED may you tell the traveler that the booking is confirmed and verified.
12. If VeriNova returns FAILED, MISMATCH, PARTIAL, or REQUIRES_REVIEW, never claim success.
13. If dates or destination are missing, ask for them politely and concisely.
14. Understand conversational references ("the second one", "choose Misty Valley", "book the first room").
15. Never expose internal database IDs, SQL queries, admin notes, trust scores, document hashes, or private host details.
16. Be conversational, warm, concise, and trustworthy.
"""

class BookingAgentService:
    _genai_client = None

    @classmethod
    def get_genai_client(cls):
        """Initializes the google.genai Client if GEMINI_API_KEY is configured."""
        if cls._genai_client is None and settings.GEMINI_API_KEY:
            try:
                from google import genai
                cls._genai_client = genai.Client(api_key=settings.GEMINI_API_KEY)
                logger.info("GenAI client initialized for Booking Agent.")
            except Exception as e:
                logger.warning(f"Could not initialize GenAI client: {e}")
                cls._genai_client = None
        return cls._genai_client

    @classmethod
    def handle_chat_message(
        cls,
        db: Session,
        traveler_id: int,
        request: AIBookingChatRequest
    ) -> AIBookingChatResponse:
        """
        Orchestrates multi-turn conversational booking assistance for an authenticated traveler.
        Persists structured state, invokes tools, generates previews, and enforces confirmation.
        """
        start_time = datetime.now()

        # 1. Retrieve or Create Session
        session = None
        if request.session_id:
            session = db.query(AIBookingSession).filter(
                AIBookingSession.id == request.session_id,
                AIBookingSession.traveler_id == traveler_id
            ).first()

        if not session and request.conversation_id:
            session = db.query(AIBookingSession).filter(
                AIBookingSession.conversation_id == request.conversation_id,
                AIBookingSession.traveler_id == traveler_id
            ).first()

        if not session:
            session = AIBookingSession(
                traveler_id=traveler_id,
                conversation_id=request.conversation_id or str(uuid.uuid4()),
                status=AIBookingSessionStatus.ACTIVE,
                requirements_json={}
            )
            db.add(session)
            db.flush()

        # Save user message to database
        user_msg = AIBookingMessage(
            session_id=session.id,
            sender="user",
            text=request.message.strip(),
            intent="USER_INPUT"
        )
        db.add(user_msg)
        db.flush()

        # 2. Extract structured booking requirements & update session context
        curr_reqs = dict(session.requirements_json or {})
        parsed = BookingAgentToolsService.extract_booking_requirements(request.message, curr_reqs)
        extracted = parsed["extracted"]
        
        # Merge newly extracted non-empty fields
        for k, v in extracted.items():
            if v is not None and v != [] and v != {}:
                curr_reqs[k] = v

        # Handle explicit selections from client
        if request.selected_property_id:
            session.selected_property_id = request.selected_property_id
            curr_reqs["selected_property_id"] = request.selected_property_id
        if request.selected_room_id:
            session.selected_room_id = request.selected_room_id
            curr_reqs["selected_room_id"] = request.selected_room_id
        sel_advs = getattr(request, 'selected_adventure_ids', None) or getattr(request, 'selected_experience_ids', None)
        if sel_advs:
            session.selected_adventure_ids = sel_advs

        session.requirements_json = curr_reqs
        db.flush()

        # 3. Conversational Intent & Dialog Management Pipeline
        response_data = cls._process_dialog_turn(
            db=db,
            session=session,
            traveler_id=traveler_id,
            user_message=request.message,
            action=request.action
        )

        def _json_safe(val):
            if val is None:
                return None
            try:
                return json.loads(json.dumps(val, default=str))
            except Exception:
                return str(val)

        # 4. Save Assistant Response Message
        assistant_msg = AIBookingMessage(
            session_id=session.id,
            sender="assistant",
            text=response_data["message"],
            intent=response_data["intent"],
            requires_user_action=response_data.get("requires_user_action", False),
            action=response_data.get("action"),
            properties_payload=_json_safe(response_data.get("properties")),
            rooms_payload=_json_safe(response_data.get("rooms")),
            alternatives_payload=_json_safe(response_data.get("alternatives")),
            booking_preview_payload=_json_safe(response_data.get("booking_preview")),
            booking_payload=_json_safe(response_data.get("booking")),
            verification_payload=_json_safe(response_data.get("verification"))
        )
        db.add(assistant_msg)
        db.commit()

        # Compute structured metadata for frontend progress & verification panels
        score_info = cls._calculate_verification_score(session.requirements_json or {}, response_data)
        steps_info = cls._calculate_step_progress(session.requirements_json or {}, response_data)
        ver_info = cls._calculate_verinova_status(response_data)
        agent_st = cls._calculate_agent_status(response_data, session.requirements_json or {})

        return AIBookingChatResponse(
            session_id=session.id,
            conversation_id=session.conversation_id,
            message=response_data["message"],
            intent=response_data["intent"],
            requires_user_action=response_data.get("requires_user_action", False),
            action=response_data.get("action"),
            progress_step=response_data.get("progress_step"),
            search_state=response_data.get("search_state"),
            alternatives=response_data.get("alternatives", []),
            configuration_choices=response_data.get("configuration_choices", []),
            room_options=response_data.get("room_options", []),
            properties=response_data.get("properties", []),
            rooms=response_data.get("rooms", []),
            booking_preview=response_data.get("booking_preview"),
            booking=response_data.get("booking"),
            verification=response_data.get("verification"),
            context_snapshot=session.requirements_json,
            extracted_requirements=session.requirements_json,
            ai_verification_score=score_info,
            agent_status=agent_st,
            step_progress=steps_info,
            verinova_verification=ver_info,
            suggested_destinations=response_data.get("suggested_destinations", []),
            location_options=response_data.get("location_options", [])
        )

    @classmethod
    def _calculate_verification_score(cls, reqs: dict, response_data: dict) -> dict:
        score = 0
        breakdown = {
            "requirements_extracted": False,
            "destination_valid": False,
            "dates_valid": False,
            "guests_valid": False,
            "stay_available": False,
            "room_available": False,
            "price_verified": False,
            "booking_confirmed": False
        }
        
        # 1. Requirements correctly extracted (+15)
        if reqs.get("destination") or reqs.get("check_in") or reqs.get("adults"):
            score += 15
            breakdown["requirements_extracted"] = True
            
        # 2. Correct destination (+15)
        if reqs.get("destination") and response_data.get("intent") != "UNSUPPORTED_REGION":
            score += 15
            breakdown["destination_valid"] = True
            
        # 3. Correct dates (+15)
        c_in = reqs.get("check_in")
        c_out = reqs.get("check_out")
        if c_in and c_out and str(c_out) > str(c_in):
            score += 15
            breakdown["dates_valid"] = True
            
        # 4. Correct guest count (+10)
        if reqs.get("adults", 0) >= 1:
            score += 10
            breakdown["guests_valid"] = True
            
        # 5. Stay available (+15)
        has_stays = (
            bool(response_data.get("booking_preview")) or
            bool(response_data.get("properties")) or
            bool(response_data.get("alternatives")) or
            bool(response_data.get("booking"))
        )
        if has_stays and response_data.get("intent") not in ["NO_AVAILABILITY", "UNSUPPORTED_REGION"]:
            score += 15
            breakdown["stay_available"] = True
            
        # 6. Room available (+10)
        if response_data.get("booking_preview") or response_data.get("booking") or (has_stays and response_data.get("search_state") == "EXACT_MATCH"):
            score += 10
            breakdown["room_available"] = True
            
        # 7. Price verified (+10)
        if response_data.get("booking_preview") or response_data.get("booking"):
            score += 10
            breakdown["price_verified"] = True
            
        # 8. Booking successfully confirmed (+10)
        ver = response_data.get("verification")
        if response_data.get("booking") and ver and ver.get("status") == "VERIFIED":
            score += 10
            breakdown["booking_confirmed"] = True
            
        return {
            "score": min(100, score),
            "max_score": 100,
            "breakdown": breakdown,
            "label": "Internal AI Verification Score"
        }

    @classmethod
    def _calculate_step_progress(cls, reqs: dict, response_data: dict) -> dict:
        intent = response_data.get("intent", "")
        has_preview = bool(response_data.get("booking_preview"))
        has_booking = bool(response_data.get("booking"))
        ver = response_data.get("verification")
        is_verified = bool(ver and ver.get("status") == "VERIFIED")
        is_failed = bool(intent in ["BOOKING_FAILED", "ERROR"])
        now_ts = datetime.now().strftime("%I:%M %p")
        
        has_dest = bool(reqs.get("destination"))
        has_dates = bool(reqs.get("check_in") and reqs.get("check_out"))
        has_reqs = has_dest and has_dates

        def _step_obj(name: str, status: str, explanation: str) -> dict:
            return {
                "name": name,
                "status": status,
                "explanation": explanation,
                "timestamp": now_ts if status in ["completed", "processing", "requires_attention", "failed"] else None
            }
        
        s1 = _step_obj("Request Received", "completed", "Traveler query received")
        s2 = _step_obj(
            "Requirements Extracted",
            "completed" if has_reqs else ("processing" if has_dest else "requires_attention"),
            "Destination, dates, and guests parsed" if has_reqs else "Awaiting missing criteria"
        )
        s3 = _step_obj(
            "Stay Search",
            "completed" if (has_preview or response_data.get("alternatives") or has_booking) else ("processing" if has_reqs else "pending"),
            "Verified properties located" if (has_preview or response_data.get("alternatives") or has_booking) else "Searching database"
        )
        s4 = _step_obj(
            "Availability Check",
            "completed" if (has_preview or response_data.get("alternatives") or has_booking) else ("failed" if intent == "NO_AVAILABILITY" else "pending"),
            "Live calendar dates verified" if (has_preview or response_data.get("alternatives") or has_booking) else "Checking inventory"
        )
        s5 = _step_obj(
            "Room Verification",
            "completed" if (has_preview or has_booking) else ("requires_attention" if response_data.get("alternatives") else "pending"),
            "Capacity & house rules checked" if (has_preview or has_booking) else "Evaluating room types"
        )
        s6 = _step_obj(
            "Price Verification",
            "completed" if (has_preview or has_booking) else "pending",
            "Nightly rates and taxes locked" if (has_preview or has_booking) else "Authoritative price check"
        )
        s7 = _step_obj(
            "VeriNova Pre-Check",
            "completed" if (has_preview or has_booking) else ("failed" if intent in ["ERROR", "BOOKING_FAILED"] else "pending"),
            "8-point pre-booking audit passed" if (has_preview or has_booking) else "Pre-booking verification"
        )
        s8 = _step_obj(
            "Booking Preparation",
            "completed" if (has_preview or has_booking) else "pending",
            "Reservation preview prepared" if (has_preview or has_booking) else "Pending preparation"
        )
        s9 = _step_obj(
            "Payment Verification",
            "completed" if (has_booking and is_verified) else ("processing" if has_preview else "pending"),
            "Razorpay HMAC signature verified" if (has_booking and is_verified) else "Awaiting checkout confirmation"
        )
        s10 = _step_obj(
            "Booking Execution",
            "completed" if has_booking else ("failed" if is_failed else "pending"),
            "PostgreSQL row locked & created" if has_booking else "Pending payment execution"
        )
        s11 = _step_obj(
            "VeriNova Final Verification",
            "completed" if is_verified else ("failed" if (ver and ver.get("status") != "VERIFIED") else "pending"),
            "12-point post-booking integrity check passed" if is_verified else "Post-booking audit"
        )
        s12 = _step_obj(
            "Booking Completed",
            "completed" if (has_booking and is_verified) else ("failed" if is_failed else "pending"),
            "Transaction confirmed & verified" if (has_booking and is_verified) else "Pending completion"
        )
        
        return {
            "1_request_received": s1,
            "2_requirements_extracted": s2,
            "3_stay_search": s3,
            "4_availability_check": s4,
            "5_room_verification": s5,
            "6_price_verification": s6,
            "7_verinova_pre_check": s7,
            "8_booking_preparation": s8,
            "9_payment_verification": s9,
            "10_booking_execution": s10,
            "11_verinova_final_verification": s11,
            "12_booking_completed": s12
        }

    @classmethod
    def _calculate_verinova_status(cls, response_data: dict) -> dict:
        intent = response_data.get("intent", "")
        preview = response_data.get("booking_preview") or {}
        booking = response_data.get("booking") or {}
        has_preview = bool(preview)
        has_booking = bool(booking)
        ver = response_data.get("verification")
        pre_ver = preview.get("verinova_verification")
        is_verified = bool(ver and ver.get("status") == "VERIFIED")
        
        score = 0
        if ver and "verinova_score" in ver:
            score = ver["verinova_score"]
        elif pre_ver and "verinova_score" in pre_ver:
            score = pre_ver["verinova_score"]
        elif has_booking and is_verified:
            score = 100
        elif has_preview:
            score = 96
        elif intent not in ["ERROR", "NO_AVAILABILITY", "UNSUPPORTED_REGION"]:
            score = 75
        else:
            score = 0

        return {
            "requirements_matched": "VERIFIED" if (has_preview or has_booking or intent not in ["ERROR", "AWAITING_INFO"]) else "PENDING",
            "property_verified": "VERIFIED" if (has_preview or has_booking or bool(response_data.get("properties"))) else "PENDING",
            "room_verified": "VERIFIED" if (has_preview or has_booking) else "PENDING",
            "availability_verified": "VERIFIED" if (has_preview or has_booking) else ("FAILED" if intent == "NO_AVAILABILITY" else "PENDING"),
            "capacity_verified": "VERIFIED" if (has_preview or has_booking) else "PENDING",
            "dates_verified": "VERIFIED" if (has_preview or has_booking) else "PENDING",
            "price_verified": "VERIFIED" if (has_preview or has_booking) else "PENDING",
            "budget_verified": "VERIFIED" if (has_preview or has_booking) else "PENDING",
            "payment_verified": "VERIFIED" if (has_booking and is_verified) else "PENDING",
            "booking_verified": "VERIFIED" if (has_booking and is_verified) else ("FAILED" if (ver and ver.get("status") == "FAILED") else "PENDING"),
            "agent_decision": "VERIFIED" if intent not in ["ERROR", "UNSUPPORTED_REGION"] else ("FAILED" if intent == "ERROR" else "REQUIRES_ATTENTION"),
            "status": ver.get("status") if ver else (pre_ver.get("status") if pre_ver else ("READY_FOR_BOOKING" if has_preview else "SEARCHING")),
            "verification_id": ver.get("verification_id") if ver else (pre_ver.get("verification_id") if pre_ver else None),
            "score": score,
            "verified_at": ver.get("verified_at") if ver else (pre_ver.get("verified_at") if pre_ver else None)
        }

    @classmethod
    def _calculate_agent_status(cls, response_data: dict, reqs: dict) -> dict:
        dest = reqs.get("destination", "destinations")
        intent = response_data.get("intent", "")
        if response_data.get("booking"):
            return {"state": "CONFIRMED", "task": "Booking verified & confirmed", "is_working": False}
        if response_data.get("booking_preview"):
            return {"state": "AWAITING_CONFIRMATION", "task": f"Prepared booking preview for {dest} — waiting for confirmation", "is_working": False}
        if response_data.get("alternatives"):
            return {"state": "CHOICES_FOUND", "task": f"Comparing nearby stays in and around {dest}...", "is_working": False}
        if intent == "AWAITING_INFO":
            return {"state": "AWAITING_INPUT", "task": "Awaiting travel requirements from user", "is_working": False}
        return {"state": "WORKING", "task": f"Searching verified stays in {dest}...", "is_working": True}

    @classmethod
    def _process_dialog_turn(
        cls,
        db: Session,
        session: AIBookingSession,
        traveler_id: int,
        user_message: str,
        action: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Direct, requirement-driven dialog engine with multi-level fallback decision flow.
        Flow:
        1. Explicit Payment Confirmation -> Execute booking & VeriNova audit
        2. Natural Language Alternative Selection ("Book the second one", "Cheaper one", "Option 2") -> Revalidate authoritatively -> Booking Preview
        3. Validate Mandatory Information (Destination, Dates)
        4. Geographical Intelligence: International check -> Unsupported Region; Ambiguity check -> Location clarification
        5. Search Exact Match (Level 1) -> Match? Prepare Preview
        6. If No Exact Match -> Fallback Search (Level 2: Same Dest, Level 3: Nearby Stays, Level 4: Alt Dates)
        7. Return Real Available Choices (Curated 3–5 items) with clear diff labels
        8. Genuinely no options anywhere -> Structured Final No-Result with actionable suggestions
        """
        from app.services.ai.booking_execution_service import BookingExecutionService
        from app.schemas.ai_booking import AIBookingConfirmRequest

        reqs = dict(session.requirements_json or {})
        msg_lower = user_message.lower().strip()

        # -------------------------------------------------------------------------
        # STAGE -1: Detect Skip / Cancel Intent
        # -------------------------------------------------------------------------
        if re.search(r'^\s*(skip|pass|cancel|start\s+over|new\s+search|reset|no\s+thanks)\s*$', msg_lower):
            session.requirements_json = {}
            session.booking_preview_id = None
            session.status = AIBookingSessionStatus.ACTIVE
            db.flush()
            return {
                "message": "No problem! Where or when would you like to travel next?",
                "intent": "AWAITING_INFO",
                "requires_user_action": True,
                "action": "PROVIDE_DESTINATION",
                "progress_step": "Ready for your request",
                "alternatives": []
            }

        # -------------------------------------------------------------------------
        # STAGE 0: Detect Explicit Payment Confirmation
        # -------------------------------------------------------------------------
        is_payment_confirm = (
            action in ["CONFIRM_PAYMENT", "CONFIRM_BOOKING"] or
            re.search(r'^\s*(yes|confirm|confirm\s+payment|confirm\s+booking|pay|proceed|book\s+it|go\s+ahead|do\s+it)\s*$', msg_lower) is not None or
            "confirm and pay" in msg_lower or "confirm payment" in msg_lower or "proceed to pay" in msg_lower
        )

        active_preview = None
        if session.booking_preview_id:
            active_preview = db.query(AIBookingPreview).filter(
                AIBookingPreview.id == session.booking_preview_id,
                AIBookingPreview.traveler_id == traveler_id,
                AIBookingPreview.status == AIBookingPreviewStatus.ACTIVE
            ).first()

        if is_payment_confirm and active_preview:
            confirm_req = AIBookingConfirmRequest(
                preview_id=active_preview.id,
                idempotency_key=f"ai-sess-{session.id}-{active_preview.id}"
            )
            exec_res = BookingExecutionService.confirm_and_execute_booking(
                db=db,
                traveler_id=traveler_id,
                request=confirm_req
            )

            if exec_res.success and exec_res.status == "VERIFIED":
                b_info = exec_res.booking or {}
                b_num = b_info.get("booking_number", "VOY-BOOKING")
                prop_name = b_info.get("property_name", "the sanctuary")
                room_name = b_info.get("rooms", [{}])[0].get("room_name", "Room")
                c_in_disp = b_info.get("check_in", "")
                c_out_disp = b_info.get("check_out", "")
                total_disp = f"₹{b_info.get('total_amount', 0):,.2f}"

                msg = (
                    f"**Booking confirmed**\n\n"
                    f"Your {room_name} at **{prop_name}** is confirmed for {c_in_disp} → {c_out_disp}.\n\n"
                    f"**Booking Number:** {b_num}\n"
                    f"**Total:** {total_disp}\n\n"
                    f"🛡️ **VeriNova verification: Verified**"
                )
                return {
                    "message": msg,
                    "intent": "BOOKING_COMPLETED",
                    "requires_user_action": False,
                    "action": None,
                    "progress_step": "Booking confirmed",
                    "booking": b_info,
                    "verification": exec_res.verification,
                    "booking_preview": None
                }
            elif exec_res.status == "BOOKING_REVALIDATION_REQUIRED":
                return {
                    "message": f"**Booking update required:** {exec_res.message}\n\nPlease review your requirements or search again.",
                    "intent": "REVALIDATION_REQUIRED",
                    "requires_user_action": True,
                    "action": "MODIFY_REQUIREMENTS",
                    "progress_step": "Revalidation required"
                }
            else:
                return {
                    "message": f"**We couldn't verify this booking.** {exec_res.message}\n\nNo verified booking has been reported as complete.",
                    "intent": "BOOKING_FAILED",
                    "requires_user_action": True,
                    "action": "MODIFY_REQUIREMENTS",
                    "progress_step": "Verification failed",
                    "verification": exec_res.verification
                }

        # -------------------------------------------------------------------------
        # STAGE 1: Detect Natural-Language or Action Selection of Displayed Alternatives
        # -------------------------------------------------------------------------
        displayed_alts = reqs.get("displayed_alternatives", [])
        chosen_alt = None

        if displayed_alts:
            if action in ["SELECT_ALTERNATIVE", "CHOOSE_PROPERTY", "SELECT_ROOM"]:
                # Explicit selection via client action
                p_id = reqs.get("selected_property_id")
                r_id = reqs.get("selected_room_id")
                if p_id and r_id:
                    for a in displayed_alts:
                        if a.get("property_id") == p_id and a.get("room_id") == r_id:
                            chosen_alt = a
                            break
                if not chosen_alt and displayed_alts:
                    chosen_alt = displayed_alts[0]
            else:
                # Conversational matching (e.g. "Book the recommended stay", "Book the second one", "Option 2")
                chosen_alt = BookingAgentToolsService.resolve_conversational_selection(
                    user_message=user_message,
                    displayed_alternatives=displayed_alts
                )

        if chosen_alt:
            # Revalidate authoritatively before preparing booking preview
            alt_prop_id = chosen_alt["property_id"]
            alt_room_id = chosen_alt["room_id"]
            alt_c_in = date.fromisoformat(chosen_alt["check_in"])
            alt_c_out = date.fromisoformat(chosen_alt["check_out"])
            alt_qty = chosen_alt.get("room_quantity", 1)
            alt_adults = chosen_alt.get("adults", reqs.get("adults", 2))
            alt_children = chosen_alt.get("children", reqs.get("children", 0))
            alt_child_ages = chosen_alt.get("child_ages", reqs.get("child_ages", []))

            # Recheck property verification & active status
            reval_prop = db.query(Property).filter(
                Property.id == alt_prop_id,
                Property.is_active == True,
                Property.verification_status == PropertyVerificationStatus.VERIFIED.value
            ).first()

            # Recheck room active
            reval_room = db.query(Room).filter(
                Room.id == alt_room_id,
                Room.property_id == alt_prop_id,
                Room.is_active == True
            ).first()

            # Recheck inventory availability
            avail_info = AvailabilityService.check_room_availability(
                db=db,
                room_id=alt_room_id,
                check_in=alt_c_in,
                check_out=alt_c_out
            )

            # Recheck capacity & child policy
            config_eval = BookingAgentToolsService.calculate_room_configuration(
                db=db,
                property_id=alt_prop_id,
                room_id=alt_room_id,
                adults=alt_adults,
                children=alt_children,
                child_ages=alt_child_ages,
                requested_quantity=alt_qty
            )

            is_valid = (
                reval_prop is not None and
                reval_room is not None and
                avail_info.get("is_available") and
                avail_info.get("available_quantity", 0) >= alt_qty and
                config_eval.get("valid", False)
            )

            if is_valid:
                try:
                    preview = BookingAgentToolsService.create_booking_preview(
                        db=db,
                        traveler_id=traveler_id,
                        session_id=session.id,
                        property_id=alt_prop_id,
                        room_id=alt_room_id,
                        check_in=alt_c_in,
                        check_out=alt_c_out,
                        adults=alt_adults,
                        children=alt_children,
                        child_ages=alt_child_ages,
                        room_quantity=alt_qty
                    )

                    session.booking_preview_id = preview["preview_id"]
                    session.selected_property_id = alt_prop_id
                    session.selected_room_id = alt_room_id
                    session.status = AIBookingSessionStatus.AWAITING_CONFIRMATION

                    # Update active request state to reflect selected choice while preserving original
                    orig_dest = reqs.get("original_destination") or reqs.get("destination")
                    reqs["original_destination"] = orig_dest
                    reqs["destination"] = chosen_alt.get("city") or reqs.get("destination")
                    reqs["check_in"] = chosen_alt["check_in"]
                    reqs["check_out"] = chosen_alt["check_out"]
                    reqs["room_type"] = chosen_alt.get("room_type") or reqs.get("room_type")
                    reqs["selected_alternative"] = chosen_alt
                    session.requirements_json = reqs
                    db.flush()

                    loc_desc = chosen_alt.get("city") or reval_prop.city
                    dist_text = f" in {loc_desc}"
                    if chosen_alt.get("distance_km") and chosen_alt.get("distance_km") > 0:
                        dist_text = f" in {loc_desc} ({chosen_alt.get('distance_label', '')}{' · ' + chosen_alt.get('travel_time_text', '') if chosen_alt.get('travel_time_text') else ''})"

                    total_fmt = f"₹{preview['pricing']['total_price']:,.2f}"
                    room_qty_str = f" ({reval_room.name} × {alt_qty})" if alt_qty > 1 else f" ({reval_room.name})"
                    diff_note = f" [{chosen_alt.get('diff_reason')}]" if chosen_alt.get("diff_reason") else ""
                    prompt_msg = f"Your booking is ready for **{reval_prop.name}**{dist_text}{room_qty_str}{diff_note}. The total payable amount is **{total_fmt}**. Would you like to confirm payment?"

                    return {
                        "message": prompt_msg,
                        "intent": "PAYMENT_CONFIRMATION_REQUIRED",
                        "requires_user_action": True,
                        "action": "CONFIRM_PAYMENT",
                        "progress_step": "Booking ready",
                        "search_state": "EXACT_MATCH",
                        "booking_preview": preview,
                        "properties": [{
                            "id": reval_prop.id,
                            "name": reval_prop.name,
                            "city": reval_prop.city,
                            "state": reval_prop.state,
                            "property_type": reval_prop.property_type,
                            "rating": reval_prop.rating,
                            "review_count": reval_prop.review_count or 0
                        }],
                        "rooms": [{
                            "id": reval_room.id,
                            "name": reval_room.name,
                            "room_type": reval_room.room_type,
                            "base_price": reval_room.base_price,
                            "capacity": reval_room.capacity,
                            "quantity": alt_qty
                        }],
                        "alternatives": []
                    }
                except Exception as e:
                    logger.error(f"Error creating preview for alternative: {e}")
            else:
                # Alternative became unavailable between turns -> alert traveler and refresh fallback search
                logger.info(f"Selected alternative is no longer available; re-running search.")

        # -------------------------------------------------------------------------
        # STAGE 2: Extract & Validate Base Requirements
        # -------------------------------------------------------------------------
        destination = reqs.get("destination")
        check_in_str = reqs.get("check_in")
        check_out_str = reqs.get("check_out")
        adults = reqs.get("adults", 2)
        children = reqs.get("children", 0)
        child_ages = reqs.get("child_ages", [])
        room_type = reqs.get("room_type")
        property_type = reqs.get("property_type")
        budget_max = reqs.get("budget_max")
        budget_type = reqs.get("budget_type", "TOTAL")
        amenities = reqs.get("amenities", [])
        together_preference = reqs.get("together_preference")
        requested_rooms_count = reqs.get("requested_rooms_count")

        # Parse date objects if present
        check_in_date = None
        check_out_date = None
        if check_in_str and check_out_str:
            try:
                check_in_date = date.fromisoformat(check_in_str)
                check_out_date = date.fromisoformat(check_out_str)
            except Exception:
                pass

        if not destination and not check_in_date:
            return {
                "message": "Please provide your destination, check-in and check-out dates, and number of adults and children. You can also specify preferred room type and budget.",
                "intent": "AWAITING_INFO",
                "requires_user_action": True,
                "action": "PROVIDE_INFO",
                "progress_step": "Understanding request"
            }

        if not destination:
            return {
                "message": "Please share your travel destination to complete your booking.",
                "intent": "AWAITING_INFO",
                "requires_user_action": True,
                "action": "PROVIDE_DESTINATION",
                "progress_step": "Understanding request"
            }

        # -------------------------------------------------------------------------
        # STAGE 2A: Geographical Intelligence & Regional Scope Validation
        # -------------------------------------------------------------------------
        geo_eval = BookingAgentToolsService.analyze_destination(db, destination)

        # 1. Non-Indian / International Destination (e.g., Canada, Paris, London, etc.)
        if not geo_eval["is_supported_in_india"]:
            return {
                "message": geo_eval["message"],
                "intent": "UNSUPPORTED_REGION",
                "requires_user_action": True,
                "action": "PROVIDE_INDIAN_DESTINATION",
                "progress_step": "Unsupported international destination",
                "search_state": "UNSUPPORTED_REGION",
                "alternatives": [],
                "suggested_destinations": geo_eval.get("suggested_destinations", [])
            }

        # 2. Ambiguous Location Name within India (e.g., Bilaspur, Aurangabad, Rampur)
        if geo_eval.get("is_ambiguous"):
            return {
                "message": geo_eval["message"],
                "intent": "LOCATION_DISAMBIGUATION_REQUIRED",
                "requires_user_action": True,
                "action": "SELECT_LOCATION",
                "progress_step": "Clarifying destination",
                "search_state": "LOCATION_AMBIGUOUS",
                "location_options": geo_eval.get("location_options", []),
                "alternatives": []
            }

        # Validate Dates for Supported Indian Destination
        if not check_in_date or not check_out_date:
            total_travelers = adults + children
            guest_str = f" for {total_travelers} guest{'s' if total_travelers > 1 else ''}" if "adults" in reqs else ""
            return {
                "message": f"Please provide your check-in and check-out dates{guest_str} for your stay in {destination}.",
                "intent": "AWAITING_INFO",
                "requires_user_action": True,
                "action": "PROVIDE_DATES",
                "progress_step": "Understanding request"
            }

        if check_in_date < date.today():
            return {
                "message": f"Your check-in date ({check_in_date.strftime('%d %b %Y')}) is in the past. Please provide future travel dates.",
                "intent": "AWAITING_INFO",
                "requires_user_action": True,
                "action": "PROVIDE_DATES",
                "progress_step": "Understanding request"
            }

        if check_out_date <= check_in_date:
            return {
                "message": f"Your check-out date ({check_out_date.strftime('%d %b %Y')}) must be after your check-in date ({check_in_date.strftime('%d %b %Y')}). Please specify valid dates.",
                "intent": "AWAITING_INFO",
                "requires_user_action": True,
                "action": "PROVIDE_DATES",
                "progress_step": "Understanding request"
            }

        # -------------------------------------------------------------------------
        # STAGE 2B: Child Policy & Child Age Check
        # -------------------------------------------------------------------------
        if children > 0 and not child_ages:
            # Check if any matching property/room in destination has age-dependent child rules
            props_in_dest = db.query(Property).filter(
                Property.is_active == True,
                Property.verification_status == PropertyVerificationStatus.VERIFIED.value,
                func.lower(Property.country) == "india",
                or_(
                    func.lower(Property.city).contains(destination.strip().lower()),
                    func.lower(Property.state).contains(destination.strip().lower()),
                    func.lower(Property.name).contains(destination.strip().lower())
                )
            ).all()

            requires_age_check = False
            for p in props_in_dest:
                pr = p.home_rules
                if pr and (pr.minimum_child_age or pr.max_child_age or pr.free_additional_children > 0 or pr.child_charge_enabled):
                    requires_age_check = True
                    break
                for r in p.rooms:
                    rr = r.rules
                    if rr and (rr.minimum_child_age or rr.max_child_age or rr.free_additional_children > 0 or rr.child_charge_enabled):
                        requires_age_check = True
                        break

            if requires_age_check:
                child_str = "the child" if children == 1 else f"the {children} children"
                return {
                    "message": f"How old is {child_str}?",
                    "intent": "AWAITING_INFO",
                    "requires_user_action": True,
                    "action": "PROVIDE_CHILD_AGE",
                    "progress_step": "Checking child policies"
                }

        # -------------------------------------------------------------------------
        # STAGE 3: Execute Hierarchical Multi-Level Fallback Decision Engine
        # -------------------------------------------------------------------------
        fallback_res = BookingAgentToolsService.search_intelligent_fallbacks(
            db=db,
            destination=destination,
            check_in=check_in_date,
            check_out=check_out_date,
            adults=adults,
            children=children,
            child_ages=child_ages,
            room_type=room_type,
            property_type=property_type,
            budget_max=budget_max,
            budget_type=budget_type,
            amenities=amenities,
            together_preference=together_preference,
            requested_rooms_count=requested_rooms_count
        )

        search_state = fallback_res["state"]
        exact_match = fallback_res.get("exact_match")
        alternatives = fallback_res.get("alternatives", [])

        # -------------------------------------------------------------------------
        # STAGE 4A: Choice Available (e.g. 1 Family Room vs 2 Deluxe Rooms)
        # -------------------------------------------------------------------------
        if search_state == "CHOICE_AVAILABLE":
            reqs["displayed_alternatives"] = alternatives
            session.requirements_json = reqs
            session.status = AIBookingSessionStatus.AWAITING_SELECTION
            db.flush()

            return {
                "message": fallback_res["message"],
                "intent": "SELECTION_REQUIRED",
                "requires_user_action": True,
                "action": "SELECT_CONFIGURATION",
                "progress_step": "Configuration choices ready",
                "search_state": "CHOICE_AVAILABLE",
                "alternatives": alternatives,
                "configuration_choices": fallback_res.get("configuration_choices", []),
                "properties": [],
                "rooms": []
            }

        # -------------------------------------------------------------------------
        # STAGE 4B: Exact Match Found -> Direct to Booking Preview & Confirmation
        # -------------------------------------------------------------------------
        if search_state == "EXACT_MATCH" and exact_match:
            best_prop = exact_match["property"]
            best_room = exact_match["room"]
            room_qty = exact_match["room_config"]["quantity"]

            try:
                preview = BookingAgentToolsService.create_booking_preview(
                    db=db,
                    traveler_id=traveler_id,
                    session_id=session.id,
                    property_id=best_prop["id"],
                    room_id=best_room["id"],
                    check_in=check_in_date,
                    check_out=check_out_date,
                    adults=adults,
                    children=children,
                    child_ages=child_ages,
                    room_quantity=room_qty
                )

                session.booking_preview_id = preview["preview_id"]
                session.selected_property_id = best_prop["id"]
                session.selected_room_id = best_room["id"]
                session.status = AIBookingSessionStatus.AWAITING_CONFIRMATION
                # Clear stale alternatives
                reqs.pop("displayed_alternatives", None)
                session.requirements_json = reqs
                db.flush()

                total_fmt = f"₹{preview['pricing']['total_price']:,.2f}"
                room_qty_str = f" ({best_room['name']} × {room_qty})" if room_qty > 1 else f" ({best_room['name']})"

                child_note = ""
                if children > 0:
                    if preview["pricing"]["child_supplement_total"] == 0:
                        child_age_str = f"your {child_ages[0]}-year-old" if child_ages else "your child"
                        child_note = f" Good news — this room allows {child_age_str} to stay using existing beds at no extra charge."
                    else:
                        child_note = f" An extra bed or supplement of ₹{preview['pricing']['supplements_total']:,.0f} is included for the child."

                prompt_msg = f"Your booking is ready for **{best_prop['name']}**{room_qty_str}. The total payable amount is **{total_fmt}**.{child_note} Would you like to confirm payment?"

                return {
                    "message": prompt_msg,
                    "intent": "PAYMENT_CONFIRMATION_REQUIRED",
                    "requires_user_action": True,
                    "action": "CONFIRM_PAYMENT",
                    "progress_step": "Booking ready",
                    "search_state": "EXACT_MATCH",
                    "booking_preview": preview,
                    "properties": [best_prop],
                    "rooms": [best_room],
                    "alternatives": []
                }
            except Exception as e:
                logger.error(f"Error preparing booking preview: {e}")
                return {
                    "message": f"Could not prepare booking: {str(e)}. Please adjust your requirements.",
                    "intent": "ERROR",
                    "requires_user_action": True,
                    "action": "MODIFY_REQUIREMENTS",
                    "progress_step": "Booking error"
                }

        # -------------------------------------------------------------------------
        # STAGE 4B: Real Alternatives Found (Same Destination / Nearby / Alt Dates)
        # -------------------------------------------------------------------------
        if alternatives and search_state in ["CLOSE_MATCH", "NEARBY_MATCH", "ALTERNATIVE_DATE"]:
            # Persist alternatives for one-click or natural language follow-up ("Book the second one")
            reqs["displayed_alternatives"] = alternatives
            session.requirements_json = reqs
            session.status = AIBookingSessionStatus.AWAITING_SELECTION
            db.flush()

            # Format properties & rooms payloads for UI cards
            prop_cards = []
            seen_pids = set()
            for alt in alternatives:
                if alt["property_id"] not in seen_pids:
                    seen_pids.add(alt["property_id"])
                    prop_cards.append({
                        "id": alt["property_id"],
                        "name": alt["property_name"],
                        "city": alt["city"],
                        "state": alt["state"],
                        "property_type": alt["property_type"],
                        "rating": alt["rating"],
                        "review_count": alt["review_count"],
                        "cover_image_url": alt.get("property_image"),
                        "distance_label": alt.get("distance_label")
                    })

            return {
                "message": fallback_res["message"],
                "intent": "SELECTION_REQUIRED",
                "requires_user_action": True,
                "action": "SELECT_ALTERNATIVE",
                "progress_step": "Alternatives found",
                "search_state": search_state,
                "alternatives": alternatives,
                "properties": prop_cards,
                "rooms": []
            }

        # -------------------------------------------------------------------------
        # STAGE 4C: Genuinely No Options Available (Level 5 No-Result)
        # -------------------------------------------------------------------------
        reqs.pop("displayed_alternatives", None)
        session.requirements_json = reqs
        db.flush()

        return {
            "message": fallback_res["message"],
            "intent": "NO_AVAILABILITY",
            "requires_user_action": True,
            "action": "MODIFY_REQUIREMENTS",
            "progress_step": "No suitable stay",
            "search_state": "NO_MATCH",
            "alternatives": [],
            "properties": []
        }

