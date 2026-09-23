import uuid
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class TripPlannerChatSession(Base):
    __tablename__ = "trip_planner_chat_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    title = Column(String(255), nullable=False, default="New Trip Plan")
    destination = Column(String(100), nullable=True, index=True)
    
    current_context = Column(JSON, default=dict, nullable=False)
    current_plan_snapshot = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", backref="trip_chat_sessions")
    messages = relationship(
        "TripPlannerChatMessage",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="TripPlannerChatMessage.created_at"
    )

class TripPlannerChatMessage(Base):
    __tablename__ = "trip_planner_chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(36), ForeignKey("trip_planner_chat_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    sender = Column(String(20), nullable=False)  # "user" | "assistant"
    text = Column(Text, nullable=False)
    
    suggestions = Column(JSON, default=list, nullable=False)
    budget_analysis = Column(JSON, nullable=True)
    plan_status = Column(String(50), nullable=True)
    action_type = Column(String(50), nullable=True)
    booking_payload = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    session = relationship("TripPlannerChatSession", back_populates="messages")
