from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_admin
from app.models.user import User
from app.schemas.booking import BookingResponse, RefundResponse
from app.services.bookings.booking_service import BookingService

router = APIRouter()

@router.get("/bookings", response_model=List[BookingResponse])
def get_all_bookings(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin endpoint to list all platform bookings."""
    return BookingService.get_all_bookings(db)

@router.get("/bookings/{booking_id}/refund", response_model=RefundResponse)
def get_admin_booking_refund(
    booking_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin endpoint to fetch refund breakdown and audit details for any booking."""
    return BookingService.get_booking_refund(db, booking_id)

