import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Float, Date, DateTime, ForeignKey, Enum, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.ext.hybrid import hybrid_property
from app.database import Base

class AIBookingSessionStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    SEARCHING = "SEARCHING"
    AWAITING_SELECTION = "AWAITING_SELECTION"
    AWAITING_CONFIRMATION = "AWAITING_CONFIRMATION"
    BOOKING = "BOOKING"
    VERIFYING = "VERIFYING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    EXPIRED = "EXPIRED"

class AIBookingPreviewStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    CONFIRMED = "CONFIRMED"
    EXPIRED = "EXPIRED"
    INVALIDATED = "INVALIDATED"

class AIBookingSession(Base):
    __tablename__ = "ai_booking_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    traveler_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    conversation_id = Column(String(64), index=True, nullable=False, default=lambda: str(uuid.uuid4()))
    status = Column(Enum(AIBookingSessionStatus), default=AIBookingSessionStatus.ACTIVE, nullable=False)
    
    # Authoritative structured booking context
    requirements_json = Column(JSON, default=dict, nullable=False)
    selected_property_id = Column(Integer, ForeignKey("properties.id", ondelete="SET NULL"), nullable=True)
    selected_room_id = Column(Integer, ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True)
    selected_adventure_ids = Column(JSON, default=list, nullable=False)
    
    @hybrid_property
    def selected_experience_ids(self):
        return self.selected_adventure_ids

    @selected_experience_ids.setter
    def selected_experience_ids(self, val):
        self.selected_adventure_ids = val

    booking_preview_id = Column(String(64), nullable=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="SET NULL"), nullable=True)
    idempotency_key = Column(String(128), unique=True, index=True, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)

    traveler = relationship("User", foreign_keys=[traveler_id], backref="ai_booking_sessions")
    property = relationship("Property", foreign_keys=[selected_property_id])
    room = relationship("Room", foreign_keys=[selected_room_id])
    booking = relationship("Booking", foreign_keys=[booking_id])
    messages = relationship("AIBookingMessage", back_populates="session", cascade="all, delete-orphan", order_by="AIBookingMessage.created_at.asc()")
    previews = relationship("AIBookingPreview", back_populates="session", cascade="all, delete-orphan", order_by="desc(AIBookingPreview.created_at)")
    research_logs = relationship("AIAgentResearchLog", back_populates="session", cascade="all, delete-orphan")

class AIBookingPreview(Base):
    __tablename__ = "ai_booking_previews"

    id = Column(String(64), primary_key=True, default=lambda: f"PREV-{uuid.uuid4().hex[:12].upper()}", index=True)
    session_id = Column(String(36), ForeignKey("ai_booking_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    traveler_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    property_id = Column(Integer, ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    
    check_in = Column(Date, nullable=False)
    check_out = Column(Date, nullable=False)
    total_nights = Column(Integer, default=1, nullable=False)
    room_quantity = Column(Integer, default=1, nullable=False)
    adults = Column(Integer, default=1, nullable=False)
    children = Column(Integer, default=0, nullable=False)
    child_ages = Column(JSON, default=list, nullable=True)
    cot_count = Column(Integer, default=0, nullable=False)
    extra_bed_count = Column(Integer, default=0, nullable=False)
    
    adventure_id = Column(Integer, ForeignKey("adventures.id", ondelete="SET NULL"), nullable=True)
    adventure_participants = Column(Integer, default=0, nullable=False)
    adventure_date = Column(Date, nullable=True)

    # Authoritative financial breakdown
    room_nightly_price = Column(Float, default=0.0, nullable=False)
    room_total = Column(Float, default=0.0, nullable=False)
    adventure_total = Column(Float, default=0.0, nullable=False)
    supplements_total = Column(Float, default=0.0, nullable=False)
    total_price = Column(Float, default=0.0, nullable=False)
    currency = Column(String(10), default="INR", nullable=False)

    cancellation_policy_snapshot = Column(Text, nullable=False)
    rules_snapshot = Column(JSON, nullable=True)

    status = Column(Enum(AIBookingPreviewStatus), default=AIBookingPreviewStatus.ACTIVE, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)

    session = relationship("AIBookingSession", back_populates="previews")
    traveler = relationship("User", foreign_keys=[traveler_id])
    property = relationship("Property", foreign_keys=[property_id])
    room = relationship("Room", foreign_keys=[room_id])
    adventure = relationship("Adventure", foreign_keys=[adventure_id])

    @hybrid_property
    def experience_id(self):
        return self.adventure_id

    @experience_id.setter
    def experience_id(self, val):
        self.adventure_id = val

    @hybrid_property
    def experience_participants(self):
        return self.adventure_participants

    @experience_participants.setter
    def experience_participants(self, val):
        self.adventure_participants = val

    @hybrid_property
    def experience_date(self):
        return self.adventure_date

    @experience_date.setter
    def experience_date(self, val):
        self.adventure_date = val

    @hybrid_property
    def experience_total(self):
        return self.adventure_total

    @experience_total.setter
    def experience_total(self, val):
        self.adventure_total = val

    @hybrid_property
    def experience(self):
        return self.adventure

class AIBookingMessage(Base):
    __tablename__ = "ai_booking_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(36), ForeignKey("ai_booking_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    sender = Column(String(20), nullable=False)  # "user" | "assistant" | "system"
    text = Column(Text, nullable=False)
    
    intent = Column(String(50), default="SEARCH", nullable=False)  # SEARCH, AWAITING_INFO, SELECTION_REQUIRED, BOOKING_CONFIRMATION_REQUIRED, BOOKING_VERIFIED, BOOKING_FAILED, MISMATCH
    requires_user_action = Column(Boolean, default=False, nullable=False)
    action = Column(String(50), nullable=True)  # "CONFIRM_BOOKING", "SELECT_PROPERTY", "SELECT_ROOM", "PROVIDE_DATES"
    
    properties_payload = Column(JSON, nullable=True)
    rooms_payload = Column(JSON, nullable=True)
    alternatives_payload = Column(JSON, nullable=True)
    booking_preview_payload = Column(JSON, nullable=True)
    booking_payload = Column(JSON, nullable=True)
    verification_payload = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)

    session = relationship("AIBookingSession", back_populates="messages")

class AIAgentResearchLog(Base):
    __tablename__ = "ai_agent_research_logs"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(36), ForeignKey("ai_booking_sessions.id", ondelete="SET NULL"), nullable=True, index=True)
    traveler_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    task_type = Column(String(50), default="NATURAL_LANGUAGE_BOOKING", nullable=False)
    user_prompt = Column(Text, nullable=False)
    tool_calls_json = Column(JSON, default=list, nullable=False)
    
    booking_id = Column(Integer, nullable=True, index=True)
    agent_claimed_outcome = Column(String(50), nullable=False)  # "SUCCESS", "FAILED", "PENDING"
    actual_outcome = Column(String(50), nullable=False)         # "SUCCESS", "FAILED", "MISMATCH"
    verification_outcome = Column(String(50), nullable=False)   # "VERIFIED", "FAILED", "MISMATCH", "FALSE_SUCCESS_DETECTED", "REQUIRES_REVIEW"
    verification_failures = Column(Text, nullable=True)
    
    execution_latency_ms = Column(Integer, default=0, nullable=False)
    verification_latency_ms = Column(Integer, default=0, nullable=False)
    
    is_simulation = Column(Boolean, default=False, nullable=False)
    simulation_scenario = Column(String(100), nullable=True)
    recovery_action = Column(String(255), nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)

    session = relationship("AIBookingSession", back_populates="research_logs")
    traveler = relationship("User", foreign_keys=[traveler_id])
