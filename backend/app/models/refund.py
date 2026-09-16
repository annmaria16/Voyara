import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.database import Base

class RefundStatus(str, enum.Enum):
    NOT_APPLICABLE = "NOT_APPLICABLE"
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    REFUNDED = "REFUNDED"
    FAILED = "FAILED"

class Refund(Base):
    __tablename__ = "refunds"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    refund_reference = Column(String(100), unique=True, index=True, nullable=False)  # VN-REF-XXXXXXXX
    refund_amount = Column(Float, nullable=False)
    refund_percentage = Column(Float, nullable=False)
    cancellation_fee = Column(Float, default=0.0, nullable=False)
    retained_amount = Column(Float, default=0.0, nullable=False)
    commission_amount = Column(Float, default=0.0, nullable=False)
    provider_settlement_amount = Column(Float, default=0.0, nullable=False)
    refund_status = Column(String(50), default="REFUNDED", nullable=False)
    refund_reason = Column(Text, nullable=True)
    
    requested_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    processed_at = Column(DateTime, default=datetime.utcnow, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    booking = relationship("Booking", back_populates="refund")
    user = relationship("User")
