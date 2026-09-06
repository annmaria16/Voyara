from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from app.models.verification import VerificationStatus, CheckStatus

class VerificationCheckResponse(BaseModel):
    id: Optional[int] = None
    check_category: str  # "PROPERTY", "ROOM", "EXPERIENCE", "PRICE", "BOOKING"
    check_name: str
    status: CheckStatus
    message: str
    details: Optional[str] = None

    class Config:
        from_attributes = True

class VerificationResultResponse(BaseModel):
    id: int
    booking_id: int
    status: VerificationStatus
    summary: str
    failure_reasons: Optional[str] = None
    verified_at: datetime
    checks: List[VerificationCheckResponse] = []

    class Config:
        from_attributes = True

class VeriNovaInspectionDetail(BaseModel):
    booking_id: int
    booking_number: str
    customer_name: str
    customer_email: str
    property_name: str
    property_type: str
    room_name: str
    check_in: str
    check_out: str
    experience_title: Optional[str] = None
    total_amount: float
    verification_status: VerificationStatus
    summary: str
    verified_at: datetime
    checks: List[VerificationCheckResponse] = []
