from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel
from app.models.booking import BookingStatus
from app.schemas.property import PropertyResponse
from app.schemas.user import UserResponse
from app.schemas.payment import PaymentResponse

class BookingRoomItemResponse(BaseModel):
    id: int
    room_id: int
    room_name: str
    nightly_price: float
    nights: int
    quantity: int = 1
    guests: int
    subtotal: float

    class Config:
        from_attributes = True

class BookingExperienceItemResponse(BaseModel):
    id: int
    experience_id: int
    experience_title: str
    price: float
    pricing_model: str
    participants: int
    subtotal: float
    scheduled_date: date

    class Config:
        from_attributes = True

class BookingCreate(BaseModel):
    property_id: int
    room_id: int
    check_in: date
    check_out: date
    total_guests: int = 1
    room_quantity: int = 1
    experience_id: Optional[int] = None
    experience_participants: Optional[int] = 0
    experience_date: Optional[date] = None
    customer_notes: Optional[str] = None

class BookingResponse(BaseModel):
    id: int
    booking_number: str
    user_id: int
    property_id: int
    check_in: date
    check_out: date
    total_nights: int
    total_guests: int
    room_total: float
    experience_total: float
    total_amount: float
    status: BookingStatus
    customer_notes: Optional[str] = None
    created_at: datetime
    user: Optional[UserResponse] = None
    property: Optional[PropertyResponse] = None
    booking_rooms: List[BookingRoomItemResponse] = []
    booking_experiences: List[BookingExperienceItemResponse] = []
    verification_status: Optional[str] = None
    payment: Optional[PaymentResponse] = None

    class Config:
        from_attributes = True
