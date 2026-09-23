import enum
from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Text, Float, Date, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from app.database import Base

class SavedTrip(Base):
    __tablename__ = "saved_trips"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    destination = Column(String(100), nullable=False, index=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    total_days = Column(Integer, default=1, nullable=False)
    total_nights = Column(Integer, default=1, nullable=False)
    
    # Traveler breakdown
    adults = Column(Integer, default=1, nullable=False)
    children = Column(Integer, default=0, nullable=False)
    child_ages = Column(JSON, default=list, nullable=False)
    infants = Column(Integer, default=0, nullable=False)
    
    # Budget preferences
    budget = Column(Float, nullable=True)
    budget_type = Column(String(50), default="TOTAL", nullable=False)  # "TOTAL", "ACCOMMODATION", "FLEXIBLE"
    
    # Planning preferences
    travel_style = Column(String(50), default="BALANCED", nullable=False)  # "RELAXED", "BALANCED", "PACKED", "FAMILY_FRIENDLY", "ADVENTURE", "ROMANTIC"
    stay_type = Column(String(50), default="ANY", nullable=False)  # "ANY", "Hotel", "Homestay", "Resort", "Camp", "Cottage", "Villa"
    interests = Column(JSON, default=list, nullable=False)
    experience_preferences = Column(JSON, default=list, nullable=False)
    special_requests = Column(Text, nullable=True)
    
    # Generated plan details
    summary = Column(Text, nullable=True)
    explanation = Column(Text, nullable=True)
    estimated_known_cost = Column(Float, default=0.0, nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    
    # Full itinerary payload snapshot for quick reload
    full_plan_snapshot = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="saved_trips")
    items = relationship("SavedTripItem", back_populates="trip", cascade="all, delete-orphan", order_by="SavedTripItem.day_number, SavedTripItem.start_time")

class SavedTripItem(Base):
    __tablename__ = "saved_trip_items"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("saved_trips.id", ondelete="CASCADE"), nullable=False, index=True)
    day_number = Column(Integer, nullable=False)
    item_type = Column(String(50), nullable=False)  # "STAY_CHECKIN", "STAY_CHECKOUT", "VOYARA_EXPERIENCE", "EXTERNAL_ATTRACTION", "MEAL_RECOMMENDATION", "LEISURE_NOTE"
    
    # Associations
    internal_id = Column(Integer, nullable=True)  # property_id or experience_id or room_id
    external_provider = Column(String(50), nullable=True)  # "GOOGLE_PLACES", "OPENSTREETMAP", "VERIFIED_CATALOG"
    external_place_id = Column(String(255), nullable=True)
    
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)
    
    start_time = Column(String(20), nullable=False)  # e.g. "09:00", "14:00"
    end_time = Column(String(20), nullable=False)  # e.g. "11:30", "15:00"
    
    location_name = Column(String(255), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    cost = Column(Float, default=0.0, nullable=False)
    pricing_note = Column(String(255), nullable=True)
    travel_time_minutes = Column(Integer, default=0, nullable=False)
    distance_km = Column(Float, default=0.0, nullable=False)
    
    snapshot_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    trip = relationship("SavedTrip", back_populates="items")
