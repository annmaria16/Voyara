import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.database import Base

class VerificationStatus(str, enum.Enum):
    VERIFIED = "VERIFIED"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    FAILED = "FAILED"

class CheckStatus(str, enum.Enum):
    PASS = "PASS"
    WARNING = "WARNING"
    FAIL = "FAIL"

class VerificationResult(Base):
    __tablename__ = "verification_results"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), unique=True, nullable=False)
    status = Column(Enum(VerificationStatus), default=VerificationStatus.VERIFIED, nullable=False)
    summary = Column(Text, nullable=False)
    failure_reasons = Column(Text, nullable=True)  # Detailed failure/review summary if any
    verified_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    booking = relationship("Booking", back_populates="verification_result")
    checks = relationship("VerificationCheck", back_populates="verification_result", cascade="all, delete-orphan")

class VerificationCheck(Base):
    __tablename__ = "verification_checks"

    id = Column(Integer, primary_key=True, index=True)
    verification_id = Column(Integer, ForeignKey("verification_results.id", ondelete="CASCADE"), nullable=False)
    check_category = Column(String(50), nullable=False)  # "PROPERTY", "ROOM", "EXPERIENCE", "PRICE", "BOOKING"
    check_name = Column(String(255), nullable=False)    # e.g., "Property Active Check", "Room Availability & Conflict Check"
    status = Column(Enum(CheckStatus), default=CheckStatus.PASS, nullable=False)
    message = Column(Text, nullable=False)              # e.g., "Property is active and operational"
    details = Column(Text, nullable=True)

    verification_result = relationship("VerificationResult", back_populates="checks")
