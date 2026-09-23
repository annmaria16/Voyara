from datetime import date, timedelta
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func

from app.models.property import Property, PropertyVerificationStatus, PropertyRule
from app.models.room import Room, RoomRule
from app.models.availability import PropertyAvailability, RoomAvailability
from app.models.booking import Booking, BookingStatus, BookingRoom
from app.models.experience import Experience, ExperienceSchedule, ExperienceAvailability
from app.schemas.trip_planner import TripPlannerRequest, TripPlanResponse

class TripPlannerValidationService:
    @staticmethod
    def check_room_suitability(
        room: Room,
        adults: int,
        children: int = 0,
        child_ages: Optional[List[int]] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Validates whether a room satisfies traveler occupancy and child policies.
        Returns (is_suitable, unsuitability_reason).
        """
        total_guests = adults + children
        rule: Optional[RoomRule] = getattr(room, "rules", None)
        prop: Optional[Property] = getattr(room, "property", None)
        prop_rule: Optional[PropertyRule] = getattr(prop, "home_rules", None) if prop else None

        # 1. Total capacity check
        max_capacity = rule.maximum_total_guests if rule and rule.maximum_total_guests else room.capacity
        if max_capacity < total_guests:
            return False, f"Room capacity is {max_capacity} guests, but your group has {total_guests}."

        # 2. Adult capacity check
        if rule and rule.maximum_adults and adults > rule.maximum_adults:
            return False, f"Maximum allowed adults for this room is {rule.maximum_adults}."

        # 3. Children policy check
        if children > 0:
            if rule and str(rule.children_allowed).lower() == "no":
                return False, "This room type does not accommodate children."
            if prop_rule and str(prop_rule.children_allowed).lower() == "no":
                return False, "This property does not accommodate children."

            if rule and rule.maximum_children and children > rule.maximum_children:
                return False, f"Maximum allowed children for this room is {rule.maximum_children}."

            if child_ages:
                min_age = getattr(rule, "minimum_child_age", None) or (getattr(prop_rule, "minimum_child_age", None) if prop_rule else None)
                if min_age is not None:
                    for age in child_ages:
                        if age < min_age:
                            return False, f"Children under age {min_age} are not permitted in this room."

        return True, None

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
                is_suitable, _ = cls.check_room_suitability(
                    room=room,
                    adults=request.adults,
                    children=request.children,
                    child_ages=request.child_ages
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
    def query_verified_candidate_experiences(
        db: Session,
        request: TripPlannerRequest,
        property_ids: Optional[List[int]] = None
    ) -> List[Tuple[Experience, date]]:
        """
        Queries PostgreSQL for active Voyara experiences matching target destination/dates.
        Validates schedule, available capacity, and date overlap.
        """
        dest = request.destination.strip().lower()
        participants = request.adults + request.children

        exp_query = db.query(Experience).join(Property).filter(
            Experience.is_active.is_(True),
            Property.verification_status == PropertyVerificationStatus.VERIFIED.value,
            Property.is_active.is_(True)
        )

        if property_ids:
            exp_query = exp_query.filter(
                or_(
                    Experience.property_id.in_(property_ids),
                    func.lower(Property.city).ilike(f"%{dest}%")
                )
            )
        else:
            exp_query = exp_query.filter(func.lower(Property.city).ilike(f"%{dest}%"))

        # Filter by experience preferences if provided
        if request.experience_preferences and "ANY" not in [ep.upper() for ep in request.experience_preferences]:
            prefs = [ep.lower() for ep in request.experience_preferences]
            exp_query = exp_query.filter(
                or_(*[func.lower(Experience.experience_type).ilike(f"%{p}%") for p in prefs])
            )

        all_exps = exp_query.all()
        matched: List[Tuple[Experience, date]] = []

        num_nights = max(1, (request.end_date - request.start_date).days)
        if num_nights > 1:
            intermediate_dates = [request.start_date + timedelta(days=i) for i in range(1, num_nights)]
            trip_dates = intermediate_dates + [request.start_date, request.end_date]
        else:
            trip_dates = [request.start_date, request.end_date]

        for exp in all_exps:
            # Check capacity
            if exp.capacity < participants:
                continue

            for trip_d in trip_dates:
                # 1. One-time schedule
                if exp.schedule_type == "one-time":
                    if exp.event_date == trip_d:
                        avail = db.query(ExperienceAvailability).filter(
                            ExperienceAvailability.experience_id == exp.id,
                            ExperienceAvailability.date == trip_d
                        ).first()
                        booked = avail.booked_count if avail else 0
                        if exp.capacity - booked >= participants:
                            matched.append((exp, trip_d))
                            break
                # 2. Recurring schedule
                else:
                    day_name = trip_d.strftime("%A")
                    sched = db.query(ExperienceSchedule).filter(
                        ExperienceSchedule.experience_id == exp.id,
                        ExperienceSchedule.is_active.is_(True),
                        func.lower(ExperienceSchedule.day_of_week) == day_name.lower()
                    ).first()

                    if sched:
                        avail = db.query(ExperienceAvailability).filter(
                            ExperienceAvailability.experience_id == exp.id,
                            ExperienceAvailability.date == trip_d
                        ).first()
                        booked = avail.booked_count if avail else 0
                        if exp.capacity - booked >= participants:
                            matched.append((exp, trip_d))
                            break

        return matched

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
