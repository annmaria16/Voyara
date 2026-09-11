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
    phone: Optional[str] = None
    phone_verified: bool = False
    email_verified: bool = False
    verification_required: bool = False

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

# Phone OTP Schemas
class SendPhoneOtpRequest(BaseModel):
    phone: str

class VerifyPhoneOtpRequest(BaseModel):
    phone: str
    otp: str

class PhoneOtpResponse(BaseModel):
    message: str
    success: bool = True
    phone: str
    phone_verified: Optional[bool] = False
    expires_in_seconds: Optional[int] = 600
    cooldown_seconds: Optional[int] = 30
    already_verified: Optional[bool] = False

# Email Verification Schemas
class SendEmailVerificationRequest(BaseModel):
    email: EmailStr

class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str

class EmailVerificationResponse(BaseModel):
    message: str
    success: bool = True
    email: str
    email_verified: Optional[bool] = True
    phone_verified: Optional[bool] = False
    is_fully_verified: Optional[bool] = False
    already_verified: Optional[bool] = False

# Admin Account Safety Schemas
class UserSuspensionRequest(BaseModel):
    reason: str

class UserDeactivationRequest(BaseModel):
    reason: Optional[str] = None

class UserAccountActionResponse(BaseModel):
    message: str
    success: bool = True
    user_id: int
    account_status: str
    is_active: bool
    reason: Optional[str] = None
