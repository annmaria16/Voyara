from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr
from app.models.user import UserRole

class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    phone: Optional[str] = None
    role: UserRole
    is_active: bool
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
    created_at: datetime
    user: Optional[UserResponse] = None

    class Config:
        from_attributes = True

class ProviderProfileUpdate(BaseModel):
    business_name: Optional[str] = None
    description: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
