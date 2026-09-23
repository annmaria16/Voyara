from typing import List, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, cast, String
from app.models.property import Property
from app.models.booking import Booking
from app.models.user import User
from app.models.provider import ProviderProfile
from app.models.verification import VerificationResult


class AdminSearchService:
    @staticmethod
    def search(db: Session, query: str) -> List[Dict[str, Any]]:
        """
        Role-specific search for Voyara Control Center (Admin).
        Searches platform-wide data:
          1. Users (Travelers, Stay Partners, Admins, Business Names)
          2. Properties (All Stays, Verification Status)
          3. Bookings (All Platform Bookings)
          4. Verifications (VeriNova integrity audits)
        """
        if not query or not query.strip():
            return []

        q = query.strip()
        q_lower = q.lower()
        search_pattern = f"%{q}%"

        results: List[Dict[str, Any]] = []
        seen_user_ids = set()

        # 1. Platform-wide Users (including Stay Partner Business Names)
        matching_users = (
            db.query(User)
            .outerjoin(ProviderProfile, ProviderProfile.user_id == User.id)
            .filter(
                or_(
                    User.name.ilike(search_pattern),
                    User.email.ilike(search_pattern),
                    User.phone.ilike(search_pattern),
                    cast(User.role, String).ilike(search_pattern),
                    ProviderProfile.business_name.ilike(search_pattern),
                    ProviderProfile.contact_email.ilike(search_pattern)
                )
            )
            .options(joinedload(User.provider_profile))
            .limit(8)
            .all()
        )

        for u in matching_users:
            if u.id in seen_user_ids:
                continue
            seen_user_ids.add(u.id)

            role_val = u.role.value if hasattr(u.role, 'value') else str(u.role)
            status_val = u.account_status.value if hasattr(u.account_status, 'value') else str(u.account_status)

            role_label = (
                "Traveler"
                if role_val == "CUSTOMER"
                else ("Stay Partner" if role_val == "PROVIDER" else "Administrator")
            )
            biz_prefix = f" [{u.provider_profile.business_name}]" if u.provider_profile and u.provider_profile.business_name else ""
            
            results.append({
                "id": u.id,
                "type": "USER",
                "badge": "USER",
                "title": f"{u.name}{biz_prefix}",
                "subtitle": f"{u.email} • {role_label} • Status: {status_val}",
                "image_url": u.avatar_url,
                "route": "/admin/users",
                "action_label": "Manage User",
                "details": {
                    "role": role_val,
                    "account_status": status_val,
                    "business_name": u.provider_profile.business_name if u.provider_profile else None
                }
            })

        # 2. Platform-wide Properties
        matching_props = (
            db.query(Property)
            .filter(
                or_(
                    Property.name.ilike(search_pattern),
                    Property.city.ilike(search_pattern),
                    Property.state.ilike(search_pattern),
                    Property.verification_status.ilike(search_pattern),
                    Property.property_type.ilike(search_pattern)
                )
            )
            .options(joinedload(Property.images))
            .limit(8)
            .all()
        )

        for p in matching_props:
            img = p.images[0].image_url if p.images else None
            results.append({
                "id": p.id,
                "type": "PROPERTY",
                "badge": "PROPERTY",
                "title": p.name,
                "subtitle": f"{p.city}, {p.state} • {p.property_type} • Status: {p.verification_status} • Trust: {p.trust_score}",
                "image_url": img,
                "route": "/admin/properties",
                "action_label": "Review Property",
                "details": {
                    "verification_status": p.verification_status,
                    "trust_score": p.trust_score
                }
            })

        # 3. Platform-wide Bookings
        matching_bookings = (
            db.query(Booking)
            .filter(
                or_(
                    Booking.booking_number.ilike(search_pattern),
                    Booking.user.has(User.name.ilike(search_pattern)),
                    Booking.property.has(Property.name.ilike(search_pattern))
                )
            )
            .options(joinedload(Booking.property), joinedload(Booking.user))
            .order_by(Booking.created_at.desc())
            .limit(8)
            .all()
        )

        for b in matching_bookings:
            guest_name = b.user.name if b.user else "User"
            prop_name = b.property.name if b.property else "Property"
            status_val = b.status.value if hasattr(b.status, 'value') else str(b.status)
            results.append({
                "id": b.id,
                "type": "BOOKING",
                "badge": "BOOKING",
                "title": f"Booking #{b.booking_number}",
                "subtitle": f"{guest_name} @ {prop_name} • {status_val} • ₹{int(b.total_amount)}",
                "image_url": None,
                "route": "/admin/bookings",
                "action_label": "View Booking",
                "details": {
                    "status": status_val,
                    "total_amount": b.total_amount
                }
            })

        return results
