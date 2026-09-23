import re
import uuid
from datetime import date, datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session

from app.models.trip_chat_session import TripPlannerChatSession, TripPlannerChatMessage
from app.models.property import Property
from app.models.room import Room
from app.schemas.trip_planner import (
    TripPlannerRequest,
    TripPlanResponse,
    TripChatRequest,
    TripChatResponse,
    TripChatContext,
    BudgetAnalysis,
    SelectStayRequest
)
from app.services.ai.trip_planner import TripPlannerService
from app.services.ai.trip_planner_validation import TripPlannerValidationService
from app.services.ai.trip_pricing import TripPricingService
from app.services.ai.destination_places import DestinationPlacesService

KNOWN_DESTINATIONS = [
    "Munnar",
    "Wayanad",
    "Goa",
    "Ooty",
    "Jaipur",
    "Kochi",
    "Manali",
    "Shimla",
    "Coorg",
    "Udaipur",
    "Pondicherry",
    "Alleppey",
    "Varkala",
    "Kodaikanal",
    "Rishikesh",
    "Agra",
    "Varanasi",
    "Hampi",
    "Darjeeling",
    "Gangtok"
]

class TripPlannerChatService:
    @classmethod
    def handle_chat_message(
        cls,
        db: Session,
        request: TripChatRequest,
        user_id: Optional[int] = None
    ) -> TripChatResponse:
        """
        Processes a natural language message from the traveler, updates conversational context,
        manages chat session history, handles stay & room selection, and generates/updates a 
        real PostgreSQL itinerary plan with accommodation comparison options.
        """
        msg = request.message.strip()
        msg_lower = msg.lower()
        ctx = request.current_context or TripChatContext()
        current_plan = request.current_plan
        session_id = request.session_id or request.conversation_id

        # 0. Manage Persistent Session
        session_obj = None
        if session_id:
            session_obj = db.query(TripPlannerChatSession).filter(TripPlannerChatSession.id == session_id).first()

        if not session_obj and user_id:
            # Create session for user
            session_obj = TripPlannerChatSession(
                id=str(uuid.uuid4()),
                user_id=user_id,
                title=f"{ctx.destination or 'New'} Journey",
                destination=ctx.destination,
                current_context=ctx.model_dump()
            )
            db.add(session_obj)
            db.commit()
            db.refresh(session_obj)
            session_id = session_obj.id

        # Record user message
        if session_obj:
            user_msg_record = TripPlannerChatMessage(
                session_id=session_obj.id,
                sender="user",
                text=msg
            )
            db.add(user_msg_record)
            db.commit()

        # 1. Handle Explicit Conversational Actions if a plan already exists
        if current_plan:
            # Action: Booking
            if any(k in msg_lower for k in ["book this", "book stay", "proceed to book", "book now", "i want to book"]):
                stay = current_plan.stay
                exp = current_plan.experiences[0] if current_plan.experiences else None
                booking_payload = {
                    "property_id": stay.property_id if stay else None,
                    "property_name": stay.property_name if stay else None,
                    "property_type": stay.property_type if stay else None,
                    "property_city": stay.city if stay else None,
                    "room_id": stay.room_id if stay else None,
                    "room_name": stay.room_name if stay else None,
                    "room_price": stay.price_per_night if stay else 0.0,
                    "room_quantity": 1,
                    "check_in": current_plan.trip.get("start_date"),
                    "check_out": current_plan.trip.get("end_date"),
                    "nights": stay.total_nights if stay else 1,
                    "guests": current_plan.trip.get("adults", 2) + current_plan.trip.get("children", 0),
                    "adults": current_plan.trip.get("adults", 2),
                    "children": current_plan.trip.get("children", 0),
                    "child_ages": current_plan.trip.get("child_ages", []),
                    "room_subtotal": stay.room_subtotal if stay else 0.0,
                    "children_subtotal": stay.child_charge_subtotal if stay else 0.0,
                    "total_amount": current_plan.pricing_summary.known_cost,
                }
                if exp:
                    booking_payload["experience_id"] = exp.experience_id
                    booking_payload["experience_title"] = exp.title
                    booking_payload["experience_price"] = exp.price
                    booking_payload["experience_pricing_model"] = exp.pricing_model
                    booking_payload["experience_participants"] = exp.participants
                    booking_payload["experience_subtotal"] = exp.total_experience_cost

                response = TripChatResponse(
                    session_id=session_id,
                    reply=f"I'm transferring you to our secure checkout for {stay.property_name if stay else 'your sanctuary'}. All dates, guests, and pricing are verified.",
                    requires_input=False,
                    input_type="NONE",
                    trip_context=ctx,
                    plan_status=current_plan.pricing_summary.budget_status,
                    trip_plan=current_plan,
                    action_type="PROCEED_TO_BOOKING",
                    booking_payload=booking_payload,
                    booking_handoff=booking_payload,
                    suggested_actions=["View property details", "Back to chat"]
                )
                cls._persist_assistant_message(db, session_obj, response)
                return response

            # Action: Save Trip
            if any(k in msg_lower for k in ["save this trip", "save plan", "save trip", "save my journey"]):
                if user_id:
                    from app.schemas.trip_planner import SaveTripRequest
                    save_req = SaveTripRequest(
                        name=f"{current_plan.trip.get('destination', 'Voyara')} Journey",
                        plan=current_plan
                    )
                    TripPlannerService.save_trip(db, user_id, save_req)
                    response = TripChatResponse(
                        session_id=session_id,
                        reply="I've saved this itinerary to your planned journeys collection. You can access it anytime from the Saved Plans tab.",
                        requires_input=False,
                        trip_context=ctx,
                        plan_status=current_plan.pricing_summary.budget_status,
                        trip_plan=current_plan,
                        action_type="SAVE_TRIP",
                        suggested_actions=["Proceed to book stay", "Share summary", "Print itinerary"]
                    )
                else:
                    response = TripChatResponse(
                        session_id=session_id,
                        reply="Please sign in to save this trip to your permanent traveler collection.",
                        requires_input=False,
                        trip_context=ctx,
                        plan_status=current_plan.pricing_summary.budget_status,
                        trip_plan=current_plan,
                        suggested_actions=["Proceed to book stay", "Share summary"]
                    )
                cls._persist_assistant_message(db, session_obj, response)
                return response

            # Action: Conversational Stay Selection
            # Example: "Choose Misty Valley Retreat", "I like the second one", "Choose property 2"
            selected_from_chat = cls._match_stay_selection(msg_lower, current_plan)
            if selected_from_chat:
                prop_id, room_id = selected_from_chat
                ctx.selected_property_id = prop_id
                ctx.selected_room_id = room_id
                
                try:
                    select_req = SelectStayRequest(
                        session_id=session_id,
                        current_plan=current_plan,
                        property_id=prop_id,
                        room_id=room_id,
                        current_context=ctx.model_dump()
                    )
                    updated_plan = TripPlannerService.select_stay_and_room(db, select_req, user_id)
                    prop_name = updated_plan.stay.property_name if updated_plan.stay else "the property"
                    room_name = updated_plan.stay.room_name if updated_plan.stay else ""
                    
                    selected_prop_opt = next((p for p in updated_plan.available_stays if p.property_id == prop_id), None) if updated_plan else None
                    room_opts = selected_prop_opt.available_rooms if selected_prop_opt else []

                    response = TripChatResponse(
                        session_id=session_id,
                        reply=f"Great choice! I've updated your trip with {prop_name} ({room_name}). The itinerary schedule, travel times, and total known cost have been refreshed.",
                        requires_input=False,
                        input_type="NONE",
                        trip_context=ctx,
                        plan_status=updated_plan.pricing_summary.budget_status,
                        trip_plan=updated_plan,
                        action_type="SELECT_STAY",
                        stays=updated_plan.available_stays if updated_plan else [],
                        selected_stay=updated_plan.stay if updated_plan else None,
                        room_options=room_opts,
                        experiences=updated_plan.experiences if updated_plan else [],
                        places=updated_plan.external_places if updated_plan else [],
                        itinerary=updated_plan.days if updated_plan else [],
                        budget=updated_plan.pricing_summary if updated_plan else {},
                        suggested_actions=["Proceed to book stay", "View room options", "Make it cheaper", "Save this trip"]
                    )
                    cls._persist_assistant_message(db, session_obj, response)
                    return response
                except Exception as e:
                    import logging
                    logging.exception(f"Error selecting stay in chat: {e}")

        # 2. Extract and update conversational context from traveler's message
        cls._extract_parameters_from_text(msg, ctx)

        # 3. Handle specific replanning modifications
        if "make it cheaper" in msg_lower or "cheaper" in msg_lower or "show cheaper" in msg_lower:
            ctx.stay_type = "ANY"
            if ctx.budget and ctx.budget > 5000:
                ctx.budget = round(ctx.budget * 0.85)

        if "add one more day" in msg_lower or "extend by 1 day" in msg_lower:
            ctx.duration_days = (ctx.duration_days or 3) + 1
            cls._recalculate_dates(ctx)

        if "remove trekking" in msg_lower or "no trekking" in msg_lower or "avoid hike" in msg_lower:
            ctx.interests = [i for i in ctx.interests if i != "ADVENTURE"]
            if "RELAXATION" not in ctx.interests:
                ctx.interests.append("RELAXATION")
            ctx.special_requests = (ctx.special_requests or "") + " Avoid long trekking."

        if "resort" in msg_lower:
            ctx.stay_type = "Resort"
        elif "homestay" in msg_lower:
            ctx.stay_type = "Homestay"
        elif "villa" in msg_lower:
            ctx.stay_type = "Villa"
        elif "cottage" in msg_lower:
            ctx.stay_type = "Cottage"

        # 4. Check what information is missing (Smart prioritization)
        # Priority 1: Destination
        if not ctx.destination:
            response = TripChatResponse(
                session_id=session_id,
                reply="Where are you dreaming of going? You can name a city (like Munnar, Wayanad, Goa, Jaipur), a state like Kerala, or describe the atmosphere you love.",
                requires_input=True,
                missing_field="DESTINATION",
                input_type="DESTINATION",
                trip_context=ctx,
                plan_status="INCOMPLETE",
                suggested_actions=["Munnar 🏔️", "Wayanad 🌿", "Goa 🌊", "Jaipur 🏰", "Ooty 🌲"]
            )
            cls._persist_assistant_message(db, session_obj, response)
            return response

        # Priority 2: Duration / Dates
        if not ctx.duration_days and (not ctx.start_date or not ctx.end_date):
            response = TripChatResponse(
                session_id=session_id,
                reply=f"Sounds wonderful! What dates or how many days are you planning for your trip to {ctx.destination}?",
                requires_input=True,
                missing_field="DURATION",
                input_type="DATES",
                trip_context=ctx,
                plan_status="INCOMPLETE",
                suggested_actions=["Weekend (3 days)", "4 days", "5 days", "1 full week"]
            )
            cls._persist_assistant_message(db, session_obj, response)
            return response

        # Priority 3: Travelers (Adults / Children)
        if ctx.adults is None:
            response = TripChatResponse(
                session_id=session_id,
                reply=f"Who will be traveling with you to {ctx.destination}? (e.g. solo, couple, family with kids)",
                requires_input=True,
                missing_field="TRAVELERS",
                input_type="TRAVELERS",
                trip_context=ctx,
                plan_status="INCOMPLETE",
                suggested_actions=["Solo traveler", "2 Adults (Couple)", "Family with 1 kid", "4 Friends"]
            )
            cls._persist_assistant_message(db, session_obj, response)
            return response

        # Priority 4: Budget (Prompt budget naturally once, but allow skipping if one-sentence plan)
        if ctx.budget is None and ctx.budget_known is True and not (current_plan and current_plan.stay):
            has_explicit_interests = len(ctx.interests) > 0
            if not has_explicit_interests:
                response = TripChatResponse(
                    session_id=session_id,
                    reply=f"Do you have a rough budget in mind for {ctx.destination}, or would you like me to estimate a realistic starting budget based on available sanctuaries?",
                    requires_input=True,
                    missing_field="BUDGET",
                    input_type="BUDGET",
                    trip_context=ctx,
                    plan_status="INCOMPLETE",
                    suggested_actions=["Around ₹15,000", "Around ₹25,000", "Suggest a realistic budget", "As cheap as possible"]
                )
                cls._persist_assistant_message(db, session_obj, response)
                return response

        # 5. We have all necessary information! Generate or update the real trip plan
        cls._recalculate_dates(ctx)
        
        # Optional Gemini assistance if configured
        try:
            from app.services.ai.gemini_service import GeminiTripPlannerService
            if GeminiTripPlannerService.is_available():
                gemini_res = GeminiTripPlannerService.process_chat_message(
                    db=db,
                    message=msg,
                    current_context=ctx.model_dump(),
                    current_plan=current_plan.model_dump() if current_plan else None
                )
        except Exception:
            pass

        response = cls._generate_conversational_plan(db, ctx, user_id, session_id)
        cls._persist_assistant_message(db, session_obj, response)
        return response

    @classmethod
    def _match_stay_selection(cls, text: str, plan: TripPlanResponse) -> Optional[Tuple[int, Optional[int]]]:
        """
        Detects if user said "I like the second one", "Choose property 2", or mentioned a property/room name.
        """
        if not plan or not plan.available_stays:
            return None

        # Number ordinal match: "first", "second", "third", "2nd", "option 2", "property 1"
        num_map = {
            "first": 1, "1st": 1, "one": 1, "1": 1,
            "second": 2, "2nd": 2, "two": 2, "2": 2,
            "third": 3, "3rd": 3, "three": 3, "3": 3,
            "fourth": 4, "4th": 4, "four": 4, "4": 4
        }
        for word, idx in num_map.items():
            if f"the {word}" in text or f"property {word}" in text or f"stay {word}" in text or f"option {word}" in text or f"choose {word}" in text:
                if 1 <= idx <= len(plan.available_stays):
                    target_prop = plan.available_stays[idx - 1]
                    return target_prop.property_id, target_prop.selected_room_id

        # Property Name Match - Exact/Longest Substring Match First
        for prop_opt in sorted(plan.available_stays, key=lambda p: len(p.property_name), reverse=True):
            p_name_lower = prop_opt.property_name.lower().strip()
            if p_name_lower in text:
                selected_room = None
                for rm in prop_opt.available_rooms:
                    if rm.room_name.lower() in text or rm.room_type.lower() in text:
                        selected_room = rm.room_id
                        break
                return prop_opt.property_id, selected_room or prop_opt.selected_room_id

        # Next check distinctive tokens (excluding destination city names and common hotel words)
        dest_words = [w.lower() for w in KNOWN_DESTINATIONS]
        ignore_words = {"resort", "hotel", "villa", "cottage", "stay", "homestay", "the", "inn", "retreat", "sanctuary", "suites", "palace", "view", "hills", "valley"} | set(dest_words)
        
        best_match = None
        max_score = 0
        for prop_opt in plan.available_stays:
            p_name_lower = prop_opt.property_name.lower().strip()
            prop_tokens = [w for w in re.findall(r"\w+", p_name_lower) if len(w) >= 3 and w not in ignore_words]
            matching_tokens = [w for w in prop_tokens if w in text]
            if len(matching_tokens) > max_score:
                max_score = len(matching_tokens)
                selected_room = None
                for rm in prop_opt.available_rooms:
                    if rm.room_name.lower() in text or rm.room_type.lower() in text:
                        selected_room = rm.room_id
                        break
                best_match = (prop_opt.property_id, selected_room or prop_opt.selected_room_id)

        if best_match and max_score > 0:
            return best_match

        # Room type match on currently selected property
        if plan.stay:
            curr_prop_opt = next((p for p in plan.available_stays if p.property_id == plan.stay.property_id), None)
            if curr_prop_opt:
                for rm in curr_prop_opt.available_rooms:
                    rm_name_clean = rm.room_name.lower()
                    if rm_name_clean in text or any(k in text for k in rm_name_clean.split() if len(k) > 4):
                        return curr_prop_opt.property_id, rm.room_id

        return None

    @classmethod
    def _persist_assistant_message(
        cls,
        db: Session,
        session_obj: Optional[TripPlannerChatSession],
        res: TripChatResponse
    ):
        """Saves assistant response and updates session snapshot in database."""
        if not session_obj:
            return
        try:
            msg_record = TripPlannerChatMessage(
                session_id=session_obj.id,
                sender="assistant",
                text=res.reply,
                suggestions=res.suggested_actions or [],
                budget_analysis=res.budget_analysis.model_dump() if res.budget_analysis else None,
                plan_status=res.plan_status,
                action_type=res.action_type,
                booking_payload=res.booking_payload
            )
            db.add(msg_record)

            session_obj.title = f"{res.trip_context.destination or 'Voyara'} Journey"
            session_obj.destination = res.trip_context.destination
            session_obj.current_context = res.trip_context.model_dump()
            if res.trip_plan:
                session_obj.current_plan_snapshot = res.trip_plan.model_dump()
            session_obj.updated_at = datetime.utcnow()

            db.commit()
        except Exception as e:
            db.rollback()

    @classmethod
    def _extract_parameters_from_text(cls, text: str, ctx: TripChatContext):
        """
        Extracts natural language trip preferences and updates the conversational context.
        """
        text_clean = text.strip()
        text_lower = text_clean.lower()

        # Word to number mapping helper
        word_to_num = {
            "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
            "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
            "eleven": 11, "twelve": 12, "a": 1, "an": 1
        }
        num_pattern = r"(?:\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|a|an)"

        def parse_num(val_str: Optional[str]) -> Optional[int]:
            if not val_str:
                return None
            val_str = val_str.strip().lower()
            if val_str.isdigit():
                return int(val_str)
            return word_to_num.get(val_str)

        # A. Destination
        change_match = re.search(r"(?:change|switch|from)\s+[a-zA-Z\s]+\s+to\s+([a-zA-Z0-9_-]+)", text_lower)
        if change_match:
            cand = change_match.group(1).title()
            ctx.destination = cand
            ctx.selected_property_id = None
            ctx.selected_room_id = None
        else:
            found_dests = []
            for dest in KNOWN_DESTINATIONS:
                match = re.search(rf"\b{dest.lower()}\b", text_lower)
                if match:
                    found_dests.append((match.start(), dest))
            if found_dests:
                found_dests.sort(key=lambda x: x[0])
                if ctx.destination != found_dests[-1][1]:
                    ctx.destination = found_dests[-1][1]
                    ctx.selected_property_id = None
                    ctx.selected_room_id = None
            elif not ctx.destination:
                trip_to_match = re.search(r"(?:trip to|travel to|vacation in|holiday in|journey to|going to|heading to|stay in|visit|to)\s+([A-Za-z0-9_-]+)", text, re.IGNORECASE)
                if trip_to_match:
                    cand_dest = trip_to_match.group(1).strip()
                    if cand_dest and len(cand_dest) > 1 and cand_dest.lower() not in ["a", "the", "our", "my", "some", "any", "this", "book", "save"]:
                        ctx.destination = cand_dest.title()

        # B. Duration / Days / Nights
        day_match = re.search(r"(\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten)[\s-]*(?:days?|d\b)", text_lower)
        night_match = re.search(r"(\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten)[\s-]*(?:nights?|n\b)", text_lower)
        if night_match and day_match:
            parsed_d = parse_num(day_match.group(1))
            if parsed_d:
                ctx.duration_days = parsed_d
        elif night_match:
            parsed_n = parse_num(night_match.group(1))
            if parsed_n:
                ctx.duration_days = parsed_n + 1
        elif day_match:
            parsed_d = parse_num(day_match.group(1))
            if parsed_d:
                ctx.duration_days = parsed_d
        elif "weekend" in text_lower:
            ctx.duration_days = 3
        elif "week" in text_lower:
            ctx.duration_days = 7
        elif re.search(r"\b(?:a|one)\s+day\b", text_lower):
            ctx.duration_days = 1
        elif ctx.duration_days is None:
            bare_num = parse_num(text_clean)
            if bare_num and 1 <= bare_num <= 30:
                ctx.duration_days = bare_num

        # C. Travelers (Adults, Children, Ages, Infants)
        is_family = any(k in text_lower for k in ["family", "with kids", "with child", "with children", "with kid"])
        if is_family:
            ctx.travel_style = ctx.travel_style or "FAMILY_FRIENDLY"
            if "NATURE" not in ctx.interests and "RELAXATION" not in ctx.interests:
                ctx.interests.append("NATURE")

        if any(k in text_lower for k in ["couple", "wife", "husband", "partner", "girlfriend", "boyfriend", "fiance", "spouse", "two of us", "me and my", "my friend and i", "my partner"]):
            ctx.adults = 2
            if not ctx.travel_style:
                ctx.travel_style = "ROMANTIC"
        elif "solo" in text_lower or "just me" in text_lower or "alone" in text_lower or "single traveler" in text_lower or "by myself" in text_lower:
            ctx.adults = 1
            ctx.children = 0

        adult_match = re.search(rf"({num_pattern})\s*(?:adult|adults|people|person|persons|guest|guests|friend|friends|traveler|travelers|pax|members)", text_lower)
        group_match = re.search(rf"(?:group of|party of|total of)\s*({num_pattern})", text_lower)
        of_us_match = re.search(rf"({num_pattern})\s*of\s*us", text_lower)
        
        if adult_match:
            parsed_a = parse_num(adult_match.group(1))
            if parsed_a:
                ctx.adults = max(1, min(12, parsed_a))
        elif group_match:
            parsed_g = parse_num(group_match.group(1))
            if parsed_g:
                ctx.adults = max(1, min(12, parsed_g))
        elif of_us_match:
            parsed_o = parse_num(of_us_match.group(1))
            if parsed_o:
                ctx.adults = max(1, min(12, parsed_o))

        # Children
        child_match = re.search(rf"({num_pattern})\s*(?:child|children|kid|kids|son|daughter|sons|daughters)", text_lower)
        if child_match:
            parsed_c = parse_num(child_match.group(1))
            if parsed_c is not None:
                ctx.children = max(0, min(6, parsed_c))
        elif any(k in text_lower for k in ["son", "daughter", "child", "children", "kid", "kids"]):
            ctx.children = max(1, ctx.children or 1)

        # Child ages
        age_matches = re.findall(rf"({num_pattern})[\s-]*(?:year|yr|years|yo)[\s-]*(?:old)?", text_lower)
        if age_matches:
            parsed_ages = [parse_num(a) for a in age_matches if parse_num(a) is not None and parse_num(a) <= 17]
            if parsed_ages:
                ctx.child_ages = parsed_ages
                ctx.children = max(ctx.children or 1, len(parsed_ages))

        family_of_match = re.search(rf"family\s+of\s+({num_pattern})", text_lower)
        if family_of_match:
            total_fam = parse_num(family_of_match.group(1))
            if total_fam:
                if total_fam == 2:
                    ctx.adults = 2
                    ctx.children = 0
                elif total_fam >= 3:
                    ctx.adults = 2
                    ctx.children = total_fam - 2
        elif is_family and ctx.adults is None:
            ctx.adults = 2

        if ctx.children is not None and ctx.children > 0 and ctx.adults is None:
            ctx.adults = 2

        if ctx.adults is None:
            bare_num = parse_num(text_clean)
            if bare_num and 1 <= bare_num <= 12:
                ctx.adults = bare_num
                if ctx.children is None:
                    ctx.children = 0

        if ctx.children and ctx.children > 0 and not ctx.child_ages:
            ctx.child_ages = [6] * ctx.children

        # Infants
        if "baby" in text_lower or "infant" in text_lower or "toddler" in text_lower:
            ctx.infants = 1

        # D. Budget
        flexible_budget_keywords = [
            "no fixed budget", "budget isn't fixed", "don't know", "dont know",
            "suggest", "estimate", "not sure", "budget doesn't matter", "any",
            "as cheap as possible", "cheapest", "budget friendly", "low budget",
            "realistic budget", "you decide", "flexible", "no budget", "skip",
            "open", "whatever", "standard", "economy", "plan it", "continue"
        ]
        if any(k in text_lower for k in flexible_budget_keywords):
            ctx.budget_known = False
            ctx.budget = None
        else:
            lakh_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:lakh|lac|lacs)", text_lower)
            k_match = re.search(r"(?:₹|rs\.?|inr|around|under|budget|of)?\s*(\d+(?:\.\d+)?)\s*k\b", text_lower)
            num_match = re.search(r"(?:₹|rs\.?|inr|around|under|budget|of)?\s*(\d{1,3}(?:,\d{3})+|\d{4,6})", text_lower)

            if lakh_match:
                ctx.budget = float(lakh_match.group(1)) * 100000
                ctx.budget_known = True
            elif k_match:
                ctx.budget = float(k_match.group(1)) * 1000
                ctx.budget_known = True
            elif num_match:
                raw_num = num_match.group(1).replace(",", "")
                val = float(raw_num)
                if val >= 1000:
                    ctx.budget = val
                    ctx.budget_known = True

        # E. Travel Style & Preferences
        if "relaxed" in text_lower or "peaceful" in text_lower or "slow" in text_lower or "chill" in text_lower or "quiet" in text_lower:
            ctx.travel_style = "RELAXED"
        elif "romantic" in text_lower or "honeymoon" in text_lower:
            ctx.travel_style = "ROMANTIC"
        elif "family" in text_lower:
            ctx.travel_style = "FAMILY_FRIENDLY"
        elif "adventure" in text_lower or "trek" in text_lower or "hike" in text_lower:
            ctx.travel_style = "ADVENTURE"
        elif "packed" in text_lower or "fast" in text_lower:
            ctx.travel_style = "PACKED"

        # F. Interests
        interests = list(ctx.interests)
        if any(k in text_lower for k in ["nature", "tea", "garden", "greenery", "plantation", "forest"]):
            if "NATURE" not in interests: interests.append("NATURE")
        if any(k in text_lower for k in ["beach", "ocean", "sea", "coastal"]):
            if "BEACHES" not in interests: interests.append("BEACHES")
        if any(k in text_lower for k in ["food", "cafe", "cuisine", "dining", "local food", "eat"]):
            if "LOCAL_FOOD" not in interests: interests.append("LOCAL_FOOD")
        if any(k in text_lower for k in ["sightseeing", "view", "waterfall", "lake", "dam"]):
            if "SIGHTSEEING" not in interests: interests.append("SIGHTSEEING")
        if any(k in text_lower for k in ["fort", "palace", "history", "heritage", "culture"]):
            if "HISTORY" not in interests: interests.append("HISTORY")
        if any(k in text_lower for k in ["trek", "hike", "safari", "outdoor"]):
            if "ADVENTURE" not in interests: interests.append("ADVENTURE")
        if any(k in text_lower for k in ["spa", "wellness", "relax", "ayurveda"]):
            if "RELAXATION" not in interests: interests.append("RELAXATION")
        ctx.interests = interests

        # G. Special Constraints / Notes
        if any(k in text_lower for k in ["walk", "elderly", "parents", "kid", "child", "photo", "pool", "veg"]):
            notes = ctx.special_requests or ""
            if "parents" in text_lower or "elderly" in text_lower or "can't walk" in text_lower:
                ctx.mobility_notes = "Avoid steep trails / low walking preferred."
            if "veg" in text_lower:
                ctx.food_preferences = "Vegetarian food preferred."
            if text_clean not in notes:
                ctx.special_requests = f"{notes} {text_clean}".strip()

    @classmethod
    def _recalculate_dates(cls, ctx: TripChatContext):
        """Ensures valid start_date and end_date based on duration_days."""
        duration = ctx.duration_days or 4
        nights = max(1, duration - 1)

        if not ctx.start_date:
            d = date.today() + timedelta(days=10)
            ctx.start_date = d.isoformat()
        
        start = date.fromisoformat(ctx.start_date)
        end = start + timedelta(days=nights)
        ctx.end_date = end.isoformat()

    @classmethod
    def _generate_conversational_plan(
        cls,
        db: Session,
        ctx: TripChatContext,
        user_id: Optional[int] = None,
        session_id: Optional[str] = None
    ) -> TripChatResponse:
        """
        Generates a validated itinerary plan from PostgreSQL with multiple accommodation comparison.
        """
        start = date.fromisoformat(ctx.start_date)
        end = date.fromisoformat(ctx.end_date)
        adults = ctx.adults or 2
        children = ctx.children or 0
        child_ages = ctx.child_ages or ([6] * children if children > 0 else [])
        interests = ctx.interests or ["NATURE", "SIGHTSEEING", "LOCAL_FOOD"]
        travel_style = ctx.travel_style or "BALANCED"
        stay_type = ctx.stay_type or "ANY"

        trip_req = TripPlannerRequest(
            destination=ctx.destination,
            start_date=start,
            end_date=end,
            adults=adults,
            children=children,
            child_ages=child_ages,
            infants=ctx.infants or 0,
            budget=ctx.budget,
            budget_type=ctx.budget_type or "TOTAL",
            interests=interests,
            travel_style=travel_style,
            stay_type=stay_type,
            special_requests=ctx.special_requests
        )

        try:
            plan = TripPlannerService.generate_trip_plan(
                db=db,
                request=trip_req,
                user_id=user_id,
                preferred_property_id=ctx.selected_property_id,
                preferred_room_id=ctx.selected_room_id
            )
        except Exception:
            trip_req.stay_type = "ANY"
            trip_req.budget = None
            plan = TripPlannerService.generate_trip_plan(
                db=db,
                request=trip_req,
                user_id=user_id,
                preferred_property_id=ctx.selected_property_id,
                preferred_room_id=ctx.selected_room_id
            )

        known_cost = plan.pricing_summary.known_cost
        accommodation_total = plan.pricing_summary.accommodation_total
        target_budget = ctx.budget
        num_stays = len(plan.available_stays)

        what_fits = [
            f"{plan.trip['total_days']} Days · {plan.trip['total_nights']} Nights itinerary in {ctx.destination}",
            f"Accommodates {adults} adults{f' and {children} child' if children else ''}",
            f"Pacing: {travel_style.replace('_', ' ')}"
        ]
        if plan.stay:
            what_fits.insert(0, f"Verified stay at {plan.stay.property_name}")

        what_compromises = []

        if not plan.stay:
            plan_status = "NO_BOOKABLE_STAY"
            reply = f"I can still plan your journey! I don't currently have an available verified VOYARA stay in {ctx.destination} for your exact dates, so there isn't a bookable accommodation to add yet. I've designed your visual itinerary with regional attractions and activities."
            if plan.nearby_stays:
                reply += f" I also found {len(plan.nearby_stays)} verified stays in nearby areas if you'd like to explore them."
            budget_analysis = BudgetAnalysis(
                requested_budget=target_budget,
                estimated_known_cost=known_cost,
                budget_difference=0.0,
                realistic_starting_estimate=0.0,
                why_higher_explanation=None,
                what_fits=what_fits,
                what_compromises=["No verified stay currently available in this destination."]
            )
        elif target_budget and target_budget > 0:
            diff = known_cost - target_budget
            if diff <= 0:
                plan_status = "EXACT_MATCH"
                stay_phrase = f"I found {num_stays} stays that fit your trip (starting with {plan.stay.property_name})." if num_stays > 1 else f"I found a verified stay at {plan.stay.property_name}."
                reply = f"I've planned your custom {ctx.destination} journey! {stay_phrase} It fits comfortably within your ₹{int(target_budget):,} budget (known cost is ₹{int(known_cost):,})."
            elif diff <= (target_budget * 0.35) or diff <= 5000:
                plan_status = "CLOSE_MATCH"
                what_compromises.append(f"Estimated cost is approximately ₹{int(diff):,} above your ₹{int(target_budget):,} target due to current accommodation rates.")
                reply = f"I found a close match for {ctx.destination}. Verified stays start around ₹{int(accommodation_total):,}, making the total known cost ₹{int(known_cost):,} (approx ₹{int(diff):,} above your ₹{int(target_budget):,} target). You can compare the {num_stays} available stays and choose your preferred property."
            else:
                plan_status = "ROUGH_PLAN"
                what_compromises.append(f"Accommodation prices for these dates start higher than ₹{int(target_budget):,}.")
                reply = f"I've created a rough itinerary for {ctx.destination}. Your target of ₹{int(target_budget):,} is below current available sanctuary rates (which start at approx ₹{int(accommodation_total):,}). Here is the closest realistic plan with your requested activities."

            budget_analysis = BudgetAnalysis(
                requested_budget=target_budget,
                estimated_known_cost=known_cost,
                budget_difference=diff,
                realistic_starting_estimate=accommodation_total,
                why_higher_explanation=f"Verified accommodations in {ctx.destination} for {plan.trip['total_nights']} nights start around ₹{int(accommodation_total):,}." if accommodation_total > 0 else f"Sanctuary availability in {ctx.destination} is being refreshed.",
                what_fits=what_fits,
                what_compromises=what_compromises
            )
        else:
            plan_status = "EXACT_MATCH"
            stay_phrase = f"I found {num_stays} verified stays that fit your trip." if num_stays > 1 else "I matched a verified sanctuary for your dates."
            reply = f"I've crafted your custom {ctx.destination} journey! {stay_phrase} The estimated known cost is around ₹{int(known_cost):,} for {plan.trip['total_nights']} nights."
            budget_analysis = BudgetAnalysis(
                requested_budget=None,
                estimated_known_cost=known_cost,
                budget_difference=0.0,
                realistic_starting_estimate=accommodation_total,
                why_higher_explanation=None,
                what_fits=what_fits,
                what_compromises=[]
            )

        suggested_actions = []
        if num_stays > 1:
            suggested_actions.append(f"Compare {num_stays} stays")
        suggested_actions.extend([
            "Make it cheaper",
            "Show family-friendly options",
            "Make it relaxed",
            "Proceed to book stay",
            "Save this trip"
        ])

        return TripChatResponse(
            session_id=session_id,
            reply=reply,
            requires_input=False,
            missing_field=None,
            input_type="NONE",
            trip_context=ctx,
            plan_status=plan_status,
            budget_analysis=budget_analysis,
            trip_plan=plan,
            stays=plan.available_stays or [],
            selected_stay=plan.stay,
            room_options=plan.stay.available_rooms if (plan.stay and hasattr(plan.stay, "available_rooms") and plan.stay.available_rooms) else [],
            experiences=plan.experiences or [],
            places=plan.external_places or [],
            itinerary=plan.days or [],
            budget=plan.pricing_summary,
            suggested_actions=suggested_actions[:5]
        )
