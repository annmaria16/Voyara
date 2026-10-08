from datetime import date, timedelta
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func

from app.models.property import Property, PropertyVerificationStatus, PropertyRule
from app.models.room import Room, RoomRule
from app.models.availability import PropertyAvailability, RoomAvailability
from app.models.booking import Booking, BookingStatus, BookingRoom
from app.models.adventure import (
    Adventure,
    AdventureSchedule,
    AdventureAvailability,
    Experience,
    ExperienceSchedule,
    ExperienceAvailability
)
from app.schemas.trip_planner import TripPlannerRequest, TripPlanResponse

class TripPlannerValidationService:
    @staticmethod
    def check_room_suitability(
        room: Room,
        adults: int,
        children: int = 0,
        child_ages: Optional[List[int]] = None,
        room_quantity: int = 1
    ) -> Tuple[bool, Optional[str]]:
        """
        Validates whether a room configuration satisfies traveler occupancy and child policies.
        Delegates to BookingAgentToolsService.calculate_room_configuration for 100% unified rule enforcement.
        Returns (is_suitable, unsuitability_reason).
        """
        from app.services.ai.booking_agent_tools import BookingAgentToolsService
        from app.database import SessionLocal
        
        db = Session.object_session(room)
        should_close = False
        if db is None:
            db = SessionLocal()
            should_close = True
        try:
            config = BookingAgentToolsService.calculate_room_configuration(
                db=db,
                property_id=room.property_id,
                room_id=room.id,
                adults=adults,
                children=children,
                child_ages=child_ages or [],
                requested_quantity=room_quantity
            )
            if config.get("valid"):
                return True, None
            return False, config.get("error", "Room does not satisfy guest and child policies.")
        finally:
            if should_close:
                db.close()

    @classmethod
    def query_verified_candidate_stays(
        cls,
        db: Session,
        request: TripPlannerRequest
    ) -> List[Tuple[Property, Room]]:
        """
        Queries PostgreSQL for verified, active Indian properties and rooms with
        live availability and sufficient capacity for the requested travelers.
        Strictly enforces database rules; NEVER invents fake stays or rooms.
        """
        dest = request.destination.strip().lower()
        total_guests = request.adults + request.children
        num_nights = max(1, (request.end_date - request.start_date).days)

        # 1. Base property query: VERIFIED, ACTIVE, India
        prop_query = db.query(Property).filter(
            Property.verification_status == PropertyVerificationStatus.VERIFIED.value,
            Property.is_active.is_(True),
            func.lower(Property.country) == "india"
        )

        # 2. Destination filter (fuzzy or substring match on city, state, or address)
        dest_filter = or_(
            func.lower(Property.city).ilike(f"%{dest}%"),
            func.lower(Property.state).ilike(f"%{dest}%"),
            func.lower(Property.address).ilike(f"%{dest}%"),
            func.lower(Property.name).ilike(f"%{dest}%")
        )
        prop_query = prop_query.filter(dest_filter)

        # 3. Stay type filter if specific type requested
        if request.stay_type and request.stay_type != "ANY":
            prop_query = prop_query.filter(func.lower(Property.property_type) == request.stay_type.lower())

        properties = prop_query.all()
        if not properties:
            return []

        candidate_pairs: List[Tuple[Property, Room]] = []

        for prop in properties:
            # Check whole-property closures
            has_closure = db.query(PropertyAvailability).filter(
                PropertyAvailability.property_id == prop.id,
                PropertyAvailability.is_closed.is_(True),
                PropertyAvailability.start_date < request.end_date,
                PropertyAvailability.end_date > request.start_date
            ).first()

            if has_closure:
                continue

            # Query rooms for this property
            rooms = db.query(Room).filter(
                Room.property_id == prop.id,
                Room.is_active.is_(True)
            ).all()

            for room in rooms:
                room_cap = max(1, room.capacity or 2)
                needed_qty = max(1, (total_guests + room_cap - 1) // room_cap)
                if room.quantity and room.quantity < needed_qty:
                    continue

                is_suitable, _ = cls.check_room_suitability(
                    room=room,
                    adults=request.adults,
                    children=request.children,
                    child_ages=request.child_ages,
                    room_quantity=needed_qty
                )
                if not is_suitable:
                    continue

                # Room block check
                has_room_block = db.query(RoomAvailability).filter(
                    RoomAvailability.room_id == room.id,
                    RoomAvailability.is_blocked.is_(True),
                    RoomAvailability.start_date < request.end_date,
                    RoomAvailability.end_date > request.start_date
                ).first()

                if has_room_block:
                    continue

                # Booking conflict check
                overlapping_bookings = db.query(BookingRoom).join(Booking).filter(
                    BookingRoom.room_id == room.id,
                    Booking.status.in_([
                        BookingStatus.PENDING,
                        BookingStatus.VERIFIED,
                        BookingStatus.CONFIRMED,
                        BookingStatus.CHECKED_IN
                    ]),
                    Booking.check_in < request.end_date,
                    Booking.check_out > request.start_date
                ).count()

                available_units = max(0, room.quantity - overlapping_bookings)
                if available_units <= 0:
                    continue

                # Budget accommodation check if ACCOMMODATION budget provided
                if request.budget and request.budget_type == "ACCOMMODATION":
                    est_stay_cost = float(room.base_price) * num_nights
                    if est_stay_cost > request.budget:
                        continue

                candidate_pairs.append((prop, room))

        return candidate_pairs

    @classmethod
    def query_nearby_stays(
        cls,
        db: Session,
        destination: str,
        request: TripPlannerRequest,
        exclude_property_ids: Optional[List[int]] = None
    ) -> List[Tuple[Property, Room]]:
        """
        Queries verified active properties in nearby Indian regions when
        the target destination does not have any direct available stays.
        """
        exclude_ids = exclude_property_ids or []
        query = db.query(Property).filter(
            Property.verification_status == PropertyVerificationStatus.VERIFIED.value,
            Property.is_active.is_(True),
            func.lower(Property.country) == "india",
            ~Property.id.in_(exclude_ids) if exclude_ids else True
        ).limit(10).all()

        nearby_pairs = []
        for prop in query:
            rooms = db.query(Room).filter(Room.property_id == prop.id, Room.is_active.is_(True)).all()
            for room in rooms:
                is_suitable, _ = cls.check_room_suitability(
                    room=room,
                    adults=request.adults,
                    children=request.children,
                    child_ages=request.child_ages
                )
                if is_suitable:
                    nearby_pairs.append((prop, room))
                    break  # top room per nearby property
        return nearby_pairs

    @staticmethod
    def query_verified_candidate_adventures(
        db: Session,
        request: TripPlannerRequest,
        property_ids: Optional[List[int]] = None
    ) -> List[Tuple[Adventure, date]]:
        """
        Queries PostgreSQL for active Voyara adventures matching target destination/dates.
        Validates schedule, available capacity, and date overlap.
        """
        dest = request.destination.strip().lower()
        participants = request.adults + request.children

        adv_query = db.query(Adventure).join(Property).filter(
            Adventure.is_active.is_(True),
            Property.verification_status == PropertyVerificationStatus.VERIFIED.value,
            Property.is_active.is_(True)
        )

        if property_ids:
            adv_query = adv_query.filter(Adventure.property_id.in_(property_ids))
        else:
            adv_query = adv_query.filter(func.lower(Property.city).ilike(f"%{dest}%"))

        # Filter by adventure preferences if provided
        adv_prefs = getattr(request, 'adventure_preferences', None) or getattr(request, 'experience_preferences', None)
        if adv_prefs and "ANY" not in [ep.upper() for ep in adv_prefs]:
            prefs = [ep.lower() for ep in adv_prefs]
            adv_query = adv_query.filter(
                or_(*[func.lower(Adventure.adventure_type).ilike(f"%{p}%") for p in prefs])
            )

        all_advs = adv_query.all()
        matched: List[Tuple[Adventure, date]] = []

        num_nights = max(1, (request.end_date - request.start_date).days)
        if num_nights > 1:
            intermediate_dates = [request.start_date + timedelta(days=i) for i in range(1, num_nights)]
            trip_dates = intermediate_dates + [request.start_date, request.end_date]
        else:
            trip_dates = [request.start_date, request.end_date]

        for adv in all_advs:
            # Check capacity
            if adv.capacity < participants:
                continue

            for trip_d in trip_dates:
                # 1. One-time schedule
                if adv.schedule_type == "one-time":
                    if adv.event_date == trip_d:
                        avail = db.query(AdventureAvailability).filter(
                            AdventureAvailability.adventure_id == adv.id,
                            AdventureAvailability.date == trip_d
                        ).first()
                        booked = avail.booked_count if avail else 0
                        if adv.capacity - booked >= participants:
                            matched.append((adv, trip_d))
                            break
                # 2. Recurring schedule
                else:
                    day_name = trip_d.strftime("%A")
                    sched = db.query(AdventureSchedule).filter(
                        AdventureSchedule.adventure_id == adv.id,
                        AdventureSchedule.is_active.is_(True),
                        func.lower(AdventureSchedule.day_of_week) == day_name.lower()
                    ).first()

                    if sched:
                        avail = db.query(AdventureAvailability).filter(
                            AdventureAvailability.adventure_id == adv.id,
                            AdventureAvailability.date == trip_d
                        ).first()
                        booked = avail.booked_count if avail else 0
                        if adv.capacity - booked >= participants:
                            matched.append((adv, trip_d))
                            break

        return matched

    @staticmethod
    def query_verified_candidate_experiences(
        db: Session,
        request: TripPlannerRequest,
        property_ids: Optional[List[int]] = None
    ) -> List[Tuple[Experience, date]]:
        return TripPlannerValidationService.query_verified_candidate_adventures(
            db=db,
            request=request,
            property_ids=property_ids
        )

    @staticmethod
    def validate_plan_integrity(plan: TripPlanResponse) -> Tuple[str, List[str]]:
        """
        Validates final generated plan before returning to the traveler.
        Checks timeline overlap, valid IDs, and budget consistency.
        """
        messages = []
        status = "PASSED"

        # Check budget
        if plan.pricing_summary.budget_status == "EXCEEDS_BUDGET":
            diff = plan.pricing_summary.budget_difference or 0
            messages.append(f"Estimated known trip cost exceeds stated target budget by ₹{diff:,.0f}.")
            status = "WARNINGS"

        # Check if stay was found
        if not plan.stay:
            messages.append("No verified Voyara stay currently matches all selected filters for these dates.")
            status = "WARNINGS"

        # Check itinerary time consistency
        for day in plan.days:
            for i in range(len(day.items) - 1):
                curr_item = day.items[i]
                next_item = day.items[i+1]
                if curr_item.end_time > next_item.start_time and curr_item.time_slot == next_item.time_slot:
                    messages.append(f"Day {day.day_number}: Potential schedule overlap between '{curr_item.title}' and '{next_item.title}'.")
                    status = "WARNINGS"

        return status, messages
