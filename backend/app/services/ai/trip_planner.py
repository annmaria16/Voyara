from datetime import date, datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.saved_trip import SavedTrip, SavedTripItem
from app.models.property import Property, PropertyImage, PropertyAmenity, PropertyRule, PropertyVerificationStatus
from app.models.room import Room, RoomImage, RoomAmenity, RoomRule
from app.models.experience import Experience
from app.schemas.trip_planner import (
    TripPlannerRequest,
    TripPlanResponse,
    TripPlannerStayCandidate,
    TripPlannerPropertyOption,
    TripPlannerRoomOption,
    DestinationInfo,
    TripPlannerExperienceCandidate,
    ExternalPlaceCandidate,
    ItineraryDayResponse,
    RegenerateDayRequest,
    SelectStayRequest,
    RevalidateTripResponse,
    SaveTripRequest,
    SavedTripSummaryResponse,
    SavedTripDetailResponse
)
from app.services.ai.destination_places import DestinationPlacesService
from app.services.ai.trip_pricing import TripPricingService
from app.services.ai.itinerary_optimizer import ItineraryOptimizerService
from app.services.ai.trip_planner_validation import TripPlannerValidationService

class TripPlannerService:
    @classmethod
    def generate_trip_plan(
        cls,
        db: Session,
        request: TripPlannerRequest,
        user_id: Optional[int] = None,
        preferred_property_id: Optional[int] = None,
        preferred_room_id: Optional[int] = None
    ) -> TripPlanResponse:
        """
        Orchestrates complete, real, validated trip plan generation.
        Strictly enforces PostgreSQL inventory and real destination places ground truth.
        Provides visual accommodation options with available rooms for easy comparison.
        """
        num_nights = max(1, (request.end_date - request.start_date).days)
        total_days = num_nights + 1
        participants = request.adults + request.children

        # 1. Query verified PostgreSQL candidate stays
        candidate_pairs = TripPlannerValidationService.query_verified_candidate_stays(db, request)
        
        selected_stay_candidate: Optional[TripPlannerStayCandidate] = None
        accommodation_total = 0.0
        available_stays: List[TripPlannerPropertyOption] = []
        nearby_stays: List[TripPlannerPropertyOption] = []

        # Group candidate pairs by property
        prop_map: Dict[int, Dict[str, Any]] = {}
        for prop, room in candidate_pairs:
            if prop.id not in prop_map:
                prop_map[prop.id] = {
                    "prop": prop,
                    "rooms": []
                }
            if room not in prop_map[prop.id]["rooms"]:
                prop_map[prop.id]["rooms"].append(room)

        # Build available_stays list
        for prop_id, p_data in prop_map.items():
            prop = p_data["prop"]
            rooms = p_data["rooms"]
            
            # Images
            prop_imgs = []
            if prop.images:
                for img in prop.images:
                    if img.image_url and img.image_url not in prop_imgs:
                        prop_imgs.append(img.image_url)
            primary_img = prop_imgs[0] if prop_imgs else None

            # Amenities
            prop_amenities = [a.amenity_name for a in (prop.amenities or [])]

            # Build room options
            room_options: List[TripPlannerRoomOption] = []
            prop_rule = getattr(prop, "home_rules", None)

            for rm in rooms:
                rm_rule = getattr(rm, "rules", None)
                pricing_res = TripPricingService.calculate_stay_cost(
                    room=rm,
                    nights=num_nights,
                    adults=request.adults,
                    children=request.children,
                    child_ages=request.child_ages,
                    property_rule=prop_rule,
                    room_rule=rm_rule
                )
                
                is_suitable, unsuitability_reason = TripPlannerValidationService.check_room_suitability(
                    room=rm,
                    adults=request.adults,
                    children=request.children,
                    child_ages=request.child_ages
                )

                rm_imgs = []
                if rm.images:
                    for rimg in rm.images:
                        if rimg.image_url and rimg.image_url not in rm_imgs:
                            rm_imgs.append(rimg.image_url)
                primary_rm_img = rm_imgs[0] if rm_imgs else primary_img

                rm_amenities = [a.amenity_name for a in (rm.amenities or [])]

                room_options.append(TripPlannerRoomOption(
                    room_id=rm.id,
                    room_name=rm.name,
                    room_type=rm.room_type,
                    description=rm.description,
                    capacity=rm.capacity,
                    max_adults=rm_rule.maximum_adults if rm_rule else rm.capacity,
                    max_children=rm_rule.maximum_children if rm_rule else 0,
                    price_per_night=pricing_res["price_per_night"],
                    total_nights=num_nights,
                    room_subtotal=pricing_res["room_subtotal"],
                    child_charge_subtotal=pricing_res["child_charge_subtotal"],
                    total_stay_cost=pricing_res["total_stay_cost"],
                    is_suitable_for_group=is_suitable,
                    unsuitability_reason=unsuitability_reason,
                    image_url=primary_rm_img,
                    images=rm_imgs,
                    amenities=rm_amenities,
                    rules_summary=f"Max {rm.capacity} guests" + (f" · Extra child policy: ₹{rm_rule.child_charge_amount:,.0f}" if rm_rule and rm_rule.child_charge_enabled else "")
                ))

            if room_options:
                min_price_room = min(room_options, key=lambda r: r.price_per_night)
                
                prop_option = TripPlannerPropertyOption(
                    property_id=prop.id,
                    property_name=prop.name,
                    property_type=prop.property_type,
                    city=prop.city,
                    state=prop.state,
                    address=prop.address,
                    latitude=prop.latitude,
                    longitude=prop.longitude,
                    image_url=primary_img,
                    images=prop_imgs,
                    rating=getattr(prop, "rating", 0.0) or 0.0,
                    review_count=getattr(prop, "review_count", 0) or 0,
                    amenities=prop_amenities[:8],
                    description=prop.description,
                    check_in_time=prop.check_in_time or "14:00",
                    check_out_time=prop.check_out_time or "11:00",
                    starting_price_per_night=min_price_room.price_per_night,
                    total_stay_cost=min_price_room.total_stay_cost,
                    available_rooms=room_options,
                    selected_room_id=min_price_room.room_id,
                    is_selected=False,
                    why_this_stay=f"Verified {prop.property_type.lower()} in {prop.city} with {len(room_options)} available room type{'s' if len(room_options) > 1 else ''} for your dates."
                )
                available_stays.append(prop_option)

        if candidate_pairs:
            # Score and rank stays
            ranked_stays = cls._rank_stay_candidates(candidate_pairs, request)
            
            # Check if preferred property / room was requested
            best_prop, best_room = ranked_stays[0]
            if preferred_property_id:
                for p, r in ranked_stays:
                    if p.id == preferred_property_id:
                        if preferred_room_id and r.id == preferred_room_id:
                            best_prop, best_room = p, r
                            break
                        elif not preferred_room_id:
                            best_prop, best_room = p, r
                            break

            prop_rule: Optional[PropertyRule] = getattr(best_prop, "home_rules", None)
            room_rule: Optional[RoomRule] = getattr(best_room, "rules", None)

            pricing_res = TripPricingService.calculate_stay_cost(
                room=best_room,
                nights=num_nights,
                adults=request.adults,
                children=request.children,
                child_ages=request.child_ages,
                property_rule=prop_rule,
                room_rule=room_rule
            )

            accommodation_total = pricing_res["total_stay_cost"]

            # Primary image & gallery
            prop_imgs = []
            if best_prop.images:
                for img in best_prop.images:
                    if img.image_url and img.image_url not in prop_imgs:
                        prop_imgs.append(img.image_url)
            primary_img = prop_imgs[0] if prop_imgs else None

            # Amenities list
            amenities = [a.amenity_name for a in (best_prop.amenities or [])][:6]

            # Factual explanation
            why_explanation = cls._generate_stay_explanation(best_prop, best_room, request, pricing_res)

            selected_stay_candidate = TripPlannerStayCandidate(
                property_id=best_prop.id,
                property_name=best_prop.name,
                property_type=best_prop.property_type,
                city=best_prop.city,
                state=best_prop.state,
                address=best_prop.address,
                latitude=best_prop.latitude,
                longitude=best_prop.longitude,
                image_url=primary_img,
                images=prop_imgs,
                rating=getattr(best_prop, "rating", 0.0) or 0.0,
                review_count=getattr(best_prop, "review_count", 0) or 0,
                amenities=amenities,
                check_in_time=best_prop.check_in_time or "14:00",
                check_out_time=best_prop.check_out_time or "11:00",
                room_id=best_room.id,
                room_name=best_room.name,
                room_type=best_room.room_type,
                capacity=best_room.capacity,
                price_per_night=pricing_res["price_per_night"],
                total_nights=num_nights,
                room_subtotal=pricing_res["room_subtotal"],
                child_charge_subtotal=pricing_res["child_charge_subtotal"],
                total_stay_cost=pricing_res["total_stay_cost"],
                why_this_stay=why_explanation
            )

            # Mark selected property in available_stays
            for opt in available_stays:
                if opt.property_id == best_prop.id:
                    opt.is_selected = True
                    opt.selected_room_id = best_room.id
                    opt.total_stay_cost = pricing_res["total_stay_cost"]
                    opt.why_this_stay = why_explanation
        else:
            # If no direct stays in destination, query nearby Indian stays
            nearby_pairs = TripPlannerValidationService.query_nearby_stays(db, request.destination, request)
            for n_prop, n_room in nearby_pairs:
                n_imgs = [img.image_url for img in (n_prop.images or []) if img.image_url]
                n_amenities = [a.amenity_name for a in (n_prop.amenities or [])][:6]
                n_cost = float(n_room.base_price) * num_nights
                nearby_stays.append(TripPlannerPropertyOption(
                    property_id=n_prop.id,
                    property_name=n_prop.name,
                    property_type=n_prop.property_type,
                    city=n_prop.city,
                    state=n_prop.state,
                    address=n_prop.address,
                    latitude=n_prop.latitude,
                    longitude=n_prop.longitude,
                    image_url=n_imgs[0] if n_imgs else None,
                    images=n_imgs,
                    rating=getattr(n_prop, "rating", 0.0) or 0.0,
                    review_count=getattr(n_prop, "review_count", 0) or 0,
                    amenities=n_amenities,
                    description=n_prop.description,
                    check_in_time=n_prop.check_in_time or "14:00",
                    check_out_time=n_prop.check_out_time or "11:00",
                    starting_price_per_night=float(n_room.base_price),
                    total_stay_cost=n_cost,
                    available_rooms=[],
                    is_selected=False,
                    why_this_stay=f"Nearby verified sanctuary in {n_prop.city}."
                ))

        # 2. Query verified PostgreSQL candidate experiences
        prop_ids = [selected_stay_candidate.property_id] if selected_stay_candidate else None
        candidate_exps = TripPlannerValidationService.query_verified_candidate_experiences(db, request, prop_ids)

        experience_candidates: List[TripPlannerExperienceCandidate] = []
        experiences_total = 0.0

        for exp, exp_date in candidate_exps[:2]:  # Select up to 2 top matching experiences
            day_num = max(1, min(total_days, (exp_date - request.start_date).days + 1))
            exp_pricing = TripPricingService.calculate_experience_cost(exp, participants)
            experiences_total += exp_pricing["total_experience_cost"]

            experience_candidates.append(TripPlannerExperienceCandidate(
                experience_id=exp.id,
                property_id=exp.property_id,
                property_name=exp.property.name if exp.property else "Voyara Partner",
                title=exp.title,
                experience_type=exp.experience_type,
                description=exp.description,
                price=float(exp.price),
                pricing_model=exp.pricing_model,
                duration=exp.duration,
                start_time=exp.start_time,
                end_time=exp.end_time,
                image_url=exp.image_url,
                scheduled_date=exp_date.strftime("%Y-%m-%d"),
                day_number=day_num,
                participants=participants,
                total_experience_cost=exp_pricing["total_experience_cost"],
                capacity_available=exp.capacity
            ))

        # 3. Query real destination places / attractions & destination metadata
        external_places = DestinationPlacesService.get_destination_places(
            destination=request.destination,
            interests=request.interests,
            max_results=8
        )
        destination_info = DestinationPlacesService.get_destination_info(request.destination)

        # 4. Generate structured, optimized itinerary
        days = ItineraryOptimizerService.generate_optimized_itinerary(
            destination=request.destination,
            start_date=request.start_date,
            end_date=request.end_date,
            stay=selected_stay_candidate,
            experiences=experience_candidates,
            external_places=external_places,
            travel_style=request.travel_style,
            interests=request.interests
        )

        # 5. Pricing summary
        pricing_summary = TripPricingService.build_pricing_summary(
            accommodation_total=accommodation_total,
            experiences_total=experiences_total,
            budget=request.budget,
            budget_type=request.budget_type
        )

        # 6. Overall plan explanation
        plan_explanation = cls._generate_overall_plan_explanation(
            destination=request.destination,
            num_nights=num_nights,
            stay=selected_stay_candidate,
            experiences=experience_candidates,
            places=external_places,
            travel_style=request.travel_style
        )

        plan = TripPlanResponse(
            trip={
                "destination": request.destination,
                "start_date": request.start_date.strftime("%Y-%m-%d"),
                "end_date": request.end_date.strftime("%Y-%m-%d"),
                "total_days": total_days,
                "total_nights": num_nights,
                "adults": request.adults,
                "children": request.children,
                "child_ages": request.child_ages,
                "infants": request.infants,
                "budget": request.budget,
                "budget_type": request.budget_type,
                "travel_style": request.travel_style,
                "stay_type": request.stay_type,
                "interests": request.interests,
                "experience_preferences": request.experience_preferences,
                "special_requests": request.special_requests
            },
            stay=selected_stay_candidate,
            available_stays=available_stays,
            nearby_stays=nearby_stays,
            destination_info=destination_info,
            experiences=experience_candidates,
            external_places=external_places,
            days=days,
            pricing_summary=pricing_summary,
            explanation=plan_explanation
        )

        # 7. Validate plan integrity
        val_status, val_messages = TripPlannerValidationService.validate_plan_integrity(plan)
        plan.validation_status = val_status
        plan.validation_messages = val_messages

        return plan

    @classmethod
    def select_stay_and_room(
        cls,
        db: Session,
        request: SelectStayRequest,
        user_id: Optional[int] = None
    ) -> TripPlanResponse:
        """
        Revalidates property, room, availability, and pricing in PostgreSQL,
        updates the selected stay in the plan, and recalculates the itinerary and pricing.
        """
        plan = request.current_plan
        trip_info = plan.trip
        prop_id = request.property_id
        room_id = request.room_id

        # Query property from DB
        prop = db.query(Property).filter(
            Property.id == prop_id,
            Property.verification_status == PropertyVerificationStatus.VERIFIED.value,
            Property.is_active.is_(True)
        ).first()

        if not prop:
            raise HTTPException(status_code=400, detail="The selected property is not currently active or verified.")

        # Query room
        if room_id:
            room = db.query(Room).filter(Room.id == room_id, Room.property_id == prop.id, Room.is_active.is_(True)).first()
        else:
            room = db.query(Room).filter(Room.property_id == prop.id, Room.is_active.is_(True)).first()

        if not room:
            raise HTTPException(status_code=400, detail="No active room found for this property.")

        start_date = datetime.strptime(trip_info["start_date"], "%Y-%m-%d").date()
        end_date = datetime.strptime(trip_info["end_date"], "%Y-%m-%d").date()
        adults = trip_info.get("adults", 2)
        children = trip_info.get("children", 0)
        child_ages = trip_info.get("child_ages", [])

        # Validate suitability
        is_suitable, reason = TripPlannerValidationService.check_room_suitability(
            room=room,
            adults=adults,
            children=children,
            child_ages=child_ages
        )
        if not is_suitable:
            raise HTTPException(status_code=400, detail=reason or "Selected room is not suitable for your group.")

        # Re-generate full plan with preferred property & room
        planner_req = TripPlannerRequest(
            destination=trip_info["destination"],
            start_date=start_date,
            end_date=end_date,
            adults=adults,
            children=children,
            child_ages=child_ages,
            infants=trip_info.get("infants", 0),
            budget=trip_info.get("budget"),
            budget_type=trip_info.get("budget_type", "TOTAL"),
            travel_style=trip_info.get("travel_style", "BALANCED"),
            stay_type="ANY",
            interests=trip_info.get("interests", []),
            experience_preferences=trip_info.get("experience_preferences", []),
            special_requests=trip_info.get("special_requests")
        )

        return cls.generate_trip_plan(
            db=db,
            request=planner_req,
            user_id=user_id,
            preferred_property_id=prop.id,
            preferred_room_id=room.id
        )

    @classmethod
    def regenerate_day(
        cls,
        db: Session,
        request: RegenerateDayRequest
    ) -> TripPlanResponse:
        """
        Regenerates a specific day in the itinerary without altering the stay, dates, or other days.
        """
        plan = request.plan
        target_day = request.day_number

        if target_day < 1 or target_day > len(plan.days):
            raise HTTPException(status_code=400, detail=f"Invalid day number {target_day}.")

        dest = plan.trip.get("destination", "Destination")
        all_places = DestinationPlacesService.get_destination_places(destination=dest, max_results=10)

        # Find places not used in other days
        used_place_ids = {
            item.external_place_id for d in plan.days if d.day_number != target_day for item in d.items if item.external_place_id
        }
        avail_places = [p for p in all_places if p.external_place_id not in used_place_ids] or all_places

        # Re-build target day
        start_d = datetime.strptime(plan.trip["start_date"], "%Y-%m-%d").date()
        target_date = start_d + timedelta(days=target_day - 1)
        target_date_str = target_date.strftime("%Y-%m-%d")

        stay = plan.stay
        base_lat = stay.latitude if stay and stay.latitude else (avail_places[0].latitude if avail_places else 0.0)
        base_lng = stay.longitude if stay and stay.longitude else (avail_places[0].longitude if avail_places else 0.0)

        new_items = []

        if target_day == 1:
            # Day 1 Arrival + Checkin
            new_items.append(plan.days[0].items[0])
            if len(plan.days[0].items) > 1 and plan.days[0].items[1].item_type == "STAY_CHECKIN":
                new_items.append(plan.days[0].items[1])
            
            if avail_places:
                p = avail_places[0]
                dist = DestinationPlacesService.calculate_haversine_distance(base_lat, base_lng, p.latitude, p.longitude)
                travel_time = DestinationPlacesService.estimate_travel_time_minutes(dist)
                new_items.append(
                    ItineraryOptimizerService._create_attraction_item(p, "16:00", "18:00", dist, travel_time)
                )
            new_items.append(plan.days[0].items[-1])
        elif target_day == len(plan.days):
            # Final Day
            new_items.append(plan.days[-1].items[0])
            if len(plan.days[-1].items) > 1 and plan.days[-1].items[1].item_type == "STAY_CHECKOUT":
                new_items.append(plan.days[-1].items[1])
            if avail_places:
                p = avail_places[-1]
                dist = DestinationPlacesService.calculate_haversine_distance(base_lat, base_lng, p.latitude, p.longitude)
                travel_time = DestinationPlacesService.estimate_travel_time_minutes(dist)
                new_items.append(
                    ItineraryOptimizerService._create_attraction_item(p, "11:30", "13:30", dist, travel_time)
                )
            new_items.append(plan.days[-1].items[-1])
        else:
            # Intermediate Day
            if avail_places:
                p1 = avail_places[0]
                dist1 = DestinationPlacesService.calculate_haversine_distance(base_lat, base_lng, p1.latitude, p1.longitude)
                t1 = DestinationPlacesService.estimate_travel_time_minutes(dist1)
                new_items.append(
                    ItineraryOptimizerService._create_attraction_item(p1, "09:30", "12:00", dist1, t1)
                )

            new_items.append(
                plan.days[target_day - 1].items[1] if len(plan.days[target_day - 1].items) > 1 else
                plan.days[target_day - 1].items[0]
            )

            if len(avail_places) > 1:
                p2 = avail_places[1]
                dist2 = DestinationPlacesService.calculate_haversine_distance(base_lat, base_lng, p2.latitude, p2.longitude)
                t2 = DestinationPlacesService.estimate_travel_time_minutes(dist2)
                new_items.append(
                    ItineraryOptimizerService._create_attraction_item(p2, "14:30", "17:00", dist2, t2)
                )

            new_items.append(plan.days[target_day - 1].items[-1])

        new_items.sort(key=lambda x: x.start_time)

        # Replace target day in plan
        plan.days[target_day - 1] = ItineraryDayResponse(
            day_number=target_day,
            date=target_date_str,
            theme=f"Day {target_day} — Refreshed Itinerary Highlights",
            items=new_items
        )

        return plan

    @classmethod
    def revalidate_saved_trip(
        cls,
        db: Session,
        trip_id: int,
        user_id: int
    ) -> RevalidateTripResponse:
        """
        Revalidates live room/experience availability and pricing for a saved trip plan.
        """
        saved = db.query(SavedTrip).filter(
            SavedTrip.id == trip_id,
            SavedTrip.user_id == user_id
        ).first()

        if not saved:
            raise HTTPException(status_code=404, detail="Saved trip not found.")

        changes_summary = []
        is_stay_avail = True
        is_exp_avail = True

        full_plan_dict = saved.full_plan_snapshot or {}
        stay_dict = full_plan_dict.get("stay")
        
        if stay_dict:
            room_id = stay_dict.get("room_id")
            prop_id = stay_dict.get("property_id")
            room = db.query(Room).filter(Room.id == room_id, Room.property_id == prop_id).first()
            prop = db.query(Property).filter(Property.id == prop_id).first()

            if not prop or not prop.is_active or prop.verification_status != "VERIFIED":
                is_stay_avail = False
                changes_summary.append(f"Property '{stay_dict.get('property_name')}' is currently inactive or under review.")
            elif not room or not room.is_active:
                is_stay_avail = False
                changes_summary.append(f"Room '{stay_dict.get('room_name')}' is no longer active.")
            else:
                curr_price = float(room.base_price)
                saved_price = float(stay_dict.get("price_per_night", curr_price))
                if abs(curr_price - saved_price) > 0.01:
                    changes_summary.append(f"Room nightly rate updated from ₹{saved_price:,.0f} to ₹{curr_price:,.0f}.")
                    stay_dict["price_per_night"] = curr_price
                    stay_dict["room_subtotal"] = curr_price * saved.total_nights
                    stay_dict["total_stay_cost"] = stay_dict["room_subtotal"] + stay_dict.get("child_charge_subtotal", 0.0)

        # Parse updated full plan
        try:
            updated_plan = TripPlanResponse(**full_plan_dict)
        except Exception:
            req = TripPlannerRequest(
                destination=saved.destination,
                start_date=saved.start_date,
                end_date=saved.end_date,
                adults=saved.adults,
                children=saved.children,
                child_ages=saved.child_ages or [],
                infants=saved.infants,
                budget=saved.budget,
                budget_type=saved.budget_type,
                travel_style=saved.travel_style,
                stay_type=saved.stay_type,
                interests=saved.interests or [],
                experience_preferences=saved.experience_preferences or [],
                special_requests=saved.special_requests
            )
            updated_plan = cls.generate_trip_plan(db, req, user_id)

        has_changes = len(changes_summary) > 0

        return RevalidateTripResponse(
            trip_id=saved.id,
            has_changes=has_changes,
            changes_summary=changes_summary,
            is_stay_available=is_stay_avail,
            is_experience_available=is_exp_avail,
            updated_plan=updated_plan
        )

    @classmethod
    def save_trip(
        cls,
        db: Session,
        user_id: int,
        req: SaveTripRequest
    ) -> SavedTripDetailResponse:
        """Saves generated trip plan to PostgreSQL for the authenticated traveler."""
        plan = req.plan
        t_info = plan.trip

        start_d = datetime.strptime(t_info["start_date"], "%Y-%m-%d").date()
        end_d = datetime.strptime(t_info["end_date"], "%Y-%m-%d").date()

        trip_name = req.name or f"{t_info['destination']} Journey"

        saved_trip = SavedTrip(
            user_id=user_id,
            name=trip_name,
            destination=t_info["destination"],
            start_date=start_d,
            end_date=end_d,
            total_days=t_info.get("total_days", 1),
            total_nights=t_info.get("total_nights", 1),
            adults=t_info.get("adults", 1),
            children=t_info.get("children", 0),
            child_ages=t_info.get("child_ages", []),
            infants=t_info.get("infants", 0),
            budget=t_info.get("budget"),
            budget_type=t_info.get("budget_type", "TOTAL"),
            travel_style=t_info.get("travel_style", "BALANCED"),
            stay_type=t_info.get("stay_type", "ANY"),
            interests=t_info.get("interests", []),
            experience_preferences=t_info.get("experience_preferences", []),
            special_requests=t_info.get("special_requests"),
            summary=plan.explanation,
            explanation=plan.stay.why_this_stay if plan.stay else None,
            estimated_known_cost=plan.pricing_summary.known_cost,
            currency="INR",
            full_plan_snapshot=plan.model_dump()
        )
        db.add(saved_trip)
        db.commit()
        db.refresh(saved_trip)

        # Save items
        for d in plan.days:
            for item in d.items:
                trip_item = SavedTripItem(
                    trip_id=saved_trip.id,
                    day_number=d.day_number,
                    item_type=item.item_type,
                    internal_id=item.internal_id,
                    external_provider=item.external_provider,
                    external_place_id=item.external_place_id,
                    title=item.title,
                    description=item.description,
                    category=item.category,
                    start_time=item.start_time,
                    end_time=item.end_time,
                    location_name=item.location_name,
                    latitude=item.latitude,
                    longitude=item.longitude,
                    cost=item.cost,
                    pricing_note=item.pricing_note,
                    travel_time_minutes=item.travel_time_minutes,
                    distance_km=item.distance_km
                )
                db.add(trip_item)
        db.commit()

        return cls.get_trip_by_id(db, saved_trip.id, user_id)

    @classmethod
    def get_user_trips(
        cls,
        db: Session,
        user_id: int
    ) -> List[SavedTripSummaryResponse]:
        """Lists all saved trips for the authenticated traveler."""
        trips = db.query(SavedTrip).filter(
            SavedTrip.user_id == user_id
        ).order_by(SavedTrip.created_at.desc()).all()

        summaries = []
        for t in trips:
            stay_name = None
            if t.full_plan_snapshot and "stay" in t.full_plan_snapshot and t.full_plan_snapshot["stay"]:
                stay_name = t.full_plan_snapshot["stay"].get("property_name")

            summaries.append(SavedTripSummaryResponse(
                id=t.id,
                name=t.name,
                destination=t.destination,
                start_date=t.start_date.strftime("%Y-%m-%d"),
                end_date=t.end_date.strftime("%Y-%m-%d"),
                total_days=t.total_days,
                total_nights=t.total_nights,
                adults=t.adults,
                children=t.children,
                estimated_known_cost=t.estimated_known_cost,
                currency=t.currency,
                stay_name=stay_name,
                created_at=t.created_at.isoformat(),
                updated_at=t.updated_at.isoformat()
            ))
        return summaries

    @classmethod
    def get_trip_by_id(
        cls,
        db: Session,
        trip_id: int,
        user_id: int
    ) -> SavedTripDetailResponse:
        """Retrieves full saved trip with live revalidation status."""
        t = db.query(SavedTrip).filter(
            SavedTrip.id == trip_id,
            SavedTrip.user_id == user_id
        ).first()

        if not t:
            raise HTTPException(status_code=404, detail="Saved trip not found.")

        reval = cls.revalidate_saved_trip(db, trip_id, user_id)

        return SavedTripDetailResponse(
            id=t.id,
            name=t.name,
            destination=t.destination,
            start_date=t.start_date.strftime("%Y-%m-%d"),
            end_date=t.end_date.strftime("%Y-%m-%d"),
            total_days=t.total_days,
            total_nights=t.total_nights,
            adults=t.adults,
            children=t.children,
            child_ages=t.child_ages or [],
            infants=t.infants,
            budget=t.budget,
            budget_type=t.budget_type,
            travel_style=t.travel_style,
            stay_type=t.stay_type,
            interests=t.interests or [],
            experience_preferences=t.experience_preferences or [],
            special_requests=t.special_requests,
            estimated_known_cost=t.estimated_known_cost,
            currency=t.currency,
            full_plan=reval.updated_plan,
            revalidation_status={
                "has_changes": reval.has_changes,
                "changes_summary": reval.changes_summary,
                "is_stay_available": reval.is_stay_available,
                "is_experience_available": reval.is_experience_available
            },
            created_at=t.created_at.isoformat(),
            updated_at=t.updated_at.isoformat()
        )

    @classmethod
    def delete_trip(
        cls,
        db: Session,
        trip_id: int,
        user_id: int
    ) -> Dict[str, Any]:
        """Deletes a saved trip."""
        t = db.query(SavedTrip).filter(
            SavedTrip.id == trip_id,
            SavedTrip.user_id == user_id
        ).first()

        if not t:
            raise HTTPException(status_code=404, detail="Saved trip not found.")

        db.delete(t)
        db.commit()
        return {"message": "Saved trip removed successfully.", "success": True}

    # ==========================================
    # INTERNAL HELPERS
    # ==========================================
    @staticmethod
    def _rank_stay_candidates(
        pairs: List[Tuple[Property, Room]],
        request: TripPlannerRequest
    ) -> List[Tuple[Property, Room]]:
        """Multi-factor scoring without unsupported favoritism."""
        scored = []
        num_nights = max(1, (request.end_date - request.start_date).days)
        target_budget = request.budget if request.budget and request.budget_type == "ACCOMMODATION" else None

        for prop, room in pairs:
            score = 10.0
            
            # Destination match
            if request.destination.lower() in prop.city.lower():
                score += 15.0

            # Property type preference match
            if request.stay_type and request.stay_type != "ANY" and prop.property_type.lower() == request.stay_type.lower():
                score += 10.0

            # Budget adherence
            est_cost = float(room.base_price) * num_nights
            if target_budget:
                if est_cost <= target_budget:
                    score += 15.0
                else:
                    score -= 20.0

            # Rating / reviews
            score += min(5.0, (getattr(prop, "rating", 0.0) or 0.0))

            # Featured boost
            if getattr(prop, "featured", False):
                score += 2.0

            scored.append((score, prop, room))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [(p, r) for _, p, r in scored]

    @staticmethod
    def _generate_stay_explanation(
        prop: Property,
        room: Room,
        request: TripPlannerRequest,
        pricing: Dict[str, Any]
    ) -> str:
        """Fact-based justification for stay selection."""
        parts = [
            f"Selected because {prop.name} is a verified {prop.property_type.lower()} in {prop.city}",
            f"has confirmed availability for your {pricing['total_nights']}-night dates",
            f"offers the '{room.name}' with adequate capacity ({room.capacity} guests)",
            f"and aligns with your {request.travel_style.lower().replace('_', ' ')} travel style."
        ]
        return " ".join(parts)

    @staticmethod
    def _generate_overall_plan_explanation(
        destination: str,
        num_nights: int,
        stay: Optional[TripPlannerStayCandidate],
        experiences: List[TripPlannerExperienceCandidate],
        places: List[ExternalPlaceCandidate],
        travel_style: str
    ) -> str:
        """Overview summary of the planned itinerary."""
        stay_mention = f"at {stay.property_name}" if stay else "with regional exploration"
        exp_count = len(experiences)
        places_count = len(places)
        return (
            f"Your {num_nights + 1}-day itinerary to {destination} is organized for a "
            f"{travel_style.lower().replace('_', ' ')} pace {stay_mention}. "
            f"It integrates {exp_count} verified Voyara experience{'s' if exp_count != 1 else ''} and "
            f"{places_count} real-world regional highlights with realistic travel times."
        )
