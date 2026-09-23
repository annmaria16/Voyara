from typing import List, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from app.models.property import Property
from app.models.room import Room
from app.models.experience import Experience
from app.models.booking import Booking
from app.models.review import Review
from app.models.user import User


class ProviderSearchService:
    @staticmethod
    def search(db: Session, provider_id: int, query: str) -> List[Dict[str, Any]]:
        """
        Role-specific search for Stay Partners.
        Strictly enforces provider ownership: only queries data belonging to the authenticated provider.
        Searches across:
          1. Properties (Name, City, State, Type)
          2. Rooms (Name, Room Type)
          3. Experiences (Title, Experience Type)
          4. Bookings / Reservations (Booking Number, Guest Name)
          5. Reviews (Comment text, Property name)
          6. Availability / Quick Management shortcuts
        """
        if not query or not query.strip():
            return []

        q = query.strip()
        q_lower = q.lower()
        search_pattern = f"%{q}%"

        results: List[Dict[str, Any]] = []

        # 1. Fetch all properties owned by this provider
        owned_properties = (
            db.query(Property)
            .filter(Property.provider_id == provider_id)
            .options(joinedload(Property.images), joinedload(Property.rooms), joinedload(Property.experiences))
            .all()
        )
        owned_property_ids = [p.id for p in owned_properties]

        # 2. Check Management / Quick Action Keywords
        if any(kw in q_lower for kw in ["calendar", "availability", "blackout", "closure", "dates", "occupancy"]):
            results.append({
                "id": "avail-mgmt",
                "type": "AVAILABILITY",
                "badge": "AVAILABILITY",
                "title": "Manage Property Calendars & Blackouts",
                "subtitle": "Open independent property calendars, configure room unit blocks & full closures",
                "route": "/provider/availability",
                "action_label": "Open Calendar",
                "property_id": owned_property_ids[0] if owned_property_ids else None,
                "property_name": owned_properties[0].name if owned_properties else ""
            })

        if any(kw in q_lower for kw in ["add property", "new property", "create property", "list stay", "add place"]):
            results.append({
                "id": "add-prop-quick",
                "type": "QUICK_ACTION",
                "badge": "ACTION",
                "title": "Add New Stay / Property",
                "subtitle": "Register a new homestay, villa, cottage, or resort on Voyara",
                "route": "/provider/properties/new",
                "action_label": "Add Property",
                "property_id": None,
                "property_name": ""
            })

        if any(kw in q_lower for kw in ["my place", "my stays", "properties", "all stays"]):
            results.append({
                "id": "my-places-quick",
                "type": "QUICK_ACTION",
                "badge": "MANAGEMENT",
                "title": "My Places & Properties",
                "subtitle": "View and manage your entire portfolio of listed stays",
                "route": "/provider/properties",
                "action_label": "View All Stays",
                "property_id": None,
                "property_name": ""
            })

        if not owned_property_ids:
            return results

        # 3. Match Properties owned by this provider
        for prop in owned_properties:
            match_name = q_lower in prop.name.lower()
            match_city = prop.city and q_lower in prop.city.lower()
            match_state = prop.state and q_lower in prop.state.lower()
            match_type = prop.property_type and q_lower in prop.property_type.lower()
            match_address = prop.address and q_lower in prop.address.lower()

            if match_name or match_city or match_state or match_type or match_address:
                img_url = prop.images[0].image_url if prop.images else None
                room_count = len(prop.rooms)
                exp_count = len(prop.experiences)
                
                results.append({
                    "id": prop.id,
                    "type": "PROPERTY",
                    "badge": "PROPERTY",
                    "title": prop.name,
                    "subtitle": f"{prop.city}, {prop.state} • {prop.property_type} • {room_count} Room Type{'s' if room_count != 1 else ''}",
                    "image_url": img_url,
                    "route": "/provider/properties",
                    "action_label": "Manage Property",
                    "property_id": prop.id,
                    "property_name": prop.name,
                    "details": {
                        "rooms_count": room_count,
                        "experiences_count": exp_count,
                        "rating": prop.rating,
                        "review_count": prop.review_count,
                        "verification_status": prop.verification_status,
                    },
                    "sub_actions": [
                        {"label": "Manage Property", "route": "/provider/properties"},
                        {"label": "View Rooms", "route": "/provider/rooms"},
                        {"label": "View Availability", "route": "/provider/availability"},
                        {"label": "View Experiences", "route": "/provider/experiences"},
                        {"label": "View Reservations", "route": "/provider/bookings"},
                        {"label": "View Reviews", "route": "/provider/reviews"}
                    ]
                })

        # 4. Match Rooms in owned properties
        matching_rooms = (
            db.query(Room)
            .filter(
                Room.property_id.in_(owned_property_ids),
                or_(
                    Room.name.ilike(search_pattern),
                    Room.room_type.ilike(search_pattern),
                    Room.description.ilike(search_pattern)
                )
            )
            .options(joinedload(Room.property), joinedload(Room.images))
            .limit(10)
            .all()
        )

        for room in matching_rooms:
            room_img = room.images[0].image_url if room.images else None
            prop_name = room.property.name if room.property else "Your Stay"
            results.append({
                "id": room.id,
                "type": "ROOM",
                "badge": "ROOM",
                "title": room.name,
                "subtitle": f"{room.room_type} • {prop_name} • Max {room.capacity} Guests • ₹{int(room.base_price)}/night",
                "image_url": room_img,
                "route": "/provider/rooms",
                "action_label": "Manage Room",
                "property_id": room.property_id,
                "property_name": prop_name
            })

        # 5. Match Experiences in owned properties
        matching_experiences = (
            db.query(Experience)
            .filter(
                Experience.property_id.in_(owned_property_ids),
                or_(
                    Experience.title.ilike(search_pattern),
                    Experience.experience_type.ilike(search_pattern),
                    Experience.description.ilike(search_pattern)
                )
            )
            .options(joinedload(Experience.property))
            .limit(10)
            .all()
        )

        for exp in matching_experiences:
            prop_name = exp.property.name if exp.property else "Your Stay"
            results.append({
                "id": exp.id,
                "type": "EXPERIENCE",
                "badge": "EXPERIENCE",
                "title": exp.title,
                "subtitle": f"{exp.experience_type} • {prop_name} • ₹{int(exp.price)} ({exp.pricing_model})",
                "image_url": exp.image_url,
                "route": "/provider/experiences",
                "action_label": "Manage Experience",
                "property_id": exp.property_id,
                "property_name": prop_name
            })

        # 6. Match Bookings / Reservations for owned properties
        matching_bookings = (
            db.query(Booking)
            .filter(
                Booking.property_id.in_(owned_property_ids),
                or_(
                    Booking.booking_number.ilike(search_pattern),
                    Booking.user.has(User.name.ilike(search_pattern)),
                    Booking.user.has(User.email.ilike(search_pattern)),
                    Booking.user.has(User.phone.ilike(search_pattern))
                )
            )
            .options(joinedload(Booking.property), joinedload(Booking.user))
            .order_by(Booking.created_at.desc())
            .limit(10)
            .all()
        )

        for b in matching_bookings:
            guest_name = b.user.name if b.user else "Traveler Guest"
            prop_name = b.property.name if b.property else "Your Stay"
            status_val = b.status.value if hasattr(b.status, 'value') else str(b.status)
            results.append({
                "id": b.id,
                "type": "BOOKING",
                "badge": "BOOKING",
                "title": f"Booking #{b.booking_number}",
                "subtitle": f"Guest: {guest_name} • {prop_name} • {b.check_in} to {b.check_out} • {status_val}",
                "image_url": None,
                "route": "/provider/bookings",
                "action_label": "View Reservation",
                "property_id": b.property_id,
                "property_name": prop_name,
                "status": status_val
            })

        # 7. Match Reviews for owned properties
        matching_reviews = (
            db.query(Review)
            .filter(
                Review.property_id.in_(owned_property_ids),
                Review.comment.ilike(search_pattern)
            )
            .options(joinedload(Review.property), joinedload(Review.user))
            .order_by(Review.created_at.desc())
            .limit(5)
            .all()
        )

        for rev in matching_reviews:
            prop_name = rev.property.name if rev.property else "Your Stay"
            comment_excerpt = rev.comment[:80] + ("..." if len(rev.comment) > 80 else "")
            guest_name = rev.user.name if rev.user else "Guest"
            rating_val = float(rev.rating) if rev.rating is not None else 5.0
            results.append({
                "id": rev.id,
                "type": "REVIEW",
                "badge": "REVIEW",
                "title": f"Guest Review: ★ {rating_val:.1f} by {guest_name}",
                "subtitle": f"\"{comment_excerpt}\" • {prop_name}",
                "image_url": None,
                "route": "/provider/reviews",
                "action_label": "View Reviews",
                "property_id": rev.property_id,
                "property_name": prop_name,
                "rating": rating_val
            })

        return results
