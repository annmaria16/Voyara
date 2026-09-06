from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_customer
from app.models.user import User
from app.schemas.booking import BookingCreate, BookingResponse
from app.schemas.auth import MessageResponse
from app.services.bookings.booking_service import BookingService

router = APIRouter()

@router.post("/bookings", response_model=BookingResponse)
def create_booking(
    data: BookingCreate,
    current_user: User = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """
    Create and confirm a combined accommodation + experience booking.
    Calculates totals on the server and runs VeriNova transaction verification.
    """
    booking = BookingService.create_booking(db, user_id=current_user.id, data=data)
    return booking

@router.get("/bookings", response_model=List[BookingResponse])
def get_my_bookings(
    current_user: User = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Get all bookings made by the current authenticated customer."""
    return BookingService.get_customer_bookings(db, user_id=current_user.id)

@router.get("/bookings/{booking_id}", response_model=BookingResponse)
def get_booking_details(
    booking_id: int,
    current_user: User = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Get details of a specific booking owned by the customer."""
    return BookingService.get_booking_by_id(db, booking_id=booking_id, user_id=current_user.id)

@router.post("/bookings/{booking_id}/cancel", response_model=MessageResponse)
def cancel_booking(
    booking_id: int,
    current_user: User = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Cancel a booking owned by the customer."""
    return BookingService.cancel_booking(db, booking_id=booking_id, user_id=current_user.id)
