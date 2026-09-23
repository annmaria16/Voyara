import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship
from app.database import Base

class UserRole(str, enum.Enum):
    CUSTOMER = "CUSTOMER"
    PROVIDER = "PROVIDER"
    ADMIN = "ADMIN"

class AccountStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    PENDING_VERIFICATION = "PENDING_VERIFICATION"
    SUSPENDED = "SUSPENDED"
    DEACTIVATED = "DEACTIVATED"

class HostVerificationStatus(str, enum.Enum):
    UNVERIFIED = "UNVERIFIED"
    PHONE_VERIFIED = "PHONE_VERIFIED"
    EMAIL_VERIFIED = "EMAIL_VERIFIED"
    FULLY_VERIFIED = "FULLY_VERIFIED"
    SUSPENDED = "SUSPENDED"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    phone = Column(String(50), unique=True, index=True, nullable=True)
    role = Column(Enum(UserRole), default=UserRole.CUSTOMER, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    account_status = Column(String(50), default=AccountStatus.ACTIVE.value, nullable=False)
    
    # Phone Verification (OTP)
    phone_verified = Column(Boolean, default=False, nullable=False)
    phone_verified_at = Column(DateTime, nullable=True)
    phone_otp_hash = Column(String(255), nullable=True)
    phone_otp_expires_at = Column(DateTime, nullable=True)
    phone_otp_attempts = Column(Integer, default=0, nullable=False)
    phone_otp_last_sent_at = Column(DateTime, nullable=True)

    # Email Verification
    email_verified = Column(Boolean, default=False, nullable=False)
    email_verified_at = Column(DateTime, nullable=True)
    email_verification_token_hash = Column(String(255), nullable=True)
    email_verification_expires_at = Column(DateTime, nullable=True)

    # Account Suspension / Deactivation Metadata
    suspended_at = Column(DateTime, nullable=True)
    suspended_by = Column(Integer, nullable=True)
    suspension_reason = Column(String(1000), nullable=True)
    deactivated_at = Column(DateTime, nullable=True)
    deactivated_by = Column(Integer, nullable=True)
    deactivation_reason = Column(String(1000), nullable=True)
    token_version = Column(Integer, default=1, nullable=False)

    auth_provider = Column(String(50), default="local", nullable=False)
    google_sub = Column(String(255), unique=True, index=True, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    bio = Column(String(1000), nullable=True)
    location = Column(String(255), nullable=True)
    preferred_currency = Column(String(10), default="INR", nullable=True)
    preferred_language = Column(String(50), default="English", nullable=True)
    travel_styles = Column(String(500), nullable=True)
    reset_token = Column(String(255), nullable=True)
    reset_token_expiry = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    provider_profile = relationship("ProviderProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="user", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="user", cascade="all, delete-orphan")
    saved_trips = relationship("SavedTrip", back_populates="user", cascade="all, delete-orphan")
