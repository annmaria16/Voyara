from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_admin
from app.models.user import User
from app.models.booking import Booking
from app.models.verification import VerificationResult, VerificationStatus
from app.services.verinova.verification_service import VeriNovaService
from app.schemas.verification import VeriNovaInspectionDetail, VerificationResultResponse

router = APIRouter()

@router.get("/verification")
def list_verification_records(
    verification_status: Optional[str] = Query(None, description="Filter: VERIFIED, NEEDS_REVIEW, FAILED"),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Admin Verification Center: List all booking transaction verification audits.
    """
    query = db.query(Booking).order_by(Booking.created_at.desc())
    bookings = query.all()
    
    results = []
    for b in bookings:
        details = VeriNovaService.get_verification_details(db, b.id)
        if details:
            if verification_status and verification_status.upper() != "ALL":
                if details["verification_status"] != verification_status.upper():
                    continue
            results.append(details)
            
    return results

@router.get("/verification/{booking_id}")
def get_booking_verification_audit(
    booking_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Deep inspection of an individual booking's VeriNova check-by-check audit trail."""
    details = VeriNovaService.get_verification_details(db, booking_id)
    if not details:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking or verification record not found.")
    return details
