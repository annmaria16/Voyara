import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from app.config import settings
from app.models.user import User, UserRole
from app.models.provider import ProviderProfile
from app.schemas.auth import RegisterRequest, LoginRequest, GoogleAuthRequest
from app.schemas.user import UserUpdate
from app.auth.password import hash_password, verify_password
from app.auth.jwt import create_access_token

def validate_password_strength(password: str) -> None:
    """Validate that password meets all security requirements."""
    if len(password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
        )
    if not re.search(r"[A-Z]", password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one uppercase letter."
        )
    if not re.search(r"[a-z]", password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one lowercase letter."
        )
    if not re.search(r"[0-9]", password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one number."
        )
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>\-_=+\[\]\/\\~`';]", password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one special character."
        )

def normalize_phone(phone: str) -> str:
    """Clean and validate canonical international phone number."""
    if not phone or not phone.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please enter a valid phone number."
        )
    cleaned = re.sub(r"[\s\-\(\)\.]", "", phone.strip())
    if not cleaned.startswith("+"):
        if cleaned.isdigit():
            cleaned = "+" + cleaned
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please enter a valid international phone number with country code."
            )
    digits_only = cleaned.lstrip("+")
    if not digits_only.isdigit() or len(digits_only) < 7 or len(digits_only) > 15:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please enter a valid phone number."
        )
    if len(set(digits_only)) == 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please enter a valid phone number."
        )
    return cleaned

class AuthService:
    @staticmethod
    def register(db: Session, data: RegisterRequest) -> dict:
        name_clean = data.name.strip()
        if len(name_clean) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please enter your full name."
            )

        email_clean = data.email.lower().strip()
        phone_clean = normalize_phone(data.phone)

        # Validate password complexity
        validate_password_strength(data.password)

        # Check unique email
        existing_email = db.query(User).filter(User.email == email_clean).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This email is already registered. Please sign in or use another email."
            )

        # Check unique phone
        existing_phone = db.query(User).filter(User.phone == phone_clean).first()
        if existing_phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This phone number is already registered. Please sign in or use another phone number."
            )

        # Security: Do not allow public registration as ADMIN
        role = data.role
        if role == UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Administrator accounts cannot be created via public registration."
            )

        user = User(
            email=email_clean,
            name=name_clean,
            phone=phone_clean,
            hashed_password=hash_password(data.password),
            role=role,
            is_active=True
        )
        db.add(user)

        try:
            db.commit()
            db.refresh(user)
        except IntegrityError as e:
            db.rollback()
            err_str = str(e.orig).lower()
            if "email" in err_str:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This email is already registered. Please sign in or use another email."
                )
            elif "phone" in err_str:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This phone number is already registered. Please sign in or use another phone number."
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="An account with these details already exists."
                )

        # If provider, create associated provider profile
        if role == UserRole.PROVIDER:
            provider_profile = ProviderProfile(
                user_id=user.id,
                business_name=data.business_name.strip() if data.business_name else f"{user.name} Stays",
                contact_phone=user.phone,
                contact_email=user.email,
                verification_status="VERIFIED"
            )
            db.add(provider_profile)
            try:
                db.commit()
            except Exception:
                db.rollback()

        return {
            "message": "Your Voyara account has been created successfully. Please sign in to continue.",
            "success": True,
            "email": user.email,
            "role": user.role.value
        }

    @staticmethod
    def login(db: Session, data: LoginRequest) -> dict:
        email_clean = data.email.lower().strip()
        user = db.query(User).filter(User.email == email_clean).first()
        if not user or not verify_password(data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password.",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account is currently unavailable. Please contact support.",
            )

        token = create_access_token(data={"sub": str(user.id), "email": user.email, "role": user.role.value})

        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "phone": user.phone,
                "role": user.role.value,
                "is_active": user.is_active
            }
        }

    @staticmethod
    def forgot_password(db: Session, email: str) -> dict:
        email_clean = email.lower().strip()
        user = db.query(User).filter(User.email == email_clean).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="This email address is not registered with Voyara. Please check your email or create an account."
            )

        token = secrets.token_urlsafe(32)
        user.reset_token = token
        user.reset_token_expiry = datetime.now(timezone.utc) + timedelta(hours=1)
        db.commit()

        return {
            "message": f"Password reset instructions have been generated for {user.email}.",
            "reset_token": token,
            "success": True
        }

    @staticmethod
    def reset_password(db: Session, token: str, new_password: str) -> dict:
        user = db.query(User).filter(User.reset_token == token).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This password reset link is invalid or has expired.",
            )

        if user.reset_token_expiry and user.reset_token_expiry < datetime.now(timezone.utc).replace(tzinfo=None):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This password reset link is invalid or has expired.",
            )

        validate_password_strength(new_password)

        user.hashed_password = hash_password(new_password)
        user.reset_token = None
        user.reset_token_expiry = None
        db.commit()

        return {
            "message": "Your password has been reset successfully.",
            "success": True
        }

    @staticmethod
    def verify_google_token(token_str: str) -> dict:
        if not token_str or not token_str.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google credential token is missing."
            )
        try:
            req = google_requests.Request()
            client_id = settings.GOOGLE_CLIENT_ID if hasattr(settings, 'GOOGLE_CLIENT_ID') and settings.GOOGLE_CLIENT_ID else None
            id_info = id_token.verify_oauth2_token(token_str.strip(), req, audience=client_id)
            if id_info.get("iss") not in ["accounts.google.com", "https://accounts.google.com"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid Google token issuer."
                )
            return id_info
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Google token verification failed: {str(e)}"
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google identity verification failed. Please try again."
            )

    @staticmethod
    def google_auth(db: Session, data: GoogleAuthRequest) -> dict:
        raw_token = data.credential or data.id_token
        if not raw_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google credential is required."
            )

        id_info = AuthService.verify_google_token(raw_token)
        google_sub = id_info.get("sub")
        email = id_info.get("email", "").lower().strip()
        name = id_info.get("name") or id_info.get("given_name") or (email.split("@")[0] if email else "Traveler")
        picture = id_info.get("picture")

        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google account did not provide an email address."
            )

        # 1. Look for existing user by google_sub first, then by email
        user = None
        if google_sub:
            user = db.query(User).filter(User.google_sub == google_sub).first()
        if not user:
            user = db.query(User).filter(User.email == email).first()

        # 2. Existing user found
        if user:
            if not user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Your account is currently unavailable. Please contact support."
                )

            # Safely link Google identity if not already linked
            if not user.google_sub and google_sub:
                user.google_sub = google_sub
                if getattr(user, "auth_provider", None) in [None, "local"]:
                    user.auth_provider = "google"
                db.commit()
                db.refresh(user)

            token = create_access_token(data={"sub": str(user.id), "email": user.email, "role": user.role.value})
            return {
                "access_token": token,
                "token_type": "bearer",
                "needs_onboarding": False,
                "user": {
                    "id": user.id,
                    "name": user.name,
                    "email": user.email,
                    "phone": user.phone,
                    "role": user.role.value,
                    "is_active": user.is_active
                }
            }

        # 3. New user - Check if role & phone onboarding details are provided
        if not data.role or not data.phone:
            return {
                "needs_onboarding": True,
                "access_token": None,
                "google_data": {
                    "sub": google_sub,
                    "email": email,
                    "name": name,
                    "picture": picture
                },
                "message": "Please select whether you are a Traveler or Host and provide your phone number to complete setup."
            }

        # Validate role (Google signup can ONLY create CUSTOMER or PROVIDER)
        if data.role not in [UserRole.CUSTOMER, UserRole.PROVIDER]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google signup only supports Traveler or Host accounts."
            )

        phone_clean = normalize_phone(data.phone)

        # Check phone uniqueness in PostgreSQL
        existing_phone = db.query(User).filter(User.phone == phone_clean).first()
        if existing_phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This phone number is already registered with another account."
            )

        # Generate secure random unusable hashed password for Google-authenticated user
        rand_pw = secrets.token_urlsafe(32)
        hashed_pw = hash_password(rand_pw)

        new_user = User(
            email=email,
            name=name,
            phone=phone_clean,
            role=data.role,
            hashed_password=hashed_pw,
            auth_provider="google",
            google_sub=google_sub,
            is_active=True
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # If Host (Provider), create associated provider profile
        if data.role == UserRole.PROVIDER:
            biz_name = data.business_name.strip() if data.business_name and data.business_name.strip() else f"{new_user.name} Stays"
            provider_profile = ProviderProfile(
                user_id=new_user.id,
                business_name=biz_name,
                contact_phone=new_user.phone,
                contact_email=new_user.email,
                verification_status="VERIFIED"
            )
            db.add(provider_profile)
            try:
                db.commit()
            except Exception:
                db.rollback()

        token = create_access_token(data={"sub": str(new_user.id), "email": new_user.email, "role": new_user.role.value})

        return {
            "access_token": token,
            "token_type": "bearer",
            "needs_onboarding": False,
            "user": {
                "id": new_user.id,
                "name": new_user.name,
                "email": new_user.email,
                "phone": new_user.phone,
                "role": new_user.role.value,
                "is_active": new_user.is_active
            }
        }

    @staticmethod
    def update_profile(db: Session, user: User, data: UserUpdate) -> User:
        if data.name is not None:
            clean_name = data.name.strip()
            if len(clean_name) < 2:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Full name must be at least 2 characters long."
                )
            user.name = clean_name
        
        if data.avatar_url is not None:
            user.avatar_url = data.avatar_url.strip() if data.avatar_url else None
        if data.bio is not None:
            user.bio = data.bio.strip() if data.bio else None
        if data.location is not None:
            user.location = data.location.strip() if data.location else None
        if data.preferred_currency is not None:
            user.preferred_currency = data.preferred_currency.strip() if data.preferred_currency else "INR"
        if data.preferred_language is not None:
            user.preferred_language = data.preferred_language.strip() if data.preferred_language else "English"
        if data.travel_styles is not None:
            user.travel_styles = data.travel_styles.strip() if data.travel_styles else None

        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def change_password(db: Session, user: User, current_password: str, new_password: str) -> dict:
        if not verify_password(current_password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The current password you entered is incorrect."
            )
        validate_password_strength(new_password)
        user.hashed_password = hash_password(new_password)
        db.commit()
        return {"message": "Password updated successfully.", "success": True}

