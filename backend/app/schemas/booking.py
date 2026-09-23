from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel
from app.models.booking import BookingStatus
from app.schemas.property import PropertyResponse
from app.schemas.user import UserResponse
from app.schemas.payment import PaymentResponse
from app.schemas.stayguide import BookingRuleSnapshotResponse
from app.schemas.review import ReviewResponse

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
    adults: Optional[int] = 1
    children: Optional[int] = 0
    child_ages: Optional[List[int]] = []
    cot_count: Optional[int] = 0
    extra_bed_count: Optional[int] = 0
    rules_accepted: bool = False
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
    retained_amount: float = 0.0
    commission_amount: float = 0.0
    provider_settlement_amount: float = 0.0
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
    original_total_amount: Optional[float] = None
    free_cancellation_deadline: str
    cancellation_deadline_str: Optional[str] = None
    is_free_cancellation: bool
    refund_percentage: float
    refund_amount: float
    cancellation_fee: float = 0.0
    retained_amount: float = 0.0
    commission_percentage: float = 10.0
    commission_amount: float = 0.0
    provider_settlement_amount: float = 0.0
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
    adults: Optional[int] = 1
    children: Optional[int] = 0
    child_ages: Optional[List[int]] = []
    cot_count: Optional[int] = 0
    extra_bed_count: Optional[int] = 0
    room_total: float
    experience_total: float
    total_amount: float
    original_total_amount: Optional[float] = None
    commission_percentage_snapshot: Optional[float] = 10.0
    cancellation_refund_percentage_snapshot: Optional[float] = 50.0
    refund_amount: Optional[float] = 0.0
    retained_amount: Optional[float] = 0.0
    commission_amount: Optional[float] = 0.0
    provider_settlement_amount: Optional[float] = 0.0
    commission_status: Optional[str] = "NOT_FINALIZED"
    refund_status: Optional[str] = "NOT_APPLICABLE"
    payout_status: Optional[str] = "NOT_READY"
    status: BookingStatus
    customer_notes: Optional[str] = None
    guest_information_message_snapshot: Optional[str] = None
    guest_information_message: Optional[str] = None
    cancellation_policy_snapshot: Optional[str] = None
    refund_percentage_snapshot: Optional[float] = None
    cancelled_at: Optional[datetime] = None
    cancellation_reason: Optional[str] = None
    cancellation_processed_at: Optional[datetime] = None
    checked_in_at: Optional[datetime] = None
    checked_out_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    checkin_reminder_sent: Optional[bool] = False
    checkin_reminder: Optional[dict] = None
    is_cancellable: Optional[bool] = None
    cancellation_deadline_str: Optional[str] = None
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
    review: Optional[ReviewResponse] = None
    rule_snapshot: Optional[BookingRuleSnapshotResponse] = None

    class Config:
        from_attributes = True


