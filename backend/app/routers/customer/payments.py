from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app.auth.dependencies import get_current_customer
from app.models.user import User
from app.schemas.booking import BookingResponse
from app.schemas.payment import (
    PaymentOrderCreate,
    PaymentOrderResponse,
    PaymentVerifyRequest,
    PaymentFailureRequest,
    PaymentConfigResponse
)
from app.services.payment.razorpay_service import RazorpayService

router = APIRouter()

@router.get("/payments/config", response_model=PaymentConfigResponse)
def get_payment_config():
    """Get public Razorpay configuration for frontend checkout."""
    return PaymentConfigResponse(
        key_id=settings.RAZORPAY_KEY_ID,
        currency="INR",
        company_name=settings.PROJECT_NAME,
        theme_color="#F97360"
    )

@router.post("/payments/create-order", response_model=PaymentOrderResponse)
def create_payment_order(
    data: PaymentOrderCreate,
    current_user: User = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """
    Initialize a booking reservation and generate a signed Razorpay Order.
    Enforces row-level database inventory locks and strict server-side price computation.
    """
    return RazorpayService.create_payment_order(db, user=current_user, data=data)

@router.post("/payments/verify", response_model=BookingResponse)
def verify_payment(
    data: PaymentVerifyRequest,
    current_user: User = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """
    Verify the cryptographic HMAC-SHA256 signature returned by Razorpay Checkout.
    Transitions booking status to CONFIRMED and runs VeriNova transaction verification audits.
    """
    booking = RazorpayService.verify_payment(db, user=current_user, data=data)
    return booking

@router.post("/payments/failure")
def record_payment_failure(
    data: PaymentFailureRequest,
    current_user: User = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Log a payment failure or user dismissal."""
    return RazorpayService.record_failure(db, user=current_user, data=data)

@router.get("/payments/{booking_id}")
def get_payment_details(
    booking_id: int,
    current_user: User = Depends(get_current_customer),
    db: Session = Depends(get_db)
):
    """Get detailed payment transaction status and receipt information for a booking."""
    return RazorpayService.get_payment_details(db, booking_id=booking_id, user=current_user)
