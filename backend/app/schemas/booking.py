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

class RefundResponse(BaseModel):
    id: int
    booking_id: int
    refund_reference: str
    refund_amount: float
    refund_percentage: float
    cancellation_fee: float = 0.0
    refund_status: str
    refund_reason: Optional[str] = None
    requested_at: datetime
    processed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class CancellationPreviewResponse(BaseModel):
    booking_id: int
    booking_number: str
    property_id: int
    property_name: str
    check_in: date
    check_in_time: str = "14:00"
    booking_amount: float
    free_cancellation_deadline: str
    is_free_cancellation: bool
    refund_percentage: float
    refund_amount: float
    cancellation_fee: float
    policy_description: str
    can_cancel: bool = True
    reason: Optional[str] = None

class CancellationRequest(BaseModel):
    reason: Optional[str] = "Customer requested cancellation"

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
    guest_information_message_snapshot: Optional[str] = None
    guest_information_message: Optional[str] = None
    cancellation_policy_snapshot: Optional[str] = None
    refund_percentage_snapshot: Optional[float] = None
    cancelled_at: Optional[datetime] = None
    cancellation_reason: Optional[str] = None
    checked_in_at: Optional[datetime] = None
    checked_out_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    checkin_reminder_sent: Optional[bool] = False
    checkin_reminder: Optional[dict] = None
    created_at: datetime
    user: Optional[UserResponse] = None
    property: Optional[PropertyResponse] = None
    booking_rooms: List[BookingRoomItemResponse] = []
    booking_experiences: List[BookingExperienceItemResponse] = []
    verification_status: Optional[str] = None
    verinova_verification_id: Optional[str] = None
    verinova_score: Optional[int] = 100
    verinova_status: Optional[str] = "VERIFIED"
    verinova_verified_at: Optional[datetime] = None
    payment: Optional[PaymentResponse] = None
    refund: Optional[RefundResponse] = None

    class Config:
        from_attributes = True

