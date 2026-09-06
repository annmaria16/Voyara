from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Boolean, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class PropertyAvailability(Base):
    """Whole-property closure management."""
    __tablename__ = "property_availability"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_closed = Column(Boolean, default=True, nullable=False)
    reason = Column(String(255), nullable=True)  # e.g., "Seasonal maintenance", "Private event"
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    property = relationship("Property", back_populates="availability_blocks")

class RoomAvailability(Base):
    """Individual room block management."""
    __tablename__ = "room_availability"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_blocked = Column(Boolean, default=True, nullable=False)
    reason = Column(String(255), nullable=True)  # e.g. "Renovation", "Owner reserved"
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    room = relationship("Room", back_populates="availability_blocks")
