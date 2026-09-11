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
from app.models.user import User, UserRole, AccountStatus
from app.models.provider import ProviderProfile
from app.schemas.auth import RegisterRequest, LoginRequest, GoogleAuthRequest
from app.auth.password import hash_password, verify_password
from app.auth.jwt import create_access_token
from app.services.email.email_service import EmailService
from app.services.auth.otp_service import OtpService, clean_indian_phone_strict

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
    """Clean and validate Indian phone number."""
    return clean_indian_phone_strict(phone)

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
        phone_clean = clean_indian_phone_strict(data.phone)

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

        is_provider = (role == UserRole.PROVIDER)

        # For Hosts, require phone & email verification before full activation
        # For Travelers, activate directly
        phone_verified = not is_provider
        email_verified = not is_provider
        initial_status = AccountStatus.PENDING_VERIFICATION.value if is_provider else AccountStatus.ACTIVE.value

        user = User(
            email=email_clean,
            name=name_clean,
            phone=phone_clean,
            hashed_password=hash_password(data.password),
            role=role,
            is_active=True,
            account_status=initial_status,
            phone_verified=phone_verified,
            phone_verified_at=datetime.utcnow() if phone_verified else None,
            email_verified=email_verified,
            email_verified_at=datetime.utcnow() if email_verified else None
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
        if is_provider:
            provider_profile = ProviderProfile(
                user_id=user.id,
                business_name=data.business_name.strip() if data.business_name else f"{user.name} Stays",
                contact_phone=user.phone,
                contact_email=user.email,
                verification_status="PENDING"
            )
            db.add(provider_profile)
            try:
                db.commit()
            except Exception:
                db.rollback()

            # Trigger initial phone OTP and email verification
            try:
                OtpService.send_phone_otp(db, phone=user.phone, user_id=user.id)
            except Exception as e:
                print(f"[OTP NOTICE] Initial phone OTP error: {e}")

            try:
                OtpService.send_email_verification(db, email=user.email, user_id=user.id)
            except Exception as e:
                print(f"[EMAIL NOTICE] Initial email verification error: {e}")

            return {
                "message": "Host registration initiated. Please verify your mobile number and email address to activate your host account.",
                "success": True,
                "email": user.email,
                "role": user.role.value,
                "phone": user.phone,
                "phone_verified": False,
                "email_verified": False,
                "verification_required": True
            }

        return {
            "message": "Your Voyara account has been created successfully. Please sign in to continue.",
            "success": True,
            "email": user.email,
            "role": user.role.value,
            "phone": user.phone,
            "phone_verified": True,
            "email_verified": True,
            "verification_required": False
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

        acc_status = getattr(user, "account_status", "ACTIVE")
        if not user.is_active or acc_status in ["SUSPENDED", AccountStatus.SUSPENDED.value]:
            reason = getattr(user, "suspension_reason", None)
            detail_msg = f"Your account has been suspended. Reason: {reason}" if reason else "Your account has been suspended. Please contact support."
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=detail_msg,
            )

        if acc_status in ["DEACTIVATED", AccountStatus.DEACTIVATED.value]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account has been deactivated. Please contact support.",
            )

        # Strict Host Verification Gating: Hosts can only sign in after both mobile number and email verification have succeeded
        if user.role == UserRole.PROVIDER:
            phone_ok = getattr(user, "phone_verified", False)
            email_ok = getattr(user, "email_verified", False)
            if not phone_ok or not email_ok:
                missing = []
                if not phone_ok:
                    missing.append("mobile number OTP verification")
                if not email_ok:
                    missing.append("email verification")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Host registration is incomplete. Please complete your {' and '.join(missing)} before signing in.",
                )

            # Auto-activate Host status if both verifications are complete
            if acc_status == AccountStatus.PENDING_VERIFICATION.value:
                user.account_status = AccountStatus.ACTIVE.value
                if getattr(user, "provider_profile", None):
                    user.provider_profile.verification_status = "VERIFIED"
                db.commit()
                acc_status = AccountStatus.ACTIVE.value

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
                "is_active": user.is_active,
                "account_status": acc_status,
                "phone_verified": getattr(user, "phone_verified", False),
                "email_verified": getattr(user, "email_verified", False)
            }
        }

    @staticmethod
    def forgot_password(db: Session, email: str) -> dict:
        email_clean = email.lower().strip()
        user = db.query(User).filter(User.email == email_clean).first()
        
        # If user is not registered, return error
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="This email address is not registered with Voyara. Please check your email or create an account."
            )

        token = secrets.token_urlsafe(32)
        user.reset_token = token
        user.reset_token_expiry = datetime.utcnow() + timedelta(hours=1)
        db.commit()

        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"

        # Send official branded HTML reset email via SMTP
        EmailService.send_password_reset_email(
            to_email=user.email,
            reset_url=reset_url,
            user_name=user.name or "Traveler"
        )

        return {
            "message": "Password reset instructions have been sent to your registered email.",
            "success": True
        }

    @staticmethod
    def reset_password(db: Session, token: str, new_password: str) -> dict:
        if not token or not token.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This password reset link is invalid or has expired."
            )

        user = db.query(User).filter(User.reset_token == token.strip()).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This password reset link is invalid or has expired."
            )

        if user.reset_token_expiry and user.reset_token_expiry < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This password reset link is invalid or has expired."
            )

        validate_password_strength(new_password)

        user.hashed_password = hash_password(new_password)
        user.reset_token = None
        user.reset_token_expiry = None
        db.commit()

        return {
            "message": "Password reset successful.",
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
            acc_status = getattr(user, "account_status", "ACTIVE")
            if not user.is_active or acc_status in ["SUSPENDED", AccountStatus.SUSPENDED.value]:
                reason = getattr(user, "suspension_reason", None)
                detail_msg = f"Your account has been suspended. Reason: {reason}" if reason else "Your account has been suspended. Please contact support."
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=detail_msg
                )

            if acc_status in ["DEACTIVATED", AccountStatus.DEACTIVATED.value]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Your account has been deactivated. Please contact support."
                )

            # Safely link Google identity if not already linked
            if not user.google_sub and google_sub:
                user.google_sub = google_sub
                if getattr(user, "auth_provider", None) in [None, "local"]:
                    user.auth_provider = "google"
                # Since verified through Google, email is verified
                user.email_verified = True
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
                    "is_active": user.is_active,
                    "account_status": acc_status,
                    "phone_verified": getattr(user, "phone_verified", False),
                    "email_verified": getattr(user, "email_verified", False)
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

        phone_clean = clean_indian_phone_strict(data.phone)

        # Check phone uniqueness in PostgreSQL
        existing_phone = db.query(User).filter(User.phone == phone_clean).first()
        if existing_phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This phone number is already registered with another account."
            )

        rand_pw = secrets.token_urlsafe(32)
        hashed_pw = hash_password(rand_pw)

        is_provider = (data.role == UserRole.PROVIDER)
        initial_status = AccountStatus.PENDING_VERIFICATION.value if is_provider else AccountStatus.ACTIVE.value

        new_user = User(
            email=email,
            name=name,
            phone=phone_clean,
            role=data.role,
            hashed_password=hashed_pw,
            auth_provider="google",
            google_sub=google_sub,
            is_active=True,
            account_status=initial_status,
            phone_verified=not is_provider,  # Host needs phone OTP
            email_verified=True  # Email verified via Google
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # If Host (Provider), create associated provider profile and send phone OTP
        if is_provider:
            biz_name = data.business_name.strip() if data.business_name and data.business_name.strip() else f"{new_user.name} Stays"
            provider_profile = ProviderProfile(
                user_id=new_user.id,
                business_name=biz_name,
                contact_phone=new_user.phone,
                contact_email=new_user.email,
                verification_status="PENDING"
            )
            db.add(provider_profile)
            try:
                db.commit()
            except Exception:
                db.rollback()

            try:
                OtpService.send_phone_otp(db, phone=new_user.phone, user_id=new_user.id)
            except Exception as e:
                print(f"[OTP NOTICE] Google signup phone OTP error: {e}")

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
                "is_active": new_user.is_active,
                "account_status": "ACTIVE",
                "phone_verified": new_user.phone_verified,
                "email_verified": new_user.email_verified
            }
        }

    @staticmethod
    def update_profile(db: Session, user: User, data) -> User:
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
