import re
from datetime import date, datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_

from app.models.property import Property, PropertyVerificationStatus, PropertyImage, PropertyAmenity
from app.models.room import Room, RoomImage, RoomAmenity, RoomRule
from app.models.booking import Booking, BookingStatus, BookingRoom, BookingExperience
from app.models.experience import Experience, ExperienceAvailability, ExperienceSchedule
from app.models.review import Review
from app.services.ai.trip_planner_validation import TripPlannerValidationService
from app.services.ai.destination_places import DestinationPlacesService
from app.services.ai.trip_pricing import TripPricingService

class TripPlannerToolsService:
    @classmethod
    def search_properties_for_trip(
        cls,
        db: Session,
        destination: str,
        check_in: Optional[str] = None,
        check_out: Optional[str] = None,
        adults: int = 2,
        children: int = 0,
        child_ages: Optional[List[int]] = None,
        property_type: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Searches PostgreSQL for verified, active properties in the requested destination.
        Returns sanitized data without internal secrets or unverified records.
        """
        child_ages = child_ages or []
        dest_clean = destination.strip()

        query = db.query(Property).filter(
            Property.is_active == True,
            Property.verification_status == PropertyVerificationStatus.VERIFIED.value,
            or_(
                func.lower(Property.city).contains(dest_clean.lower()),
                func.lower(Property.state).contains(dest_clean.lower()),
                func.lower(Property.name).contains(dest_clean.lower())
            )
        )

        if property_type and property_type.upper() not in ["ALL", "ANY"]:
            query = query.filter(func.lower(Property.property_type) == property_type.lower())

        properties = query.limit(limit).all()
        results = []

        for p in properties:
            # Get reviews aggregate
            rev_stats = db.query(
                func.count(Review.id).label("count"),
                func.avg(Review.rating).label("avg_rating")
            ).filter(Review.property_id == p.id).first()
            
            review_count = rev_stats.count if rev_stats else 0
            avg_rating = round(float(rev_stats.avg_rating), 1) if (rev_stats and rev_stats.avg_rating) else (p.rating or 4.8)

            # Get images from database
            prop_img = db.query(PropertyImage).filter(PropertyImage.property_id == p.id).order_by(PropertyImage.is_primary.desc()).first()
            hero_image = prop_img.image_url if prop_img else None

            # Get rooms
            rooms = db.query(Room).filter(Room.property_id == p.id, Room.is_active == True).all()
            min_price_night = min([r.base_price for r in rooms]) if rooms else 3000.0

            if min_price and min_price_night < min_price:
                continue
            if max_price and min_price_night > max_price:
                continue

            amenity_names = [a.amenity_name for a in p.amenities] if p.amenities else []

            results.append({
                "property_id": p.id,
                "property_name": p.name,
                "property_type": p.property_type or "Resort",
                "city": p.city,
                "state": p.state,
                "address": p.address,
                "rating": avg_rating,
                "review_count": review_count,
                "starting_price_per_night": float(min_price_night),
                "image_url": hero_image,
                "amenities": amenity_names,
                "description": p.description or f"Verified sanctuary in {p.city}, {p.state}."
            })

        return results

    @classmethod
    def check_stay_availability(
        cls,
        db: Session,
        destination: str,
        check_in: str,
        check_out: str,
        adults: int = 2,
        children: int = 0,
        child_ages: Optional[List[int]] = None,
        property_type: Optional[str] = None,
        budget: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Authoritative availability calculation for the requested destination & dates.
        Evaluates room capacity, child policies, calendar availability, and pricing.
        """
        child_ages = child_ages or []
        try:
            start_d = date.fromisoformat(check_in)
            end_d = date.fromisoformat(check_out)
        except Exception:
            start_d = date.today() + timedelta(days=10)
            end_d = start_d + timedelta(days=3)

        total_nights = max(1, (end_d - start_d).days)
        total_travelers = adults + children

        # Query verified active properties in destination
        query = db.query(Property).filter(
            Property.is_active == True,
            Property.verification_status == PropertyVerificationStatus.VERIFIED.value,
            or_(
                func.lower(Property.city).contains(destination.lower()),
                func.lower(Property.state).contains(destination.lower()),
                func.lower(Property.name).contains(destination.lower())
            )
        )
        if property_type and property_type.upper() not in ["ALL", "ANY"]:
            query = query.filter(func.lower(Property.property_type) == property_type.lower())

        properties = query.all()
        available_stays = []

        for p in properties:
            # Fetch active rooms
            rooms = db.query(Room).filter(Room.property_id == p.id, Room.is_active == True).all()
            if not rooms:
                continue

            available_room_options = []
            for r in rooms:
                # Check room suitability (occupancy, child age policy, child rules)
                is_suitable, reason = TripPlannerValidationService.check_room_suitability(
                    room=r,
                    adults=adults,
                    children=children,
                    child_ages=child_ages
                )

                # Calculate child fee if applicable
                child_fee_night = 0.0
                if children > 0 and r.rules:
                    if r.rules.child_charge_enabled and r.rules.child_charge_amount:
                        child_fee_night = float(r.rules.child_charge_amount * children)
                    elif r.rules.child_price:
                        child_fee_night = float(r.rules.child_price * children)

                # Check active booking conflicts for dates
                active_conflicts = db.query(BookingRoom).join(Booking, Booking.id == BookingRoom.booking_id).filter(
                    BookingRoom.room_id == r.id,
                    Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.PENDING, BookingStatus.VERIFIED]),
                    Booking.check_in < end_d,
                    Booking.check_out > start_d
                ).count()

                if active_conflicts >= (r.quantity or 1):
                    continue

                # Room image from room_images or fallback to property image
                r_img = db.query(RoomImage).filter(RoomImage.room_id == r.id).order_by(RoomImage.is_primary.desc()).first()
                prop_img = db.query(PropertyImage).filter(PropertyImage.property_id == p.id).order_by(PropertyImage.is_primary.desc()).first()
                room_image_url = r_img.image_url if r_img else (prop_img.image_url if prop_img else None)

                room_subtotal = float(r.base_price * total_nights)
                child_subtotal = float(child_fee_night * total_nights)
                total_stay_cost = room_subtotal + child_subtotal

                room_amenities = [a.amenity_name for a in r.amenities] if r.amenities else []

                available_room_options.append({
                    "room_id": r.id,
                    "room_name": r.name,
                    "room_type": r.room_type or "Deluxe Room",
                    "description": r.description or f"Spacious {r.name} with premium comfort.",
                    "capacity": r.capacity or 2,
                    "max_adults": (r.rules.maximum_adults if r.rules and r.rules.maximum_adults else r.capacity) or 2,
                    "max_children": (r.rules.maximum_children if r.rules and r.rules.maximum_children else 1) or 0,
                    "price_per_night": float(r.base_price),
                    "total_nights": total_nights,
                    "room_subtotal": room_subtotal,
                    "child_charge_subtotal": child_subtotal,
                    "total_stay_cost": total_stay_cost,
                    "is_suitable_for_group": is_suitable,
                    "unsuitability_reason": reason if not is_suitable else None,
                    "image_url": room_image_url,
                    "amenities": room_amenities
                })

            if not available_room_options:
                continue

            # Sort rooms: suitable first, then price ascending
            available_room_options.sort(key=lambda x: (not x["is_suitable_for_group"], x["total_stay_cost"]))
            selected_rm = available_room_options[0]

            prop_img = db.query(PropertyImage).filter(PropertyImage.property_id == p.id).order_by(PropertyImage.is_primary.desc()).first()
            p_image_url = prop_img.image_url if prop_img else None

            # Review stats
            rev_stats = db.query(
                func.count(Review.id).label("count"),
                func.avg(Review.rating).label("avg_rating")
            ).filter(Review.property_id == p.id).first()
            review_count = rev_stats.count if rev_stats else 0
            avg_rating = round(float(rev_stats.avg_rating), 1) if (rev_stats and rev_stats.avg_rating) else (p.rating or 4.8)

            property_amenities = [a.amenity_name for a in p.amenities] if p.amenities else []

            available_stays.append({
                "property_id": p.id,
                "property_name": p.name,
                "property_type": p.property_type or "Resort",
                "city": p.city,
                "state": p.state,
                "address": p.address,
                "latitude": p.latitude,
                "longitude": p.longitude,
                "image_url": p_image_url,
                "rating": avg_rating,
                "review_count": review_count,
                "amenities": property_amenities,
                "check_in_time": getattr(p, "check_in_time", "14:00") or "14:00",
                "check_out_time": getattr(p, "check_out_time", "11:00") or "11:00",
                "starting_price_per_night": selected_rm["price_per_night"],
                "total_stay_cost": selected_rm["total_stay_cost"],
                "selected_room_id": selected_rm["room_id"],
                "selected_room_name": selected_rm["room_name"],
                "available_rooms": available_room_options
            })

        # Rank stays
        available_stays.sort(key=lambda s: s["total_stay_cost"])
        
        nearby_stays = []
        if not available_stays:
            # Query other verified Indian properties with real geographic coordinates or city locations
            other_props = db.query(Property).filter(
                Property.is_active == True,
                Property.verification_status == PropertyVerificationStatus.VERIFIED.value,
                func.lower(Property.country) == "india"
            ).limit(3).all()

            for op in other_props:
                op_rooms = db.query(Room).filter(Room.property_id == op.id, Room.is_active == True).all()
                if not op_rooms:
                    continue
                op_img = db.query(PropertyImage).filter(PropertyImage.property_id == op.id).order_by(PropertyImage.is_primary.desc()).first()
                nearby_stays.append({
                    "property_id": op.id,
                    "property_name": op.name,
                    "property_type": op.property_type or "Resort",
                    "city": op.city,
                    "state": op.state,
                    "address": op.address,
                    "image_url": op_img.image_url if op_img else None,
                    "starting_price_per_night": float(op_rooms[0].base_price),
                    "total_stay_cost": float(op_rooms[0].base_price * total_nights),
                    "rating": op.rating or 4.8,
                    "distance_km": 15.0
                })

        return {
            "destination": destination,
            "check_in": check_in,
            "check_out": check_out,
            "total_nights": total_nights,
            "adults": adults,
            "children": children,
            "total_travelers": total_travelers,
            "available_stays_count": len(available_stays),
            "available_stays": available_stays,
            "nearby_stays": nearby_stays
        }

    @classmethod
    def calculate_room_configuration(
        cls,
        db: Session,
        property_id: int,
        check_in: str,
        check_out: str,
        adults: int,
        children: int = 0,
        child_ages: Optional[List[int]] = None
    ) -> Dict[str, Any]:
        """
        Calculates valid room configuration & multi-room requirements for large groups.
        """
        child_ages = child_ages or []
        try:
            start_d = date.fromisoformat(check_in)
            end_d = date.fromisoformat(check_out)
        except Exception:
            start_d = date.today() + timedelta(days=10)
            end_d = start_d + timedelta(days=3)
        nights = max(1, (end_d - start_d).days)

        prop = db.query(Property).filter(Property.id == property_id).first()
        if not prop:
            return {"valid": False, "error": "Property not found", "configurations": []}

        rooms = db.query(Room).filter(Room.property_id == property_id, Room.is_active == True).all()
        if not rooms:
            return {"valid": False, "error": "No active rooms available in this property", "configurations": []}

        total_guests = adults + children
        valid_configurations = []

        for r in rooms:
            room_cap = r.capacity or 2
            needed_quantity = max(1, (total_guests + room_cap - 1) // room_cap)

            # Check inventory
            avail_quantity = r.quantity or 1
            active_bookings = db.query(BookingRoom).join(Booking, Booking.id == BookingRoom.booking_id).filter(
                BookingRoom.room_id == r.id,
                Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.PENDING, BookingStatus.VERIFIED]),
                Booking.check_in < end_d,
                Booking.check_out > start_d
            ).count()

            remaining_inventory = max(0, avail_quantity - active_bookings)
            if remaining_inventory < needed_quantity:
                continue

            # Child policy check
            is_suitable, reason = TripPlannerValidationService.check_room_suitability(
                room=r, adults=adults, children=children, child_ages=child_ages
            )

            child_fee_night = 0.0
            if children > 0 and r.rules:
                if r.rules.child_charge_enabled and r.rules.child_charge_amount:
                    child_fee_night = float(r.rules.child_charge_amount * children)
                elif r.rules.child_price:
                    child_fee_night = float(r.rules.child_price * children)

            room_subtotal = float(r.base_price * needed_quantity * nights)
            child_subtotal = float(child_fee_night * nights)
            total_cost = room_subtotal + child_subtotal

            valid_configurations.append({
                "room_id": r.id,
                "room_name": r.name,
                "room_type": r.room_type or "Room",
                "capacity_per_room": room_cap,
                "quantity_required": needed_quantity,
                "price_per_night": float(r.base_price),
                "total_nights": nights,
                "total_accommodation_cost": total_cost,
                "capacity_ok": True,
                "child_policy_ok": is_suitable,
                "unsuitability_reason": reason if not is_suitable else None,
                "availability_ok": True
            })

        return {
            "property_id": property_id,
            "property_name": prop.name,
            "valid": len(valid_configurations) > 0,
            "total_guests": total_guests,
            "adults": adults,
            "children": children,
            "configurations": valid_configurations
        }

    @classmethod
    def search_experiences_for_trip(
        cls,
        db: Session,
        destination: str,
        date_str: Optional[str] = None,
        travelers: int = 2,
        preferences: Optional[List[str]] = None,
        budget: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Searches PostgreSQL for verified, active experiences in the destination.
        """
        query = db.query(Experience).join(Property, Property.id == Experience.property_id).filter(
            Experience.is_active == True,
            Property.is_active == True,
            Property.verification_status == PropertyVerificationStatus.VERIFIED.value,
            or_(
                func.lower(Property.city).contains(destination.lower()),
                func.lower(Property.state).contains(destination.lower()),
                func.lower(Experience.title).contains(destination.lower()),
                func.lower(Experience.experience_type).contains(destination.lower())
            )
        )
        experiences = query.limit(6).all()
        results = []

        for exp in experiences:
            # Check capacity if travelers specified
            max_p = exp.capacity or 10
            if travelers > max_p:
                continue

            price = float(exp.price) if exp.price else 1000.0
            pricing_model = getattr(exp, "pricing_model", "per_person") or "per_person"
            total_exp_cost = price * travelers if pricing_model.lower() == "per_person" else price

            prop_img = db.query(PropertyImage).filter(PropertyImage.property_id == exp.property_id).order_by(PropertyImage.is_primary.desc()).first()
            exp_image = exp.image_url or (prop_img.image_url if prop_img else None)

            results.append({
                "experience_id": exp.id,
                "title": exp.title,
                "category": exp.experience_type or "Outdoor & Nature",
                "description": exp.description or f"Authentic experience in {exp.property.city if exp.property else destination}.",
                "city": exp.property.city if exp.property else destination,
                "state": exp.property.state if exp.property else "India",
                "price": price,
                "pricing_model": pricing_model,
                "participants": travelers,
                "total_cost": total_exp_cost,
                "duration": exp.duration or "2 Hours",
                "max_participants": max_p,
                "image_url": exp_image
            })

        return results

    @classmethod
    def calculate_trip_estimate(
        cls,
        accommodation_total: float,
        experience_total: float,
        budget: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Calculates known VOYARA costs vs target budget and distinguishes unknown personal costs.
        """
        known_total = accommodation_total + experience_total
        budget_status = "NO_BUDGET"
        diff = 0.0

        if budget and budget > 0:
            diff = known_total - budget
            if abs(diff) <= 1500 or diff <= 0:
                budget_status = "WITHIN_BUDGET"
            elif diff <= 4000:
                budget_status = "CLOSE_MATCH"
            else:
                budget_status = "OVER_BUDGET"

        return {
            "accommodation_total": round(accommodation_total, 2),
            "experience_total": round(experience_total, 2),
            "known_total": round(known_total, 2),
            "budget_target": round(budget, 2) if budget else None,
            "budget_difference": round(diff, 2) if budget else 0.0,
            "budget_status": budget_status,
            "unknown_costs": [
                "Local meals & dining (unless provided by stay)",
                "Local taxi & intercity transport",
                "Personal shopping & museum entry tickets"
            ],
            "disclaimer": "This estimate covers your verified Voyara stay and booked experiences. Meals and local transit are paid on-site."
        }

    @classmethod
    def get_destination_places(cls, destination: str) -> List[Dict[str, Any]]:
        """
        Retrieves curated authentic regional attractions and landmark photography.
        """
        return DestinationPlacesService.get_places_for_destination(destination, limit=8)
