from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class ReviewCreate(BaseModel):
    property_id: Optional[int] = None
    booking_id: int
    rating: float = Field(..., ge=1.0, le=5.0, description="Rating from 1.0 to 5.0")
    cleanliness_rating: Optional[float] = Field(None, ge=1.0, le=5.0)
    staff_rating: Optional[float] = Field(None, ge=1.0, le=5.0)
    location_rating: Optional[float] = Field(None, ge=1.0, le=5.0)
    value_rating: Optional[float] = Field(None, ge=1.0, le=5.0)
    comment: str = Field(..., min_length=5, max_length=2000, description="Review feedback")

class ReviewUserSchema(BaseModel):
    id: int
    name: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True

class ReviewResponse(BaseModel):
    id: int
    property_id: int
    booking_id: int
    user_id: int
    rating: float
    cleanliness_rating: Optional[float] = None
    staff_rating: Optional[float] = None
    location_rating: Optional[float] = None
    value_rating: Optional[float] = None
    comment: str
    created_at: datetime
    user: Optional[ReviewUserSchema] = None

    class Config:
        from_attributes = True

class PropertyReviewsSummary(BaseModel):
    property_id: int
    average_rating: float
    review_count: int
    rating_breakdown: dict
    reviews: List[ReviewResponse] = []
