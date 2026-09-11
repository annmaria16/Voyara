from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_customer
from app.models.user import User
from app.schemas.booking import (
    BookingCreate,
    BookingResponse,
    CancellationPreviewResponse,
    CancellationRequest,
    RefundResponse,
)
from app.schemas.review import ReviewCreate, ReviewResponse
from app.schemas.auth import MessageResponse
from app.services.bookings.booking_service import BookingService
from app.services.reviews.review_service import ReviewService
from app.services.reminders.reminder_service import ReminderService

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

@router.get("/bookings/{booking_id}/cancellation-preview", response_model=CancellationPreviewResponse)
def get_cancellation_preview(
    booking_id: int,
    current_user: User = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Get server-calculated cancellation eligibility, policy deadline, refund amount, and fees."""
    return BookingService.get_cancellation_preview(db, booking_id=booking_id, user_id=current_user.id)

@router.post("/bookings/{booking_id}/cancel", response_model=BookingResponse)
def cancel_booking(
    booking_id: int,
    data: Optional[CancellationRequest] = None,
    current_user: User = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """
    Cancel a booking owned by the customer.
    Executes atomic state transition, VeriNova verification, creates Refund record, and releases room inventory.
    """
    reason = data.reason if data else None
    return BookingService.cancel_booking(db, booking_id=booking_id, user_id=current_user.id, reason=reason)

@router.get("/bookings/{booking_id}/refund", response_model=RefundResponse)
def get_booking_refund(
    booking_id: int,
    current_user: User = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Get refund and payment transaction details for a cancelled booking."""
    return BookingService.get_booking_refund(db, booking_id=booking_id, user_id=current_user.id)

@router.get("/bookings/{booking_id}/review-eligibility")
def get_booking_review_eligibility(
    booking_id: int,
    current_user: User = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Check if the completed booking is eligible for a customer review."""
    return ReviewService.get_booking_review_eligibility(db, booking_id=booking_id, user_id=current_user.id)

@router.post("/bookings/{booking_id}/review", response_model=ReviewResponse)
def submit_booking_review(
    booking_id: int,
    data: ReviewCreate,
    current_user: User = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Submit a verified rating and review for a completed stay."""
    data.booking_id = booking_id
    return ReviewService.create_review(db, user_id=current_user.id, data=data)

@router.post("/reminders/process")
def process_checkin_reminders(db: Session = Depends(get_db)):
    """
    Process one-day-before check-in reminders for confirmed bookings in Asia/Kolkata timezone.
    Idempotent: Prevents duplicate notifications.
    """
    return ReminderService.process_checkin_reminders(db)

