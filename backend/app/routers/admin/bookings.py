from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_admin
from app.models.user import User
from app.schemas.booking import BookingResponse
from app.services.bookings.booking_service import BookingService

router = APIRouter()

@router.get("/bookings", response_model=List[BookingResponse])
def get_all_bookings(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin endpoint to list all platform bookings."""
    return BookingService.get_all_bookings(db)
