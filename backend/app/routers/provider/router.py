from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.auth.dependencies import get_current_provider
from app.models.provider import ProviderProfile
from app.models.property import Property
from app.models.room import Room
from app.models.experience import Experience
from app.models.booking import Booking, BookingStatus
from app.schemas.booking import BookingResponse
from app.services.bookings.booking_service import BookingService
from app.routers.provider.properties import router as properties_router
from app.routers.provider.rooms import router as rooms_router
from app.routers.provider.availability import router as availability_router
from app.routers.provider.experiences import router as experiences_router

router = APIRouter(prefix="/provider", tags=["Provider"])

@router.get("/dashboard")
def get_provider_dashboard(
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """Get live provider analytics and overview."""
    properties = db.query(Property).filter(Property.provider_id == provider.id).all()
    property_ids = [p.id for p in properties]

    total_properties = len(properties)
    active_properties = sum(1 for p in properties if p.is_active)
    total_rooms = db.query(Room).filter(Room.property_id.in_(property_ids)).count() if property_ids else 0
    total_experiences = db.query(Experience).filter(Experience.property_id.in_(property_ids)).count() if property_ids else 0
    
    # Bookings
    bookings = db.query(Booking).filter(Booking.property_id.in_(property_ids)).order_by(Booking.created_at.desc()).all() if property_ids else []
    total_bookings = len(bookings)
    confirmed_bookings = sum(1 for b in bookings if b.status in [BookingStatus.CONFIRMED, BookingStatus.VERIFIED])
    total_revenue = sum(b.total_amount for b in bookings if b.status in [BookingStatus.CONFIRMED, BookingStatus.VERIFIED])

    return {
        "provider": {
            "id": provider.id,
            "business_name": provider.business_name,
            "contact_phone": provider.contact_phone,
            "contact_email": provider.contact_email,
            "verification_status": provider.verification_status
        },
        "stats": {
            "total_properties": total_properties,
            "active_properties": active_properties,
            "total_rooms": total_rooms,
            "total_experiences": total_experiences,
            "total_bookings": total_bookings,
            "confirmed_bookings": confirmed_bookings,
            "total_revenue": round(total_revenue, 2)
        },
        "recent_bookings": [
            {
                "id": b.id,
                "booking_number": b.booking_number,
                "customer_name": b.user.name if b.user else "Guest",
                "property_name": b.property.name if b.property else "",
                "room_name": b.booking_rooms[0].room_name if b.booking_rooms else "Stay",
                "check_in": b.check_in,
                "check_out": b.check_out,
                "total_amount": b.total_amount,
                "status": b.status.value,
                "created_at": b.created_at
            }
            for b in bookings[:5]
        ]
    }

@router.get("/bookings", response_model=List[BookingResponse])
def get_provider_bookings(
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """Get all bookings for properties owned by this provider."""
    return BookingService.get_provider_bookings(db, provider.id)

router.include_router(properties_router)
router.include_router(rooms_router)
router.include_router(availability_router)
router.include_router(experiences_router)
