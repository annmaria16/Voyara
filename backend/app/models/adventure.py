from datetime import datetime, date, time
from sqlalchemy import Column, Integer, String, Text, Boolean, Float, Date, Time, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.ext.hybrid import hybrid_property
from app.database import Base

class Adventure(Base):
    __tablename__ = "adventures"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False, index=True)
    adventure_type = Column(String(100), nullable=False, index=True)  # Campfire, Guided Trek, Sightseeing, Local Food Experience, Outdoor Activity, Cultural Experience, Adventure, Event
    description = Column(Text, nullable=False)
    price = Column(Float, nullable=False)
    pricing_model = Column(String(50), default="per_person", nullable=False)  # "per_person" or "fixed"
    capacity = Column(Integer, nullable=False)  # Max allowed participants per session
    duration = Column(String(100), nullable=False)  # e.g., "3 Hours", "Full Day", "2.5 Hours"
    schedule_type = Column(String(50), default="one-time", nullable=False)  # "one-time" or "recurring"
    event_date = Column(Date, nullable=True)  # for one-time
    start_time = Column(String(20), default="09:00", nullable=False)
    end_time = Column(String(20), default="12:00", nullable=False)
    image_url = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    property = relationship("Property", back_populates="adventures")
    schedules = relationship("AdventureSchedule", back_populates="adventure", cascade="all, delete-orphan")
    availabilities = relationship("AdventureAvailability", back_populates="adventure", cascade="all, delete-orphan")
    booking_items = relationship("BookingAdventure", back_populates="adventure", cascade="all, delete-orphan")

    @hybrid_property
    def experience_type(self):
        return self.adventure_type

    @experience_type.setter
    def experience_type(self, val):
        self.adventure_type = val

class AdventureSchedule(Base):
    """For recurring adventures (e.g. Every Friday & Sunday)."""
    __tablename__ = "adventure_schedules"

    id = Column(Integer, primary_key=True, index=True)
    adventure_id = Column(Integer, ForeignKey("adventures.id", ondelete="CASCADE"), nullable=False)
    day_of_week = Column(String(50), nullable=False)  # e.g., "Friday", "Saturday", "Sunday"
    start_time = Column(String(20), nullable=False)
    end_time = Column(String(20), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    adventure = relationship("Adventure", back_populates="schedules")

    @property
    def experience_id(self):
        return self.adventure_id

    @experience_id.setter
    def experience_id(self, val):
        self.adventure_id = val

class AdventureAvailability(Base):
    """Tracks booked capacity per specific date for accurate capacity calculation."""
    __tablename__ = "adventure_availabilities"

    id = Column(Integer, primary_key=True, index=True)
    adventure_id = Column(Integer, ForeignKey("adventures.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False, index=True)
    booked_count = Column(Integer, default=0, nullable=False)
    is_blocked = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    adventure = relationship("Adventure", back_populates="availabilities")

    @property
    def experience_id(self):
        return self.adventure_id

    @experience_id.setter
    def experience_id(self, val):
        self.adventure_id = val

# Aliases for backward-compatibility
Experience = Adventure
ExperienceSchedule = AdventureSchedule
ExperienceAvailability = AdventureAvailability
