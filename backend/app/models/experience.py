from datetime import datetime, date, time
from sqlalchemy import Column, Integer, String, Text, Boolean, Float, Date, Time, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Experience(Base):
    __tablename__ = "experiences"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False, index=True)
    experience_type = Column(String(100), nullable=False, index=True)  # Campfire, Guided Trek, Sightseeing, Local Food Experience, Outdoor Activity, Cultural Experience, Adventure, Event
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

    property = relationship("Property", back_populates="experiences")
    schedules = relationship("ExperienceSchedule", back_populates="experience", cascade="all, delete-orphan")
    availabilities = relationship("ExperienceAvailability", back_populates="experience", cascade="all, delete-orphan")
    booking_items = relationship("BookingExperience", back_populates="experience", cascade="all, delete-orphan")

class ExperienceSchedule(Base):
    """For recurring experiences (e.g. Every Friday & Sunday)."""
    __tablename__ = "experience_schedules"

    id = Column(Integer, primary_key=True, index=True)
    experience_id = Column(Integer, ForeignKey("experiences.id", ondelete="CASCADE"), nullable=False)
    day_of_week = Column(String(50), nullable=False)  # e.g., "Friday", "Saturday", "Sunday"
    start_time = Column(String(20), nullable=False)
    end_time = Column(String(20), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    experience = relationship("Experience", back_populates="schedules")

class ExperienceAvailability(Base):
    """Tracks booked capacity per specific date for accurate capacity calculation."""
    __tablename__ = "experience_availabilities"

    id = Column(Integer, primary_key=True, index=True)
    experience_id = Column(Integer, ForeignKey("experiences.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False, index=True)
    booked_count = Column(Integer, default=0, nullable=False)
    is_blocked = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    experience = relationship("Experience", back_populates="availabilities")
