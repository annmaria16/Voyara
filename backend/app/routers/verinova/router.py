from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.booking import Booking
from app.services.verinova.verification_service import VeriNovaService
from app.schemas.verification import VeriNovaInspectionDetail

router = APIRouter(prefix="/verinova", tags=["VeriNova Verification"])

@router.post("/verify/{booking_id}")
def run_transaction_verification(booking_id: int, db: Session = Depends(get_db)):
    """
    Triggers VeriNova transaction verification engine on a booking.
    Verifies property status, room availability, price integrity, experience capacity, and date consistency.
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking transaction not found.")
    
    VeriNovaService.verify_booking_transaction(db, booking)
    return VeriNovaService.get_verification_details(db, booking_id)

@router.get("/results/{booking_id}")
def get_verification_result(booking_id: int, db: Session = Depends(get_db)):
    """Retrieve detailed VeriNova verification checks and status for a booking."""
    details = VeriNovaService.get_verification_details(db, booking_id)
    if not details:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Verification record not found.")
    return details
