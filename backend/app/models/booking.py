import enum
from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Text, Float, Date, DateTime, ForeignKey, Enum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.ext.hybrid import hybrid_property
from app.database import Base

class BookingStatus(str, enum.Enum):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    CONFIRMED = "CONFIRMED"
    CHECKED_IN = "CHECKED_IN"
    CHECKED_OUT = "CHECKED_OUT"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    FAILED = "FAILED"

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    booking_number = Column(String(50), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    property_id = Column(Integer, ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    check_in = Column(Date, nullable=False)
    check_out = Column(Date, nullable=False)
    total_nights = Column(Integer, default=1, nullable=False)
    total_guests = Column(Integer, default=1, nullable=False)
    room_total = Column(Float, default=0.0, nullable=False)
    experience_total = Column(Float, default=0.0, nullable=False)
    total_amount = Column(Float, default=0.0, nullable=False)
    status = Column(Enum(BookingStatus), default=BookingStatus.PENDING, nullable=False)
    customer_notes = Column(Text, nullable=True)
    guest_information_message_snapshot = Column(Text, nullable=True)
    cancellation_policy_snapshot = Column(Text, nullable=True)
    refund_percentage_snapshot = Column(Float, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    cancellation_reason = Column(Text, nullable=True)
    checked_in_at = Column(DateTime, nullable=True)
    checked_out_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    checkin_reminder_sent = Column(Boolean, default=False, nullable=False)

    # VeriNova Transaction Integrity Fields
    verinova_verification_id = Column(String(50), unique=True, index=True, nullable=True)  # VN-TX-XXXXXXXX
    verinova_score = Column(Integer, default=100, nullable=True)
    verinova_status = Column(String(50), default="VERIFIED", nullable=True)
    verinova_verified_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="bookings")
    property = relationship("Property", back_populates="bookings")
    booking_rooms = relationship("BookingRoom", back_populates="booking", cascade="all, delete-orphan")
    booking_experiences = relationship("BookingExperience", back_populates="booking", cascade="all, delete-orphan")
    verification_result = relationship("VerificationResult", back_populates="booking", uselist=False, cascade="all, delete-orphan")
    payment = relationship("Payment", back_populates="booking", uselist=False, cascade="all, delete-orphan")
    refund = relationship("Refund", back_populates="booking", uselist=False, cascade="all, delete-orphan")
    review = relationship("Review", back_populates="booking", uselist=False, cascade="all, delete-orphan")

    @hybrid_property
    def guest_information_message(self):
        return self.guest_information_message_snapshot

    @hybrid_property
    def checkin_reminder(self):
        return {
            "scheduled": True,
            "sent": bool(self.checkin_reminder_sent)
        }

class BookingRoom(Base):
    __tablename__ = "booking_rooms"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    room_name = Column(String(255), nullable=False)
    nightly_price = Column(Float, nullable=False)
    nights = Column(Integer, nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    guests = Column(Integer, nullable=False)
    subtotal = Column(Float, nullable=False)

    booking = relationship("Booking", back_populates="booking_rooms")
    room = relationship("Room", back_populates="booking_items")

class BookingExperience(Base):
    __tablename__ = "booking_experiences"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False)
    experience_id = Column(Integer, ForeignKey("experiences.id", ondelete="CASCADE"), nullable=False)
    experience_title = Column(String(255), nullable=False)
    price = Column(Float, nullable=False)
    pricing_model = Column(String(50), nullable=False)  # "per_person" or "fixed"
    participants = Column(Integer, nullable=False)
    subtotal = Column(Float, nullable=False)
    scheduled_date = Column(Date, nullable=False)

    booking = relationship("Booking", back_populates="booking_experiences")
    experience = relationship("Experience", back_populates="booking_items")
