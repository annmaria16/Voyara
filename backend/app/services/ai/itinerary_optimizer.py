from datetime import date, timedelta
from typing import List, Dict, Any, Optional
from app.schemas.trip_planner import (
    ItineraryDayResponse,
    ItineraryItemResponse,
    TripPlannerStayCandidate,
    TripPlannerExperienceCandidate,
    ExternalPlaceCandidate
)
from app.services.ai.destination_places import DestinationPlacesService

class ItineraryOptimizerService:
    @classmethod
    def generate_optimized_itinerary(
        cls,
        destination: str,
        start_date: date,
        end_date: date,
        stay: Optional[TripPlannerStayCandidate],
        experiences: List[TripPlannerExperienceCandidate],
        external_places: List[ExternalPlaceCandidate],
        travel_style: str = "BALANCED",
        interests: Optional[List[str]] = None
    ) -> List[ItineraryDayResponse]:
        """
        Builds a coherent, geographically clustered, and temporally accurate day-by-day itinerary.
        Respects:
        - Day 1 Check-in time (14:00 or configured)
        - Final Day Check-out time (11:00 or configured)
        - Exact Voyara experience scheduled hours
        - Geographic clustering of attractions to minimize travel time
        """
        num_nights = max(1, (end_date - start_date).days)
        num_days = num_nights + 1
        
        days_response: List[ItineraryDayResponse] = []
        
        # Determine daily activity density based on travel_style
        style = (travel_style or "BALANCED").upper()
        if style == "RELAXED":
            max_attractions_per_day = 1
        elif style == "PACKED":
            max_attractions_per_day = 3
        else:  # BALANCED, FAMILY_FRIENDLY, ADVENTURE, ROMANTIC
            max_attractions_per_day = 2

        # Base coordinates from stay or destination center
        base_lat = stay.latitude if stay and stay.latitude else (external_places[0].latitude if external_places else 0.0)
        base_lng = stay.longitude if stay and stay.longitude else (external_places[0].longitude if external_places else 0.0)

        # Distribute external attractions across intermediate days
        remaining_places = list(external_places)
        
        # Sort places by distance from base property for efficient clustering
        if base_lat and base_lng:
            for p in remaining_places:
                p_dist = DestinationPlacesService.calculate_haversine_distance(base_lat, base_lng, p.latitude, p.longitude)
                setattr(p, '_dist_from_stay', p_dist)
            remaining_places.sort(key=lambda x: getattr(x, '_dist_from_stay', 999.0))

        # Map experiences by day number (if already assigned) or distribute them
        exp_by_day: Dict[int, List[TripPlannerExperienceCandidate]] = {}
        for exp in experiences:
            d_num = getattr(exp, 'day_number', 2)
            if d_num > num_days:
                d_num = min(2, num_days)
            exp_by_day.setdefault(d_num, []).append(exp)

        # Build each day
        place_idx = 0
        for day_num in range(1, num_days + 1):
            curr_date = start_date + timedelta(days=day_num - 1)
            curr_date_str = curr_date.strftime("%Y-%m-%d")
            
            day_items: List[ItineraryItemResponse] = []

            # ==========================================
            # DAY 1: ARRIVAL & CHECK-IN
            # ==========================================
            if day_num == 1:
                theme = "Arrival, Check-in & Scenic Relaxation"
                
                # 1. Arrival
                day_items.append(ItineraryItemResponse(
                    item_id=f"day1_arrival",
                    time_slot="Morning",
                    start_time="10:30",
                    end_time="12:00",
                    title=f"Arrive in {destination}",
                    item_type="LEISURE_NOTE",
                    description=f"Welcome to {destination}! Arrive via scenic transit, breathe in the fresh air, and enjoy a light welcome refreshment.",
                    location_name=destination,
                    cost=0.0
                ))

                # 2. Check-in at Stay
                check_in_time = stay.check_in_time if stay else "14:00"
                if stay:
                    day_items.append(ItineraryItemResponse(
                        item_id=f"day1_checkin",
                        time_slot="Afternoon",
                        start_time=check_in_time,
                        end_time="15:30",
                        title=f"Check-in at {stay.property_name}",
                        item_type="STAY_CHECKIN",
                        description=f"Settle into your {stay.room_name}. Relax on the balcony and enjoy the {stay.property_type.lower()} amenities.",
                        internal_id=stay.property_id,
                        photo_url=stay.image_url,
                        location_name=f"{stay.property_name}, {stay.city}",
                        latitude=stay.latitude,
                        longitude=stay.longitude,
                        cost=stay.total_stay_cost,
                        pricing_note=f"₹{stay.price_per_night:,.0f}/night × {stay.total_nights} nights",
                        action_type="BOOK_STAY"
                    ))

                # Day 1 Experience if any
                day_exps = exp_by_day.get(1, [])
                for exp in day_exps:
                    day_items.append(ItineraryItemResponse(
                        item_id=f"day1_exp_{exp.experience_id}",
                        time_slot="Evening",
                        start_time=exp.start_time,
                        end_time=exp.end_time,
                        title=f"Voyara Experience: {exp.title}",
                        item_type="VOYARA_EXPERIENCE",
                        description=f"{exp.description} (Duration: {exp.duration})",
                        internal_id=exp.experience_id,
                        photo_url=exp.image_url,
                        location_name=f"{exp.property_name}, {destination}",
                        cost=exp.total_experience_cost,
                        pricing_note=f"₹{exp.price:,.0f} ({exp.pricing_model.replace('_', ' ')})",
                        action_type="VIEW_EXPERIENCE"
                    ))

                # 3. Afternoon / Evening Nearby Attraction
                if not day_exps and place_idx < len(remaining_places):
                    p = remaining_places[place_idx]
                    place_idx += 1
                    dist = DestinationPlacesService.calculate_haversine_distance(base_lat, base_lng, p.latitude, p.longitude)
                    travel_time = DestinationPlacesService.estimate_travel_time_minutes(dist)
                    
                    day_items.append(ItineraryItemResponse(
                        item_id=f"day1_place_{p.external_place_id}",
                        time_slot="Afternoon",
                        start_time="16:00",
                        end_time="18:00",
                        title=p.name,
                        item_type="EXTERNAL_ATTRACTION",
                        description=p.description,
                        external_provider=p.source,
                        external_place_id=p.external_place_id,
                        photo_url=p.photo_url,
                        location_name=p.name,
                        latitude=p.latitude,
                        longitude=p.longitude,
                        travel_time_minutes=travel_time,
                        distance_km=dist,
                        action_type="VIEW_MAP"
                    ))

                # 4. Evening Dinner & Leisure
                day_items.append(ItineraryItemResponse(
                    item_id=f"day1_dinner",
                    time_slot="Evening",
                    start_time="19:00",
                    end_time="21:00",
                    title="Authentic Regional Dinner & Leisure",
                    item_type="MEAL_RECOMMENDATION",
                    description="Savor local delicacies at the property or a nearby verified dining spot. Enjoy a quiet, restful evening.",
                    location_name=f"{destination} Town",
                    cost=0.0
                ))

            # ==========================================
            # FINAL DAY: BREAKFAST, CHECKOUT & DEPARTURE
            # ==========================================
            elif day_num == num_days:
                theme = "Morning Sunshine, Checkout & Farewell"

                # 1. Morning Breakfast
                day_items.append(ItineraryItemResponse(
                    item_id=f"day{day_num}_breakfast",
                    time_slot="Morning",
                    start_time="08:00",
                    end_time="09:30",
                    title="Breakfast & Morning Stroll",
                    item_type="MEAL_RECOMMENDATION",
                    description="Enjoy breakfast with morning views. Take a gentle morning walk around the property grounds.",
                    location_name=stay.property_name if stay else destination,
                    cost=0.0
                ))

                # 2. Check-out
                check_out_time = stay.check_out_time if stay else "11:00"
                if stay:
                    day_items.append(ItineraryItemResponse(
                        item_id=f"day{day_num}_checkout",
                        time_slot="Morning",
                        start_time="10:30",
                        end_time=check_out_time,
                        title=f"Check-out from {stay.property_name}",
                        item_type="STAY_CHECKOUT",
                        description=f"Complete checkout formalities at {stay.property_name}. Front desk luggage assistance available.",
                        internal_id=stay.property_id,
                        photo_url=stay.image_url,
                        location_name=stay.property_name,
                        latitude=stay.latitude,
                        longitude=stay.longitude,
                        cost=0.0
                    ))

                # 3. Optional Last Attraction / Souvenir shopping
                if place_idx < len(remaining_places):
                    p = remaining_places[place_idx]
                    place_idx += 1
                    dist = DestinationPlacesService.calculate_haversine_distance(base_lat, base_lng, p.latitude, p.longitude)
                    travel_time = DestinationPlacesService.estimate_travel_time_minutes(dist)

                    day_items.append(ItineraryItemResponse(
                        item_id=f"day{day_num}_place_{p.external_place_id}",
                        time_slot="Afternoon",
                        start_time="11:30",
                        end_time="13:30",
                        title=p.name,
                        item_type="EXTERNAL_ATTRACTION",
                        description=p.description,
                        external_provider=p.source,
                        external_place_id=p.external_place_id,
                        photo_url=p.photo_url,
                        location_name=p.name,
                        latitude=p.latitude,
                        longitude=p.longitude,
                        travel_time_minutes=travel_time,
                        distance_km=dist,
                        action_type="VIEW_MAP"
                    ))

                # 4. Departure
                day_items.append(ItineraryItemResponse(
                    item_id=f"day{day_num}_departure",
                    time_slot="Afternoon",
                    start_time="14:00",
                    end_time="15:30",
                    title=f"Departure from {destination}",
                    item_type="LEISURE_NOTE",
                    description=f"Conclude your memorable getaway with lovely memories of {destination}.",
                    location_name=destination,
                    cost=0.0
                ))

            # ==========================================
            # INTERMEDIATE DAYS: EXPLORATION & EXPERIENCES
            # ==========================================
            else:
                day_exps = exp_by_day.get(day_num, [])
                theme = f"Day {day_num} — Nature, Culture & Local Exploration"

                # 1. Morning Attraction
                if place_idx < len(remaining_places):
                    p = remaining_places[place_idx]
                    place_idx += 1
                    dist = DestinationPlacesService.calculate_haversine_distance(base_lat, base_lng, p.latitude, p.longitude)
                    travel_time = DestinationPlacesService.estimate_travel_time_minutes(dist)

                    day_items.append(ItineraryItemResponse(
                        item_id=f"day{day_num}_place_{p.external_place_id}",
                        time_slot="Morning",
                        start_time="09:00",
                        end_time="11:30",
                        title=p.name,
                        item_type="EXTERNAL_ATTRACTION",
                        description=p.description,
                        external_provider=p.source,
                        external_place_id=p.external_place_id,
                        photo_url=p.photo_url,
                        location_name=p.name,
                        latitude=p.latitude,
                        longitude=p.longitude,
                        travel_time_minutes=travel_time,
                        distance_km=dist,
                        action_type="VIEW_MAP"
                    ))

                # 2. Lunch Break
                day_items.append(ItineraryItemResponse(
                    item_id=f"day{day_num}_lunch",
                    time_slot="Afternoon",
                    start_time="12:30",
                    end_time="13:45",
                    title="Midday Traditional Lunch",
                    item_type="MEAL_RECOMMENDATION",
                    description="Authentic local restaurant lunch featuring fresh regional specialties.",
                    location_name=f"{destination} Valley",
                    cost=0.0
                ))

                # 3. Voyara Experience (if booked/scheduled for this day)
                if day_exps:
                    for exp in day_exps:
                        theme = f"Day {day_num} — {exp.title} & Local Highlights"
                        day_items.append(ItineraryItemResponse(
                            item_id=f"day{day_num}_exp_{exp.experience_id}",
                            time_slot="Afternoon" if "12:" in exp.start_time or "13:" in exp.start_time or "14:" in exp.start_time or "15:" in exp.start_time or "16:" in exp.start_time else ("Morning" if "0" in exp.start_time or "10:" in exp.start_time or "11:" in exp.start_time else "Evening"),
                            start_time=exp.start_time,
                            end_time=exp.end_time,
                            title=f"Voyara Experience: {exp.title}",
                            item_type="VOYARA_EXPERIENCE",
                            description=f"{exp.description} (Duration: {exp.duration})",
                            internal_id=exp.experience_id,
                            photo_url=exp.image_url,
                            location_name=f"{exp.property_name}, {destination}",
                            cost=exp.total_experience_cost,
                            pricing_note=f"₹{exp.price:,.0f} ({exp.pricing_model.replace('_', ' ')})",
                            action_type="VIEW_EXPERIENCE"
                        ))
                elif place_idx < len(remaining_places) and max_attractions_per_day >= 2:
                    # Alternative Afternoon Attraction
                    p = remaining_places[place_idx]
                    place_idx += 1
                    dist = DestinationPlacesService.calculate_haversine_distance(base_lat, base_lng, p.latitude, p.longitude)
                    travel_time = DestinationPlacesService.estimate_travel_time_minutes(dist)

                    day_items.append(ItineraryItemResponse(
                        item_id=f"day{day_num}_place_{p.external_place_id}",
                        time_slot="Afternoon",
                        start_time="14:30",
                        end_time="17:00",
                        title=p.name,
                        item_type="EXTERNAL_ATTRACTION",
                        description=p.description,
                        external_provider=p.source,
                        external_place_id=p.external_place_id,
                        photo_url=p.photo_url,
                        location_name=p.name,
                        latitude=p.latitude,
                        longitude=p.longitude,
                        travel_time_minutes=travel_time,
                        distance_km=dist,
                        action_type="VIEW_MAP"
                    ))

                # 4. Evening Sunset / Leisure
                day_items.append(ItineraryItemResponse(
                    item_id=f"day{day_num}_evening",
                    time_slot="Evening",
                    start_time="18:30",
                    end_time="20:30",
                    title="Scenic Sunset & Peaceful Twilight",
                    item_type="LEISURE_NOTE",
                    description="Unwind as the golden hour settles over the mountains. Enjoy campfire or hot beverages.",
                    location_name=stay.property_name if stay else destination,
                    cost=0.0
                ))

            # Sort items by start_time
            day_items.sort(key=lambda item: item.start_time)

            days_response.append(ItineraryDayResponse(
                day_number=day_num,
                date=curr_date_str,
                theme=theme,
                items=day_items
            ))

        return days_response

    @staticmethod
    def _create_attraction_item(
        p: ExternalPlaceCandidate,
        start_time: str,
        end_time: str,
        dist: float,
        travel_time: int
    ) -> ItineraryItemResponse:
        """Helper to format an external attraction as an ItineraryItemResponse."""
        return ItineraryItemResponse(
            item_id=f"place_{p.external_place_id}_{start_time.replace(':', '')}",
            time_slot="Morning" if int(start_time.split(':')[0]) < 12 else ("Afternoon" if int(start_time.split(':')[0]) < 18 else "Evening"),
            start_time=start_time,
            end_time=end_time,
            title=p.name,
            item_type="EXTERNAL_ATTRACTION",
            description=p.description,
            external_provider=p.source,
            external_place_id=p.external_place_id,
            photo_url=p.photo_url,
            location_name=p.name,
            latitude=p.latitude,
            longitude=p.longitude,
            travel_time_minutes=travel_time,
            distance_km=dist,
            action_type="VIEW_MAP"
        )

