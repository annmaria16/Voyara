from datetime import date
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from app.models.property import Property, PropertyImage, PropertyAmenity, PropertyType
from app.models.room import Room, RoomImage, RoomAmenity
from app.models.experience import Experience
from app.models.availability import PropertyAvailability, RoomAvailability
import difflib

# Common travel destination, property type, and amenity typos/synonyms
TYPO_CORRECTIONS = {
    "munar": "munnar",
    "munarr": "munnar",
    "munner": "munnar",
    "munr": "munnar",
    "gao": "goa",
    "goaa": "goa",
    "goan": "goa",
    "manli": "manali",
    "mnli": "manali",
    "manalli": "manali",
    "manaly": "manali",
    "keral": "kerala",
    "kerla": "kerala",
    "kerela": "kerala",
    "udaipr": "udaipur",
    "udaipor": "udaipur",
    "resrot": "resort",
    "resot": "resort",
    "resurt": "resort",
    "vilal": "villa",
    "vila": "villa",
    "villas": "villa",
    "homestya": "homestay",
    "homstey": "homestay",
    "cottag": "cottage",
    "cotage": "cottage",
    "cotages": "cottage",
    "moutain": "mountain",
    "mountan": "mountain",
    "mountian": "mountain",
    "breez": "breeze",
    "vally": "valley",
    "valliy": "valley",
    "bech": "beach",
    "luxry": "luxury",
    "luxery": "luxury",
    "swimin": "swimming",
    "swim": "swimming",
    "campin": "camp",
    "campp": "camp",
    "trekin": "trek",
    "treck": "trek",
    "treking": "trek",
}

def _calculate_fuzzy_match_score(query: str, text: str) -> float:
    """Calculates a normalized fuzzy match similarity score between 0.0 and 1.0."""
    if not query or not text:
        return 0.0
    q = query.lower().strip()
    t = text.lower().strip()

    # 1. Exact match
    if q == t:
        return 1.0

    # 2. Substring or prefix match (alphabet search)
    if q in t:
        return 0.95

    # 3. Typo lookup check
    corrected_q = TYPO_CORRECTIONS.get(q, q)
    if corrected_q in t:
        return 0.90

    # 4. Word-level similarity
    t_words = t.replace(',', ' ').replace('-', ' ').replace('_', ' ').split()
    best_score = 0.0
    for w in t_words:
        if q == w or corrected_q == w:
            return 0.95
        if len(q) >= 3:
            ratio = difflib.SequenceMatcher(None, q, w).ratio()
            corrected_ratio = difflib.SequenceMatcher(None, corrected_q, w).ratio()
            score = max(ratio, corrected_ratio)
            if score > best_score:
                best_score = score

    # 5. Full-phrase sequence similarity
    phrase_ratio = difflib.SequenceMatcher(None, q, t).ratio()
    return max(best_score, phrase_ratio)


class PropertyService:
    @staticmethod
    def create_property(db: Session, provider_id: int, data: PropertyCreate) -> Property:
        normalized_name = data.name.strip()
        normalized_address = data.address.strip()

        # Deduplication & Idempotency: Check if this provider already has an in-flight verification request
        existing_pending = db.query(Property).filter(
            Property.provider_id == provider_id,
            func.lower(Property.name) == normalized_name.lower(),
            Property.verification_status == "PENDING_VERIFICATION"
        ).first()

        if existing_pending:
            # If the property is already PENDING VERIFICATION, do not create another request; show its existing status instead
            return existing_pending

        # Check if the provider is resubmitting a property that needed review or was rejected
        existing_review = db.query(Property).filter(
            Property.provider_id == provider_id,
            func.lower(Property.name) == normalized_name.lower(),
            func.lower(Property.address) == normalized_address.lower(),
            Property.verification_status.in_(["NEEDS_REVIEW", "REJECTED"])
        ).first()

        if existing_review:
            # Update existing property with new data and reset to PENDING_VERIFICATION
            existing_review.name = normalized_name
            existing_review.property_type = data.property_type.value if hasattr(data.property_type, 'value') else str(data.property_type)
            existing_review.description = data.description.strip()
            existing_review.city = data.city.strip()
            existing_review.state = data.state.strip()
            existing_review.country = data.country.strip()
            existing_review.location_details = data.location_details
            existing_review.latitude = data.latitude
            existing_review.longitude = data.longitude
            existing_review.contact_phone = data.contact_phone.strip()
            existing_review.contact_email = data.contact_email.strip()
            existing_review.check_in_time = data.check_in_time
            existing_review.check_out_time = data.check_out_time
            if data.ownership_proof_url:
                existing_review.ownership_proof_url = data.ownership_proof_url
            existing_review.verification_status = "PENDING_VERIFICATION"
            existing_review.reviewed_by = None
            existing_review.reviewed_at = None
            existing_review.is_active = True

            # Re-sync amenities
            if data.amenities is not None:
                db.query(PropertyAmenity).filter(PropertyAmenity.property_id == existing_review.id).delete()
                for am in data.amenities:
                    if am.strip():
                        db.add(PropertyAmenity(property_id=existing_review.id, amenity_name=am.strip()))

            # Re-sync images
            if data.images is not None:
                db.query(PropertyImage).filter(PropertyImage.property_id == existing_review.id).delete()
                for i, img_url in enumerate(data.images):
                    if img_url.strip():
                        db.add(PropertyImage(
                            property_id=existing_review.id,
                            image_url=img_url.strip(),
                            is_primary=(i == 0)
                        ))

            # Re-sync rooms if provided
            if data.rooms:
                for room_data in data.rooms:
                    room = Room(
                        property_id=existing_review.id,
                        name=room_data.name.strip(),
                        room_type=room_data.room_type.strip(),
                        description=room_data.description.strip(),
                        capacity=room_data.capacity,
                        quantity=room_data.quantity,
                        base_price=room_data.base_price,
                        is_active=True
                    )
                    db.add(room)
                    db.flush()

                    if room_data.amenities:
                        for am in room_data.amenities:
                            if am.strip():
                                db.add(RoomAmenity(room_id=room.id, amenity_name=am.strip()))

                    if room_data.images:
                        for idx, r_img in enumerate(room_data.images):
                            if r_img.strip():
                                db.add(RoomImage(
                                    room_id=room.id,
                                    image_url=r_img.strip(),
                                    is_primary=(idx == 0)
                                ))

            db.commit()
            db.refresh(existing_review)

            # Single notification to admins for resubmission
            try:
                from app.services.notifications.notification_service import NotificationService
                from app.models.provider import ProviderProfile
                provider_profile = db.query(ProviderProfile).filter(ProviderProfile.id == provider_id).first()
                host_name = (provider_profile.business_name if provider_profile and provider_profile.business_name else (provider_profile.user.name if provider_profile and provider_profile.user else f"Host #{provider_id}"))
                NotificationService.notify_admins(
                    db=db,
                    title="New Property Verification Request",
                    message=f"New property verification request from {host_name}.",
                    type="PROPERTY_SUBMITTED",
                    link="/admin/properties"
                )
            except Exception as e:
                print("Error broadcasting property resubmission notification to admins:", e)

            return existing_review

        # Create brand new property
        prop = Property(
            provider_id=provider_id,
            name=normalized_name,
            property_type=data.property_type.value if hasattr(data.property_type, 'value') else str(data.property_type),
            description=data.description.strip(),
            address=normalized_address,
            city=data.city.strip(),
            state=data.state.strip(),
            country=data.country.strip(),
            location_details=data.location_details,
            latitude=data.latitude,
            longitude=data.longitude,
            contact_phone=data.contact_phone.strip(),
            contact_email=data.contact_email.strip(),
            check_in_time=data.check_in_time,
            check_out_time=data.check_out_time,
            ownership_proof_url=data.ownership_proof_url,
            verification_status="PENDING_VERIFICATION",
            is_active=True
        )
        db.add(prop)
        db.commit()
        db.refresh(prop)

        # Add amenities
        if data.amenities:
            for amenity_name in data.amenities:
                if amenity_name.strip():
                    db.add(PropertyAmenity(property_id=prop.id, amenity_name=amenity_name.strip()))
        
        # Add images
        if data.images:
            for i, img_url in enumerate(data.images):
                if img_url.strip():
                    db.add(PropertyImage(
                        property_id=prop.id,
                        image_url=img_url.strip(),
                        is_primary=(i == 0)
                    ))

        # Add rooms if provided during property creation
        if data.rooms:
            for room_data in data.rooms:
                room = Room(
                    property_id=prop.id,
                    name=room_data.name.strip(),
                    room_type=room_data.room_type.strip(),
                    description=room_data.description.strip(),
                    capacity=room_data.capacity,
                    quantity=room_data.quantity,
                    base_price=room_data.base_price,
                    is_active=True
                )
                db.add(room)
                db.flush()

                if room_data.amenities:
                    for am in room_data.amenities:
                        if am.strip():
                            db.add(RoomAmenity(room_id=room.id, amenity_name=am.strip()))

                if room_data.images:
                    for idx, r_img in enumerate(room_data.images):
                        if r_img.strip():
                            db.add(RoomImage(
                                room_id=room.id,
                                image_url=r_img.strip(),
                                is_primary=(idx == 0)
                            ))
        db.commit()
        db.refresh(prop)

        # Broadcast exactly one notification to Admins
        try:
            from app.services.notifications.notification_service import NotificationService
            from app.models.provider import ProviderProfile
            provider_profile = db.query(ProviderProfile).filter(ProviderProfile.id == provider_id).first()
            host_name = (provider_profile.business_name if provider_profile and provider_profile.business_name else (provider_profile.user.name if provider_profile and provider_profile.user else f"Host #{provider_id}"))
            NotificationService.notify_admins(
                db=db,
                title="New Property Verification Request",
                message=f"New property verification request from {host_name}.",
                type="PROPERTY_SUBMITTED",
                link="/admin/properties"
            )
        except Exception as e:
            print("Error broadcasting property submission notification to admins:", e)

        return prop

    @staticmethod
    def get_provider_properties(db: Session, provider_id: int) -> List[dict]:
        properties = db.query(Property).filter(Property.provider_id == provider_id).all()
        results = []
        for p in properties:
            min_price = db.query(func.min(Room.base_price)).filter(Room.property_id == p.id, Room.is_active == True).scalar()
            room_count = db.query(Room).filter(Room.property_id == p.id).count()
            experience_count = db.query(Experience).filter(Experience.property_id == p.id).count()
            results.append(PropertyService._format_property(p, min_price, room_count, experience_count))
        return results

    @staticmethod
    def get_property_by_id(db: Session, property_id: int, provider_id: Optional[int] = None) -> Property:
        query = db.query(Property).filter(Property.id == property_id)
        if provider_id is not None:
            query = query.filter(Property.provider_id == provider_id)
        prop = query.first()
        if not prop:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Property not found or you do not have permission to access it.",
            )
        return prop

    @staticmethod
    def update_property(db: Session, property_id: int, provider_id: int, data: PropertyUpdate) -> Property:
        prop = PropertyService.get_property_by_id(db, property_id, provider_id)

        update_dict = data.model_dump(exclude_unset=True)
        # Security: Strip out any unauthorized verification field manipulations
        for secure_field in ["verification_status", "verified_by", "verified_at", "reviewed_by", "reviewed_at"]:
            update_dict.pop(secure_field, None)

        if "property_type" in update_dict and update_dict["property_type"]:
            prop.property_type = update_dict["property_type"].value if hasattr(update_dict["property_type"], 'value') else str(update_dict["property_type"])
            del update_dict["property_type"]
        
        amenities = update_dict.pop("amenities", None)
        images = update_dict.pop("images", None)

        for key, val in update_dict.items():
            setattr(prop, key, val)

        if amenities is not None:
            db.query(PropertyAmenity).filter(PropertyAmenity.property_id == prop.id).delete()
            for am in amenities:
                if am.strip():
                    db.add(PropertyAmenity(property_id=prop.id, amenity_name=am.strip()))

        if images is not None:
            db.query(PropertyImage).filter(PropertyImage.property_id == prop.id).delete()
            for i, img_url in enumerate(images):
                if img_url.strip():
                    db.add(PropertyImage(property_id=prop.id, image_url=img_url.strip(), is_primary=(i == 0)))

        db.commit()
        db.refresh(prop)
        return prop

    @staticmethod
    def delete_property(db: Session, property_id: int, provider_id: int) -> dict:
        prop = PropertyService.get_property_by_id(db, property_id, provider_id)
        db.delete(prop)
        db.commit()
        return {"message": "Property deleted successfully", "success": True}

    @staticmethod
    def search_properties(
        db: Session,
        destination: Optional[str] = None,
        check_in: Optional[date] = None,
        check_out: Optional[date] = None,
        guests: Optional[int] = None,
        property_type: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        amenities: Optional[List[str]] = None,
        experience: Optional[str] = None,
        experience_date: Optional[date] = None,
    ) -> List[dict]:
        # Enforce that only verified and active properties are visible to customers
        query = db.query(Property).filter(
            Property.is_active == True,
            Property.verification_status == "VERIFIED"
        )

        # Property type filter
        if property_type and property_type.strip() and property_type.lower() != "all":
            query = query.filter(Property.property_type.ilike(property_type.strip()))

        properties = query.all()
        scored_properties = []

        clean_dest = destination.strip() if destination else ""

        for p in properties:
            match_score = 1.0

            # Destination / Keyword Matching with Fuzzy & Alphabet support
            if clean_dest:
                experiences_for_p = db.query(Experience).filter(Experience.property_id == p.id, Experience.is_active == True).all()
                amenities_names = [a.amenity_name for a in p.amenities]
                exp_titles = [e.title for e in experiences_for_p] + [e.experience_type for e in experiences_for_p]

                search_targets = [
                    p.name,
                    p.city,
                    p.state,
                    p.country,
                    p.property_type,
                    p.location_details or "",
                    p.description or ""
                ] + amenities_names + exp_titles

                # Calculate best match score across all property targets
                scores = [_calculate_fuzzy_match_score(clean_dest, target) for target in search_targets if target]
                best_score = max(scores) if scores else 0.0

                # Threshold for a match: 0.65 for typos, 0.9+ for alphabet/exact
                if best_score < 0.65:
                    continue
                match_score = best_score

            # Experience search filter if explicitly provided
            if experience and experience.strip():
                clean_exp = experience.strip()
                exp_records = db.query(Experience).filter(Experience.property_id == p.id, Experience.is_active == True).all()
                exp_texts = [e.title for e in exp_records] + [e.experience_type for e in exp_records] + [e.description for e in exp_records]
                exp_scores = [_calculate_fuzzy_match_score(clean_exp, t) for t in exp_texts if t]
                if not exp_scores or max(exp_scores) < 0.60:
                    continue

            # Check property closures if dates provided
            if check_in and check_out:
                closure = db.query(PropertyAvailability).filter(
                    PropertyAvailability.property_id == p.id,
                    PropertyAvailability.is_closed == True,
                    PropertyAvailability.start_date <= check_out,
                    PropertyAvailability.end_date >= check_in
                ).first()
                if closure:
                    continue  # Property is closed for these dates

            # Rooms check
            room_query = db.query(Room).filter(Room.property_id == p.id, Room.is_active == True)
            if guests:
                room_query = room_query.filter(Room.capacity >= guests)
            
            rooms = room_query.all()
            if not rooms and check_in and check_out:
                continue  # No suitable active rooms for specified dates

            # Calculate min price among available rooms
            available_rooms = []
            for r in rooms:
                # Check room availability blocks if dates provided
                if check_in and check_out:
                    blocked = db.query(RoomAvailability).filter(
                        RoomAvailability.room_id == r.id,
                        RoomAvailability.is_blocked == True,
                        RoomAvailability.start_date <= check_out,
                        RoomAvailability.end_date >= check_in
                    ).first()
                    if blocked:
                        continue

                    # Check if all units are booked for these dates
                    booked_qty = db.query(
                        func.coalesce(func.sum(BookingRoom.quantity), 0)
                    ).join(Booking).filter(
                        BookingRoom.room_id == r.id,
                        Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.VERIFIED]),
                        Booking.check_in < check_out,
                        Booking.check_out > check_in
                    ).scalar() or 0
                    if booked_qty >= r.quantity:
                        continue

                available_rooms.append(r)

            if not available_rooms and check_in and check_out:
                continue  # No rooms available for given dates

            prices = [r.base_price for r in (available_rooms if check_in else rooms)]
            min_p = min(prices) if prices else 0.0

            # Price range filter
            if min_price is not None and min_p < min_price:
                continue
            if max_price is not None and min_p > max_price:
                continue

            # Amenities filter
            if amenities:
                prop_amenity_names = {a.amenity_name.lower() for a in p.amenities}
                if not all(am.lower() in prop_amenity_names for am in amenities if am.strip()):
                    continue

            room_count = len(rooms)
            exp_count = db.query(Experience).filter(Experience.property_id == p.id, Experience.is_active == True).count()
            formatted = PropertyService._format_public_property(p, min_p, room_count, exp_count)
            scored_properties.append((match_score, formatted))

        # Sort by relevance score descending
        scored_properties.sort(key=lambda item: item[0], reverse=True)
        return [item[1] for item in scored_properties]

    @staticmethod
    def get_public_property_details(db: Session, property_id: int) -> dict:
        prop = db.query(Property).filter(
            Property.id == property_id,
            Property.is_active == True,
            Property.verification_status == "VERIFIED"
        ).first()
        if not prop:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Property not found or is currently inactive/pending verification.",
            )

        min_price = db.query(func.min(Room.base_price)).filter(Room.property_id == prop.id, Room.is_active == True).scalar() or 0.0
        room_count = db.query(Room).filter(Room.property_id == prop.id, Room.is_active == True).count()
        exp_count = db.query(Experience).filter(Experience.property_id == prop.id, Experience.is_active == True).count()

        data = PropertyService._format_public_property(prop, min_price, room_count, exp_count)
        
        # Add active rooms
        rooms = db.query(Room).filter(Room.property_id == prop.id, Room.is_active == True).all()
        data["rooms"] = [
            {
                "id": r.id,
                "property_id": r.property_id,
                "name": r.name,
                "room_type": r.room_type,
                "description": r.description,
                "capacity": r.capacity,
                "quantity": r.quantity,
                "base_price": r.base_price,
                "is_active": r.is_active,
                "created_at": r.created_at,
                "images": [{"id": img.id, "image_url": img.image_url, "is_primary": img.is_primary} for img in r.images],
                "amenities": [{"id": a.id, "amenity_name": a.amenity_name} for a in r.amenities]
            }
            for r in rooms
        ]

        # Add active experiences
        experiences = db.query(Experience).filter(Experience.property_id == prop.id, Experience.is_active == True).all()
        data["experiences"] = [
            {
                "id": e.id,
                "property_id": e.property_id,
                "title": e.title,
                "experience_type": e.experience_type,
                "description": e.description,
                "price": e.price,
                "pricing_model": e.pricing_model,
                "capacity": e.capacity,
                "duration": e.duration,
                "schedule_type": e.schedule_type,
                "event_date": e.event_date,
                "start_time": e.start_time,
                "end_time": e.end_time,
                "image_url": e.image_url,
                "is_active": e.is_active,
                "schedules": [{"id": s.id, "day_of_week": s.day_of_week, "start_time": s.start_time, "end_time": s.end_time} for s in e.schedules if s.is_active]
            }
            for e in experiences
        ]

        return data

    @staticmethod
    def _format_public_property(p: Property, min_price: float, room_count: int, experience_count: int) -> dict:
        """Format customer-safe property dictionary without confidential ownership documents or internal admin notes."""
        return {
            "id": p.id,
            "provider_id": p.provider_id,
            "name": p.name,
            "property_type": p.property_type,
            "description": p.description,
            "address": p.address,
            "city": p.city,
            "state": p.state,
            "country": p.country,
            "location_details": p.location_details,
            "latitude": p.latitude,
            "longitude": p.longitude,
            "contact_phone": p.contact_phone,
            "contact_email": p.contact_email,
            "check_in_time": p.check_in_time,
            "check_out_time": p.check_out_time,
            "is_active": p.is_active,
            "verification_status": getattr(p, "verification_status", "VERIFIED") or "VERIFIED",
            "rating": p.rating,
            "review_count": p.review_count,
            "featured": p.featured,
            "created_at": p.created_at,
            "min_price": min_price or 0.0,
            "room_count": room_count,
            "experience_count": experience_count,
            "images": [{"id": img.id, "image_url": img.image_url, "caption": img.caption, "is_primary": img.is_primary} for img in p.images],
            "amenities": [{"id": a.id, "amenity_name": a.amenity_name} for a in p.amenities]
        }

    @staticmethod
    def _format_property(p: Property, min_price: float, room_count: int, experience_count: int) -> dict:
        """Format full provider-facing property dictionary."""
        return {
            "id": p.id,
            "provider_id": p.provider_id,
            "name": p.name,
            "property_type": p.property_type,
            "description": p.description,
            "address": p.address,
            "city": p.city,
            "state": p.state,
            "country": p.country,
            "location_details": p.location_details,
            "latitude": p.latitude,
            "longitude": p.longitude,
            "contact_phone": p.contact_phone,
            "contact_email": p.contact_email,
            "check_in_time": p.check_in_time,
            "check_out_time": p.check_out_time,
            "is_active": p.is_active,
            "verification_status": getattr(p, "verification_status", "PENDING_VERIFICATION") or "PENDING_VERIFICATION",
            "ownership_proof_url": getattr(p, "ownership_proof_url", None),
            "verification_reason": getattr(p, "verification_reason", None),
            "verified_by": getattr(p, "verified_by", None),
            "verified_at": getattr(p, "verified_at", None),
            "reviewed_by": getattr(p, "reviewed_by", None),
            "reviewed_at": getattr(p, "reviewed_at", None),
            "rating": p.rating,
            "review_count": p.review_count,
            "featured": p.featured,
            "created_at": p.created_at,
            "min_price": min_price or 0.0,
            "room_count": room_count,
            "experience_count": experience_count,
            "images": [{"id": img.id, "image_url": img.image_url, "caption": img.caption, "is_primary": img.is_primary} for img in p.images],
            "amenities": [{"id": a.id, "amenity_name": a.amenity_name} for a in p.amenities],
            "rooms": [
                {
                    "id": r.id,
                    "property_id": r.property_id,
                    "name": r.name,
                    "room_type": r.room_type,
                    "description": r.description,
                    "capacity": r.capacity,
                    "quantity": r.quantity,
                    "base_price": r.base_price,
                    "is_active": r.is_active,
                    "created_at": r.created_at,
                    "images": [{"id": img.id, "image_url": img.image_url, "is_primary": img.is_primary} for img in r.images],
                    "amenities": [{"id": a.id, "amenity_name": a.amenity_name} for a in r.amenities]
                }
                for r in p.rooms
            ]
        }
