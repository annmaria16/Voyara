import hashlib
import secrets
import re
from datetime import datetime, timedelta
from typing import Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.config import settings
from app.models.user import User, HostVerificationStatus, AccountStatus
from app.services.email.email_service import EmailService
from app.services.sms.sms_service import SmsService

# Cooldown and Expiration Constants
PHONE_OTP_EXPIRE_MINUTES = 10
EMAIL_VERIFY_EXPIRE_MINUTES = 15
RESEND_COOLDOWN_SECONDS = 30
MAX_FAILED_ATTEMPTS = 5

def hash_code(code: str) -> str:
    """Generate SHA-256 digest of plaintext OTP or verification token."""
    return hashlib.sha256(code.strip().encode("utf-8")).hexdigest()

def clean_indian_phone_strict(phone: str) -> str:
    """
    Validates and canonicalizes an Indian phone number.
    Accepts 10 digits starting with 6, 7, 8, 9, or prefixed with +91 / 91 / 0.
    Returns canonical standard format (+91XXXXXXXXXX).
    """
    if not phone or not phone.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number is required."
        )
    raw = phone.strip()
    digits = re.sub(r"[^\d]", "", raw)
    if digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    elif digits.startswith("0") and len(digits) == 11:
        digits = digits[1:]
    
    if len(digits) != 10 or digits[0] not in ["6", "7", "8", "9"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9."
        )
    if len(set(digits)) == 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please enter a valid Indian mobile number."
        )
    return f"+91{digits}"

class OtpService:
    @staticmethod
    def send_phone_otp(db: Session, phone: str, user_id: Optional[int] = None) -> dict:
        """
        Generates and sends a 6-digit phone verification OTP.
        Applies cooldown check, rate limits, attempt resets, and SHA-256 hashing.
        """
        canonical_phone = clean_indian_phone_strict(phone)
        now = datetime.utcnow()

        user = None
        if user_id:
            user = db.query(User).filter(User.id == user_id).first()
        if not user:
            user = db.query(User).filter(User.phone == canonical_phone).first()

        if user:
            if user.phone_verified:
                return {
                    "message": "Phone number is already verified.",
                    "success": True,
                    "phone": canonical_phone,
                    "already_verified": True
                }

            # Enforce resend cooldown
            if user.phone_otp_last_sent_at:
                elapsed = (now - user.phone_otp_last_sent_at).total_seconds()
                if elapsed < RESEND_COOLDOWN_SECONDS:
                    wait_seconds = int(RESEND_COOLDOWN_SECONDS - elapsed)
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=f"Please wait {wait_seconds} seconds before requesting a new phone OTP."
                    )

        # Check Development OTP mode vs Production / Real 2Factor mode
        otp_provider = getattr(settings, "OTP_PROVIDER", "development").strip().lower()
        is_dev_mode = (otp_provider == "development" and getattr(settings, "ENVIRONMENT", "development").strip().lower() != "production")

        if is_dev_mode:
            otp_code = "123456"
        else:
            # Generate cryptographically secure random 6-digit OTP
            otp_code = "".join(secrets.choice("0123456789") for _ in range(6))

        otp_hash = hash_code(otp_code)
        expires_at = now + timedelta(minutes=PHONE_OTP_EXPIRE_MINUTES)

        if user:
            user.phone = canonical_phone
            user.phone_otp_hash = otp_hash
            user.phone_otp_expires_at = expires_at
            user.phone_otp_attempts = 0
            user.phone_otp_last_sent_at = now
            db.commit()

        # Dispatch real SMS to device (and dual delivery email if user email is known)
        try:
            SmsService.send_phone_otp(
                phone=canonical_phone,
                otp=otp_code,
                user_email=user.email if user else None,
                user_name=user.name if user else "Host",
                expire_minutes=PHONE_OTP_EXPIRE_MINUTES
            )
        except Exception as sms_err:
            print(f"[SMS DISPATCH NOTICE] {sms_err}")

        return {
            "message": f"Verification code sent to {canonical_phone}.",
            "success": True,
            "phone": canonical_phone,
            "expires_in_seconds": PHONE_OTP_EXPIRE_MINUTES * 60,
            "cooldown_seconds": RESEND_COOLDOWN_SECONDS
        }

    @staticmethod
    def verify_phone_otp(db: Session, phone: str, otp: str, user_id: Optional[int] = None) -> dict:
        """
        Verifies phone OTP against the stored SHA-256 hash.
        Enforces expiration, attempt limits, and single-use invalidation.
        """
        canonical_phone = clean_indian_phone_strict(phone)
        clean_otp = (otp or "").strip()

        if not clean_otp or len(clean_otp) != 6 or not clean_otp.isdigit():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please enter a valid 6-digit numeric OTP."
            )

        user = None
        if user_id:
            user = db.query(User).filter(User.id == user_id).first()
        if not user:
            user = db.query(User).filter(User.phone == canonical_phone).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No account associated with this phone number was found."
            )

        now = datetime.utcnow()

        if user.phone_verified:
            return {
                "message": "Phone number is already verified.",
                "success": True,
                "phone": canonical_phone,
                "phone_verified": True
            }

        # Check maximum failed attempts
        if (user.phone_otp_attempts or 0) >= MAX_FAILED_ATTEMPTS:
            # Invalidate current OTP
            user.phone_otp_hash = None
            user.phone_otp_expires_at = None
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Too many incorrect attempts. This OTP has been invalidated. Please request a new OTP."
            )

        # Check expiration
        if not user.phone_otp_expires_at or user.phone_otp_expires_at < now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification code has expired. Please request a new OTP."
            )

        # Verify with 2Factor / Hash / Development mode support
        otp_provider = getattr(settings, "OTP_PROVIDER", "development").strip().lower()
        is_dev_mode = (otp_provider == "development" and getattr(settings, "ENVIRONMENT", "development").strip().lower() != "production")

        expected_hash = user.phone_otp_hash
        input_hash = hash_code(clean_otp)

        is_valid = False
        if is_dev_mode and clean_otp == "123456":
            is_valid = True
        elif expected_hash and expected_hash == input_hash:
            is_valid = True
        elif otp_provider in ["2factor", "production", "live"] and getattr(settings, "TWOFACTOR_API_KEY", None):
            is_valid = SmsService.verify_2factor_otp(canonical_phone, clean_otp)

        if not is_valid:
            user.phone_otp_attempts = (user.phone_otp_attempts or 0) + 1
            remaining = MAX_FAILED_ATTEMPTS - user.phone_otp_attempts
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Incorrect verification code. {remaining} attempt(s) remaining."
            )

        # Success - mark phone as verified and clear OTP hash
        user.phone_verified = True
        user.phone_verified_at = now
        user.phone_otp_hash = None
        user.phone_otp_expires_at = None
        user.phone_otp_attempts = 0

        # If email is already verified, fully activate Host account and profile
        if getattr(user, "email_verified", False):
            user.account_status = AccountStatus.ACTIVE.value
            if getattr(user, "provider_profile", None):
                user.provider_profile.verification_status = "VERIFIED"

        db.commit()

        is_fully_verified = user.phone_verified and getattr(user, "email_verified", False)

        return {
            "message": "Phone number verified successfully.",
            "success": True,
            "phone": canonical_phone,
            "phone_verified": True,
            "email_verified": user.email_verified,
            "is_fully_verified": is_fully_verified
        }

    @staticmethod
    def send_email_verification(db: Session, email: str, user_id: Optional[int] = None) -> dict:
        """
        Generates and sends a secure 6-digit email verification OTP / token.
        """
        clean_email = email.lower().strip()
        now = datetime.utcnow()

        user = None
        if user_id:
            user = db.query(User).filter(User.id == user_id).first()
        if not user:
            user = db.query(User).filter(User.email == clean_email).first()

        if user and user.email_verified:
            return {
                "message": "Email address is already verified.",
                "success": True,
                "email": clean_email,
                "already_verified": True
            }

        verify_code = "".join(secrets.choice("0123456789") for _ in range(6))
        token_hash = hash_code(verify_code)
        expires_at = now + timedelta(minutes=EMAIL_VERIFY_EXPIRE_MINUTES)

        if user:
            user.email = clean_email
            user.email_verification_token_hash = token_hash
            user.email_verification_expires_at = expires_at
            db.commit()

        # Send official branded HTML email via SMTP
        try:
            EmailService.send_verification_email(
                to_email=clean_email,
                code=verify_code,
                user_name=user.name if user else "Host",
                expire_minutes=EMAIL_VERIFY_EXPIRE_MINUTES
            )
        except Exception as mail_err:
            print(f"[EMAIL DISPATCH NOTICE] {mail_err}")

        return {
            "message": f"Verification code sent to {clean_email}.",
            "success": True,
            "email": clean_email,
            "expires_in_seconds": EMAIL_VERIFY_EXPIRE_MINUTES * 60
        }

    @staticmethod
    def verify_email(db: Session, email: str, code: str, user_id: Optional[int] = None) -> dict:
        """
        Verifies email verification code against the stored SHA-256 hash.
        """
        clean_email = email.lower().strip()
        clean_code = (code or "").strip()

        if not clean_code or len(clean_code) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please enter a valid 6-digit email verification code."
            )

        user = None
        if user_id:
            user = db.query(User).filter(User.id == user_id).first()
        if not user:
            user = db.query(User).filter(User.email == clean_email).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No account associated with this email address was found."
            )

        now = datetime.utcnow()

        if user.email_verified:
            return {
                "message": "Email address is already verified.",
                "success": True,
                "email": clean_email,
                "email_verified": True
            }

        # Check expiration
        if not user.email_verification_expires_at or user.email_verification_expires_at < now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email verification code has expired. Please request a new code."
            )

        # Verify hash
        expected_hash = user.email_verification_token_hash
        input_hash = hash_code(clean_code)

        if expected_hash != input_hash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid email verification code. Please check and try again."
            )

        # Success - mark email as verified and clear hash
        user.email_verified = True
        user.email_verified_at = now
        user.email_verification_token_hash = None
        user.email_verification_expires_at = None

        # If phone is already verified, fully activate Host account and profile
        if getattr(user, "phone_verified", False):
            user.account_status = AccountStatus.ACTIVE.value
            if getattr(user, "provider_profile", None):
                user.provider_profile.verification_status = "VERIFIED"

        db.commit()

        # Check if Host is now fully verified
        is_fully_verified = getattr(user, "phone_verified", False) and user.email_verified

        return {
            "message": "Email verified successfully.",
            "success": True,
            "email": clean_email,
            "email_verified": True,
            "phone_verified": user.phone_verified,
            "is_fully_verified": is_fully_verified
        }
