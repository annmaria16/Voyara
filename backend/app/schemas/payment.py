from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel
from app.models.payment import PaymentStatus

class PaymentOrderCreate(BaseModel):
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

class PaymentOrderResponse(BaseModel):
    order_id: str
    amount: float
    amount_paise: int
    currency: str = "INR"
    key_id: str
    booking_id: int
    booking_number: str
    property_name: str
    room_name: str
    nights: int
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None

class PaymentVerifyRequest(BaseModel):
    booking_id: int
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    payment_method: Optional[str] = None

class PaymentFailureRequest(BaseModel):
    booking_id: int
    razorpay_order_id: str
    error_code: Optional[str] = None
    error_description: Optional[str] = None

class PaymentResponse(BaseModel):
    id: int
    booking_id: int
    user_id: int
    razorpay_order_id: str
    razorpay_payment_id: Optional[str] = None
    amount: float
    currency: str
    status: PaymentStatus
    payment_method: Optional[str] = None
    receipt: str
    created_at: datetime

    class Config:
        from_attributes = True

class PaymentConfigResponse(BaseModel):
    key_id: str
    currency: str = "INR"
    company_name: str = "Voyara"
    theme_color: str = "#F97360"
