from datetime import date
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from app.models.property import Property, PropertyImage, PropertyAmenity, PropertyType, PropertyRule
from app.models.room import Room, RoomImage, RoomAmenity, RoomRule
from app.models.experience import Experience
from app.models.availability import PropertyAvailability, RoomAvailability
from app.models.provider import ProviderProfile
from app.models.user import User
from app.models.booking import Booking, BookingStatus, BookingRoom
from app.schemas.property import PropertyCreate, PropertyUpdate
from app.services.verinova.property_trust_service import PropertyTrustService
from app.services.verinova.fingerprint_service import FingerprintService
from app.services.verinova.duplicate_detection_service import DuplicateDetectionService
from app.services.notifications.notification_service import NotificationService
from app.services.ai.stayguide_service import StayGuideService
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
        if len(q) >= 3 and len(w) >= 3:
            ratio = difflib.SequenceMatcher(None, q, w).ratio()
            corrected_ratio = difflib.SequenceMatcher(None, corrected_q, w).ratio()
            score = max(ratio, corrected_ratio)
            if score >= 0.80 and score > best_score:
                best_score = score

    # 5. Full-phrase sequence similarity (for multi-word typo match)
    if len(q) >= 4:
        phrase_ratio = difflib.SequenceMatcher(None, q, t).ratio()
        if phrase_ratio >= 0.80:
            return max(best_score, phrase_ratio)

    return best_score


class PropertyService:
    @staticmethod
    def create_property(db: Session, provider_id: int, data: PropertyCreate) -> Property:
        # Enforce India-only validation
        country_norm = (data.country or "").strip().lower()
        if country_norm not in ["india", "in", "bharat"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Voyara only supports properties located within the Republic of India."
            )

        if data.latitude is not None and data.longitude is not None:
            try:
                lat = float(data.latitude)
                lng = float(data.longitude)
                if not ((6.5 <= lat <= 37.5) and (68.0 <= lng <= 97.5)):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="GPS coordinates must be located within India territorial boundaries (Lat 6.5°-37.5°, Lng 68.0°-97.5°)."
                    )
            except (ValueError, TypeError):
                pass

        normalized_name = data.name.strip()
        normalized_address = data.address.strip()

        # Deduplication & Idempotency: Check if this specific property is already pending
        existing_pending = db.query(Property).filter(
            Property.provider_id == provider_id,
            func.lower(Property.name) == normalized_name.lower(),
            func.lower(Property.city) == data.city.strip().lower(),
            func.lower(Property.address) == normalized_address.lower(),
            Property.verification_status == "PENDING_VERIFICATION"
        ).first()

        if existing_pending:
            return existing_pending

        # Check for duplicate property listings across platform
        dup_result = DuplicateDetectionService.evaluate_property_duplicates(
            db=db,
            candidate_property_id=None,
            name=normalized_name,
            address=normalized_address,
            city=data.city.strip(),
            state=data.state.strip(),
            pincode=None,
            latitude=data.latitude,
            longitude=data.longitude,
            contact_phone=data.contact_phone.strip() if data.contact_phone else None,
            contact_email=data.contact_email.strip() if data.contact_email else None
        )

        initial_status = "NEEDS_REVIEW" if dup_result.get("duplicate_detected") else "PENDING_VERIFICATION"
        initial_reason = "Possible duplicate property detected. Administrative review required." if dup_result.get("duplicate_detected") else None

        # Check if provider is resubmitting an existing property
        existing_review = db.query(Property).filter(
            Property.provider_id == provider_id,
            func.lower(Property.name) == normalized_name.lower(),
            func.lower(Property.city) == data.city.strip().lower(),
            func.lower(Property.address) == normalized_address.lower(),
            Property.verification_status.in_(["NEEDS_REVIEW", "REJECTED"])
        ).first()

        if existing_review:
            existing_review.name = normalized_name
            existing_review.property_type = data.property_type.value if hasattr(data.property_type, 'value') else str(data.property_type)
            existing_review.description = data.description.strip()
            existing_review.city = data.city.strip()
            existing_review.state = data.state.strip()
            existing_review.country = "India"
            existing_review.location_details = data.location_details
            existing_review.latitude = data.latitude
            existing_review.longitude = data.longitude
            existing_review.contact_phone = data.contact_phone.strip()
            existing_review.contact_email = data.contact_email.strip()
            existing_review.check_in_time = data.check_in_time
            existing_review.check_out_time = data.check_out_time
            existing_review.verification_status = initial_status
            existing_review.verification_reason = initial_reason
            existing_review.reviewed_by = None
            existing_review.reviewed_at = None
            existing_review.is_active = False

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
                provider_profile = db.query(ProviderProfile).filter(ProviderProfile.id == provider_id).first()
                host_name = (provider_profile.business_name if provider_profile and provider_profile.business_name else (provider_profile.user.name if provider_profile and provider_profile.user else f"Host #{provider_id}"))
                NotificationService.notify_admins(
                    db=db,
                    title="Property Submitted for Review",
                    message=f"Property '{existing_review.name}' submitted by {host_name} ({initial_status}).",
                    type="PROPERTY_SUBMITTED",
                    link="/admin/properties"
                )
            except Exception as e:
                print("Error broadcasting property resubmission notification to admins:", e)

            # Re-run VeriNova deterministic assessment
            try:
                PropertyTrustService.assess_property(
                    db=db,
                    property_id=existing_review.id,
                    actor_id=provider_profile.user_id if provider_profile else None,
                    actor_role="PROVIDER"
                )
            except Exception as assess_err:
                print("VeriNova assessment error on resubmission:", assess_err)

            return existing_review

        # Create brand new property (starts as PENDING_VERIFICATION / NEEDS_REVIEW, is_active=False until Admin approves)
        prop = Property(
            provider_id=provider_id,
            name=normalized_name,
            property_type=data.property_type.value if hasattr(data.property_type, 'value') else str(data.property_type),
            description=data.description.strip(),
            address=normalized_address,
            city=data.city.strip(),
            state=data.state.strip(),
            country="India",
            location_details=data.location_details,
            latitude=data.latitude,
            longitude=data.longitude,
            contact_phone=data.contact_phone.strip(),
            contact_email=data.contact_email.strip(),
            check_in_time=data.check_in_time,
            check_out_time=data.check_out_time,
            verification_status=initial_status,
            verification_reason=initial_reason,
            is_active=False
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

        # Add property home rules if provided or instantiate defaults
        if data.home_rules:
            rules_dict = data.home_rules.model_dump()
            db.add(PropertyRule(property_id=prop.id, **rules_dict))
        else:
            StayGuideService.get_or_create_property_rules(db, prop.id)

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

                if room_data.rules:
                    r_rules_dict = room_data.rules.model_dump()
                    db.add(RoomRule(room_id=room.id, **r_rules_dict))
                else:
                    StayGuideService.get_or_create_room_rules(db, room.id)

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


        # Add experiences if provided during property creation
        if data.experiences:
            for exp_data in data.experiences:
                exp = Experience(
                    property_id=prop.id,
                    title=exp_data.title.strip(),
                    experience_type=exp_data.experience_type.strip(),
                    description=exp_data.description.strip(),
                    price=exp_data.price,
                    pricing_model=exp_data.pricing_model,
                    capacity=exp_data.capacity,
                    duration=exp_data.duration,
                    schedule_type=exp_data.schedule_type or "recurring",
                    event_date=exp_data.event_date,
                    start_time=exp_data.start_time or "09:00",
                    end_time=exp_data.end_time or "12:00",
                    image_url=exp_data.image_url,
                    is_active=True
                )
                db.add(exp)

        db.commit()
        db.refresh(prop)

        # Trigger VeriNova Assessment
        try:
            provider_profile = db.query(ProviderProfile).filter(ProviderProfile.id == provider_id).first()
            PropertyTrustService.assess_property(
                db=db,
                property_id=prop.id,
                actor_id=provider_profile.user_id if provider_profile else None,
                actor_role="PROVIDER"
            )
        except Exception as assess_err:
            print("VeriNova assessment error on creation:", assess_err)

        # Broadcast exactly one notification to Admins
        try:
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
        properties = db.query(Property).filter(Property.provider_id == provider_id).order_by(Property.created_at.desc()).all()
        results = []
        for p in properties:
            min_price = db.query(func.min(Room.base_price)).filter(Room.property_id == p.id, Room.is_active == True).scalar()
            room_count = db.query(Room).filter(Room.property_id == p.id).count()
            total_units = db.query(func.coalesce(func.sum(Room.quantity), 0)).filter(Room.property_id == p.id).scalar() or 0
            experience_count = db.query(Experience).filter(Experience.property_id == p.id).count()
            results.append(PropertyService._format_property(p, min_price, room_count, experience_count, total_units=int(total_units)))
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
        is_already_verified = (prop.verification_status == "VERIFIED")

        update_dict = data.model_dump(exclude_unset=True)
        # Security: Strip out any unauthorized verification field manipulations
        for secure_field in ["verification_status", "verified_by", "verified_at", "reviewed_by", "reviewed_at"]:
            update_dict.pop(secure_field, None)

        # POST-APPROVAL LOCATION LOCKDOWN:
        # If property is already VERIFIED, location is permanently locked. Discard any location changes.
        if is_already_verified:
            for loc_field in ["country", "state", "city", "pincode", "address", "location_details", "latitude", "longitude"]:
                update_dict.pop(loc_field, None)

        if "property_type" in update_dict and update_dict["property_type"]:
            prop.property_type = update_dict["property_type"].value if hasattr(update_dict["property_type"], 'value') else str(update_dict["property_type"])
            del update_dict["property_type"]
        
        amenities = update_dict.pop("amenities", None)
        images = update_dict.pop("images", None)
        home_rules_data = update_dict.pop("home_rules", None)

        for key, val in update_dict.items():
            setattr(prop, key, val)

        if home_rules_data is not None:
            hr = prop.home_rules
            if not hr:
                hr = PropertyRule(property_id=prop.id)
                db.add(hr)
            hr_dict = home_rules_data if isinstance(home_rules_data, dict) else (home_rules_data.model_dump(exclude_unset=True) if hasattr(home_rules_data, 'model_dump') else {})
            for hk, hv in hr_dict.items():
                setattr(hr, hk, hv)

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

        # If already verified, ensure property stays VERIFIED + ACTIVE
        if is_already_verified:
            prop.verification_status = "VERIFIED"
            prop.is_active = True


        db.commit()
        db.refresh(prop)

        # Update fingerprint for auditability without altering verification status
        new_fingerprint = FingerprintService.generate_property_fingerprint(
            name=prop.name,
            address=prop.address,
            city=prop.city,
            state=prop.state,
            latitude=prop.latitude,
            longitude=prop.longitude
        )
        prop.property_identity_fingerprint = new_fingerprint
        db.commit()

        # Re-assess with VeriNova engine
        try:
            PropertyTrustService.assess_property(
                db=db,
                property_id=prop.id,
                actor_id=prop.provider.user_id if prop.provider else None,
                actor_role="PROVIDER"
            )
        except Exception as assess_err:
            print("VeriNova re-assessment error on update:", assess_err)

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
        host: Optional[str] = None,
        property_name: Optional[str] = None,
        experience: Optional[str] = None,
        experience_date: Optional[date] = None,
    ) -> List[dict]:
        # Enforce that only verified and active Indian properties are visible to customers
        query = db.query(Property).join(Property.provider).filter(
            Property.is_active == True,
            Property.verification_status == "VERIFIED",
            or_(Property.country.ilike("India"), Property.country == "India")
        )

        # Property type filter
        if property_type and property_type.strip() and property_type.lower() != "all":
            query = query.filter(Property.property_type.ilike(property_type.strip()))

        # Explicit Host filter
        if host and host.strip():
            clean_host = f"%{host.strip().lower()}%"
            query = query.join(ProviderProfile.user).filter(
                or_(
                    func.lower(ProviderProfile.business_name).like(clean_host),
                    func.lower(User.name).like(clean_host)
                )
            )

        # Explicit Property Name filter
        if property_name and property_name.strip():
            clean_pname = f"%{property_name.strip().lower()}%"
            query = query.filter(func.lower(Property.name).like(clean_pname))

        properties = query.all()
        scored_properties = []

        clean_dest = destination.strip() if destination else ""

        for p in properties:
            match_score = 1.0

            # Destination / Keyword Matching with Fuzzy, Host Brand, & Multi-target support
            if clean_dest:
                experiences_for_p = db.query(Experience).filter(Experience.property_id == p.id, Experience.is_active == True).all()
                amenities_names = [a.amenity_name for a in p.amenities]
                exp_titles = [e.title for e in experiences_for_p] + [e.experience_type for e in experiences_for_p]

                host_brand = p.provider.business_name if p.provider and p.provider.business_name else ""
                host_user_name = p.provider.user.name if p.provider and p.provider.user else ""

                search_targets = [
                    p.name,
                    host_brand,
                    host_user_name,
                    p.city,
                    p.state,
                    p.country,
                    p.property_type,
                    p.address or "",
                    p.location_details or "",
                ] + amenities_names + exp_titles

                # Calculate best match score across primary property targets
                scores = [_calculate_fuzzy_match_score(clean_dest, target) for target in search_targets if target]
                
                # Check description substring match
                if p.description and clean_dest.lower() in p.description.lower():
                    scores.append(0.85)

                best_score = max(scores) if scores else 0.0

                # Threshold for a match: 0.80+ for typos, 0.90+ for dict/typos, 0.95+ for substring/alphabet, 1.0 for exact
                if best_score < 0.80:
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

            candidate_rooms = available_rooms if (check_in and check_out) else rooms
            if not candidate_rooms:
                continue  # No rooms available for given dates

            # Price range filter: property must have at least one active/available room within the price range
            if min_price is not None or max_price is not None:
                rooms_in_price_range = [
                    r for r in candidate_rooms
                    if (min_price is None or r.base_price >= min_price)
                    and (max_price is None or r.base_price <= max_price)
                ]
                if not rooms_in_price_range:
                    continue

            prices = [r.base_price for r in candidate_rooms]
            min_p = min(prices) if prices else 0.0

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
            Property.verification_status == "VERIFIED",
            or_(Property.country.ilike("India"), Property.country == "India")
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
                "amenities": [{"id": a.id, "amenity_name": a.amenity_name} for a in r.amenities],
                "rules": StayGuideService.serialize_room_rules(r.rules, r) if r.rules else None
            }
            for r in rooms
        ]
        data["home_rules"] = StayGuideService.serialize_property_rules(prop.home_rules) if prop.home_rules else None

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
        host_brand = p.provider.business_name if p.provider and p.provider.business_name else (p.provider.user.name if p.provider and p.provider.user else "Verified Host")
        return {
            "id": p.id,
            "provider_id": p.provider_id,
            "host_name": host_brand,
            "provider_business_name": p.provider.business_name if p.provider else None,
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
            "guest_information_message": p.guest_information_message,
            "is_active": p.is_active,
            "verification_status": getattr(p, "verification_status", "VERIFIED") or "VERIFIED",
            "trust_score": getattr(p, "trust_score", 0) or 0,
            "trust_assessment_status": getattr(p, "trust_assessment_status", None),
            "property_identity_fingerprint": getattr(p, "property_identity_fingerprint", None),
            "rating": p.rating,
            "review_count": p.review_count,
            "featured": p.featured,
            "created_at": p.created_at,
            "min_price": min_price or 0.0,
            "room_count": room_count,
            "experience_count": experience_count,
            "images": [{"id": img.id, "image_url": img.image_url, "caption": img.caption, "is_primary": img.is_primary} for img in p.images],
            "amenities": [{"id": a.id, "amenity_name": a.amenity_name} for a in p.amenities],
            "home_rules": StayGuideService.serialize_property_rules(p.home_rules) if getattr(p, 'home_rules', None) else None
        }

    @staticmethod
    def _format_property(p: Property, min_price: float, room_count: int, experience_count: int, total_units: Optional[int] = None) -> dict:
        """Format full provider-facing property dictionary."""
        units = total_units if total_units is not None else sum(r.quantity for r in p.rooms)
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
            "guest_information_message": p.guest_information_message,
            "is_active": p.is_active,
            "verification_status": getattr(p, "verification_status", "PENDING_VERIFICATION") or "PENDING_VERIFICATION",
            "ownership_proof_url": getattr(p, "ownership_proof_url", None),
            "verification_reason": getattr(p, "verification_reason", None),
            "trust_score": getattr(p, "trust_score", 0) or 0,
            "trust_assessment_status": getattr(p, "trust_assessment_status", None),
            "evidence_status": getattr(p, "evidence_status", None),
            "property_identity_fingerprint": getattr(p, "property_identity_fingerprint", None),
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
            "room_types_count": room_count,
            "total_units": units,
            "experience_count": experience_count,
            "images": [{"id": img.id, "image_url": img.image_url, "caption": img.caption, "is_primary": img.is_primary} for img in p.images],
            "amenities": [{"id": a.id, "amenity_name": a.amenity_name} for a in p.amenities],
            "home_rules": StayGuideService.serialize_property_rules(p.home_rules) if getattr(p, 'home_rules', None) else None,
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
                    "amenities": [{"id": a.id, "amenity_name": a.amenity_name} for a in r.amenities],
                    "rules": StayGuideService.serialize_room_rules(r.rules, r) if getattr(r, 'rules', None) else None
                }
                for r in p.rooms
            ]
        }


