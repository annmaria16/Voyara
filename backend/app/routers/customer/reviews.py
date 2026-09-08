from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.schemas.review import ReviewCreate, ReviewResponse, PropertyReviewsSummary
from app.services.reviews.review_service import ReviewService

router = APIRouter(prefix="/reviews", tags=["Reviews"])

@router.post("", response_model=ReviewResponse)
def submit_review(
    data: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit a verified rating and review for a completed stay."""
    return ReviewService.create_review(db, current_user.id, data)

@router.get("/eligible-bookings")
def get_eligible_bookings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of customer bookings eligible for review."""
    return ReviewService.get_eligible_bookings_for_review(db, current_user.id)

@router.get("/properties/{property_id}", response_model=PropertyReviewsSummary)
def get_property_reviews(
    property_id: int,
    db: Session = Depends(get_db)
):
    """Get public verified customer reviews for a property."""
    return ReviewService.get_property_reviews(db, property_id)
