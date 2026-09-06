from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_user
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
    GoogleAuthResponse
)
from app.schemas.user import UserResponse, UserUpdate, ChangePasswordRequest
from app.services.auth.auth_service import AuthService

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

@router.post("/logout", response_model=MessageResponse)
def logout(current_user: User = Depends(get_current_user)):
    """Log out currently authenticated user."""
    return {"message": "Logged out successfully", "success": True}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Get profile of current authenticated user."""
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
