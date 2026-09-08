from typing import Optional
from pydantic import BaseModel, EmailStr
from app.models.user import UserRole

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: str
    role: UserRole = UserRole.CUSTOMER
    business_name: Optional[str] = None

class RegisterResponse(BaseModel):
    message: str
    success: bool = True
    email: str
    role: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class MessageResponse(BaseModel):
    message: str
    success: bool = True

class GoogleAuthRequest(BaseModel):
    credential: Optional[str] = None
    id_token: Optional[str] = None
    role: Optional[UserRole] = None
    phone: Optional[str] = None
    business_name: Optional[str] = None

class GoogleAuthResponse(BaseModel):
    access_token: Optional[str] = None
    token_type: str = "bearer"
    user: Optional[dict] = None
    needs_onboarding: bool = False
    google_data: Optional[dict] = None
    message: Optional[str] = None

