from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_user, get_optional_user
from app.models.user import User
from app.schemas.auth import (
    RegisterRequest,
    RegisterResponse,
    LoginRequest,
    TokenResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    MessageResponse,
    GoogleAuthRequest,
    GoogleAuthResponse,
    SendPhoneOtpRequest,
    VerifyPhoneOtpRequest,
    PhoneOtpResponse,
    SendEmailVerificationRequest,
    VerifyEmailRequest,
    EmailVerificationResponse,
)
from app.schemas.user import UserResponse, UserUpdate, ChangePasswordRequest
from app.services.auth.auth_service import AuthService
from app.services.auth.otp_service import OtpService

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=RegisterResponse)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new Traveler (Customer) or Host (Provider) account."""
    return AuthService.register(db, data)

@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    """Log in with email and password to receive a JWT access token."""
    return AuthService.login(db, data)

@router.post("/google", response_model=GoogleAuthResponse)
def google_auth(data: GoogleAuthRequest, db: Session = Depends(get_db)):
    """Authenticate or register a user using verified Google ID token."""
    return AuthService.google_auth(db, data)

# Phone OTP Endpoints
@router.post("/phone/send-otp", response_model=PhoneOtpResponse)
def send_phone_otp(
    data: SendPhoneOtpRequest,
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Generate and send 6-digit phone verification OTP."""
    user_id = current_user.id if current_user else None
    return OtpService.send_phone_otp(db, phone=data.phone, user_id=user_id)

@router.post("/phone/resend-otp", response_model=PhoneOtpResponse)
def resend_phone_otp(
    data: SendPhoneOtpRequest,
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Resend 6-digit phone verification OTP respecting cooldown."""
    user_id = current_user.id if current_user else None
    return OtpService.send_phone_otp(db, phone=data.phone, user_id=user_id)

@router.post("/phone/verify-otp", response_model=PhoneOtpResponse)
def verify_phone_otp(
    data: VerifyPhoneOtpRequest,
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Verify 6-digit phone OTP and mark phone as verified in database."""
    user_id = current_user.id if current_user else None
    return OtpService.verify_phone_otp(db, phone=data.phone, otp=data.otp, user_id=user_id)

# Email Verification Endpoints
@router.post("/email/send-verification", response_model=EmailVerificationResponse)
def send_email_verification(
    data: SendEmailVerificationRequest,
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Send email verification code to user email address."""
    user_id = current_user.id if current_user else None
    return OtpService.send_email_verification(db, email=data.email, user_id=user_id)

@router.post("/email/verify", response_model=EmailVerificationResponse)
def verify_email(
    data: VerifyEmailRequest,
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Verify email verification code and mark email as verified."""
    user_id = current_user.id if current_user else None
    return OtpService.verify_email(db, email=data.email, code=data.code, user_id=user_id)

@router.post("/logout", response_model=MessageResponse)
def logout(current_user: User = Depends(get_current_user)):
    """Log out currently authenticated user."""
    return {"message": "Logged out successfully", "success": True}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Get profile of current authenticated user with verification and account status."""
    return current_user

@router.put("/profile", response_model=UserResponse)
def update_profile(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update profile information (name, avatar, bio, preferences)."""
    return AuthService.update_profile(db, current_user, data)

@router.post("/change-password", response_model=MessageResponse)
def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change account password for currently authenticated user."""
    return AuthService.change_password(db, current_user, data.current_password, data.new_password)

@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Initiate password reset process."""
    return AuthService.forgot_password(db, data.email)

@router.post("/reset-password", response_model=MessageResponse)
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password using a valid reset token."""
    return AuthService.reset_password(db, data.token, data.new_password)
