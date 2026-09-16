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
from app.schemas.booking import BookingResponse, RefundResponse
from app.services.bookings.booking_service import BookingService
from app.routers.provider.properties import router as properties_router
from app.routers.provider.rooms import router as rooms_router
from app.routers.provider.availability import router as availability_router
from app.routers.provider.experiences import router as experiences_router
from app.routers.provider.verinova import router as verinova_router


router = APIRouter(prefix="/provider", tags=["Provider"])

@router.get("/dashboard")
def get_provider_dashboard(
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """Get live provider analytics and financial overview calculated from PostgreSQL."""
    properties = db.query(Property).filter(Property.provider_id == provider.id).all()
    property_ids = [p.id for p in properties]

    total_properties = len(properties)
    active_properties = sum(1 for p in properties if p.is_active)
    total_rooms = db.query(Room).filter(Room.property_id.in_(property_ids)).count() if property_ids else 0
    total_experiences = db.query(Experience).filter(Experience.property_id.in_(property_ids)).count() if property_ids else 0
    
    # Bookings
    bookings = db.query(Booking).filter(Booking.property_id.in_(property_ids)).order_by(Booking.created_at.desc()).all() if property_ids else []
    total_bookings = len(bookings)
    upcoming_bookings = sum(1 for b in bookings if b.status in [BookingStatus.CONFIRMED, BookingStatus.VERIFIED, BookingStatus.PENDING])
    checked_in_bookings = sum(1 for b in bookings if b.status == BookingStatus.CHECKED_IN)
    completed_bookings = sum(1 for b in bookings if b.status == BookingStatus.COMPLETED)
    cancelled_bookings = sum(1 for b in bookings if b.status == BookingStatus.CANCELLED)

    total_gross_volume = sum(b.original_total_amount or b.total_amount for b in bookings if b.status != BookingStatus.FAILED)

    # Finalized earnings = sum of provider_settlement_amount on finalized stays / cancellations
    finalized_earnings = sum(
        b.provider_settlement_amount for b in bookings 
        if b.commission_status == "FINALIZED"
    )

    # Finalized commission = sum of Voyara commission on finalized stays / cancellations
    finalized_commission = sum(
        b.commission_amount for b in bookings
        if b.commission_status == "FINALIZED"
    )

    # Pending settlements = potential provider earnings from confirmed bookings awaiting check-in (90% of total)
    pending_settlements = sum(
        round((b.original_total_amount or b.total_amount) * 0.90, 2)
        for b in bookings
        if b.status in [BookingStatus.CONFIRMED, BookingStatus.VERIFIED, BookingStatus.PENDING] and b.commission_status != "FINALIZED"
    )

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
            "confirmed_bookings": upcoming_bookings,
            "upcoming_bookings": upcoming_bookings,
            "checked_in_bookings": checked_in_bookings,
            "completed_bookings": completed_bookings,
            "cancelled_bookings": cancelled_bookings,
            "total_revenue": round(total_gross_volume, 2),
            "finalized_earnings": round(finalized_earnings, 2),
            "pending_settlements": round(pending_settlements, 2),
            "finalized_commission": round(finalized_commission, 2)
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
                "total_amount": b.original_total_amount or b.total_amount,
                "refund_amount": b.refund_amount,
                "retained_amount": b.retained_amount,
                "commission_amount": b.commission_amount,
                "provider_settlement_amount": b.provider_settlement_amount,
                "commission_status": b.commission_status,
                "payout_status": b.payout_status,
                "status": b.status.value,
                "created_at": b.created_at
            }
            for b in bookings[:8]
        ]
    }

@router.get("/bookings", response_model=List[BookingResponse])
def get_provider_bookings(
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """Get all bookings for properties owned by this provider."""
    return BookingService.get_provider_bookings(db, provider.id)

@router.post("/bookings/{booking_id}/check-in", response_model=BookingResponse)
def check_in_guest(
    booking_id: int,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """Mark a confirmed booking as CHECKED_IN."""
    return BookingService.check_in_booking(db, booking_id, provider.id)

@router.post("/bookings/{booking_id}/check-out", response_model=BookingResponse)
def check_out_guest(
    booking_id: int,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """Mark a checked-in booking as COMPLETED."""
    return BookingService.check_out_booking(db, booking_id, provider.id)

@router.get("/bookings/{booking_id}/refund", response_model=RefundResponse)
def get_provider_booking_refund(
    booking_id: int,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """Get refund breakdown for a cancelled booking owned by this provider."""
    # Ensure provider owns the property of this booking
    booking = BookingService.get_booking_by_id(db, booking_id, provider_id=provider.id)
    return BookingService.get_booking_refund(db, booking.id)

router.include_router(properties_router)
router.include_router(rooms_router)
router.include_router(availability_router)
router.include_router(experiences_router)
router.include_router(verinova_router)

