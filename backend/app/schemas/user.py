from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr
from app.models.user import UserRole

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    role: UserRole
    is_active: bool
    account_status: Optional[str] = "ACTIVE"
    phone_verified: Optional[bool] = False
    phone_verified_at: Optional[datetime] = None
    email_verified: Optional[bool] = False
    email_verified_at: Optional[datetime] = None
    suspended_at: Optional[datetime] = None
    suspension_reason: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    preferred_currency: Optional[str] = "INR"
    preferred_language: Optional[str] = "English"
    travel_styles: Optional[str] = None
    auth_provider: Optional[str] = "local"
    created_at: datetime

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    preferred_currency: Optional[str] = None
    preferred_language: Optional[str] = None
    travel_styles: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class ProviderProfileResponse(BaseModel):
    id: int
    user_id: int
    business_name: Optional[str] = None
    description: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    verification_status: str
    phone_verified: Optional[bool] = False
    email_verified: Optional[bool] = False
    is_fully_verified: Optional[bool] = False
    created_at: datetime
    user: Optional[UserResponse] = None

    class Config:
        from_attributes = True

class ProviderProfileUpdate(BaseModel):
    business_name: Optional[str] = None
    description: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None

# Host Trust Response
class HostTrustResponse(BaseModel):
    host_id: int
    host_name: str
    phone_verified: bool
    phone_verified_at: Optional[datetime] = None
    email_verified: bool
    email_verified_at: Optional[datetime] = None
    host_verification_status: str  # FULLY_VERIFIED, PHONE_VERIFIED, EMAIL_VERIFIED, UNVERIFIED
    profile_completeness_pct: int
    account_status: str
    is_new_host: bool
    platform_history_label: str  # "Established Host" or "New Host – Limited Platform History"
    total_properties: int
    verified_properties: int
    completed_bookings: int
    average_trust_score: int
    trust_tier: str  # HIGH TRUST, MEDIUM TRUST, LOW TRUST, HIGH RISK
    properties_trust: List[Dict[str, Any]] = []
