from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)  # e.g. "Deluxe Mountain View Suite"
    room_type = Column(String(100), nullable=False)  # e.g. "Deluxe Room", "Standard Room", "Family Villa", "Private Cabin"
    description = Column(Text, nullable=False)
    capacity = Column(Integer, default=2, nullable=False)  # Max guests
    quantity = Column(Integer, default=1, nullable=False)  # Total rooms of this type
    base_price = Column(Float, nullable=False)  # Nightly base price
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    property = relationship("Property", back_populates="rooms")
    images = relationship("RoomImage", back_populates="room", cascade="all, delete-orphan", order_by="desc(RoomImage.is_primary), RoomImage.id")
    amenities = relationship("RoomAmenity", back_populates="room", cascade="all, delete-orphan")
    availability_blocks = relationship("RoomAvailability", back_populates="room", cascade="all, delete-orphan")
    booking_items = relationship("BookingRoom", back_populates="room", cascade="all, delete-orphan")
    rules = relationship("RoomRule", back_populates="room", uselist=False, cascade="all, delete-orphan")

class RoomImage(Base):
    __tablename__ = "room_images"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    image_url = Column(Text, nullable=False)
    is_primary = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    room = relationship("Room", back_populates="images")

class RoomAmenity(Base):
    __tablename__ = "room_amenities"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    amenity_name = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    room = relationship("Room", back_populates="amenities")

class RoomRule(Base):
    __tablename__ = "room_rules"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    
    maximum_total_guests = Column(Integer, default=2, nullable=False)
    maximum_adults = Column(Integer, default=2, nullable=True)
    maximum_children = Column(Integer, default=1, nullable=True)
    additional_children_allowed = Column(Integer, default=0, nullable=False)
    max_child_age = Column(Integer, nullable=True)
    free_additional_children = Column(Integer, default=0, nullable=False)
    child_charge_enabled = Column(Boolean, default=False, nullable=False)
    child_charge_amount = Column(Float, default=0.0, nullable=True)
    child_charge_unit = Column(String(50), default="Per night", nullable=True)  # "Per night", "Per stay"
    existing_bed_allowed = Column(String(20), default="Yes", nullable=False)  # "Yes", "No"
    existing_bed_explanation = Column(Text, nullable=True)
    extra_bed_available = Column(String(20), default="No", nullable=False)  # "Yes", "No"
    extra_bed_charge_unit = Column(String(50), default="Per night", nullable=True)  # "Per night", "Per stay"
    children_allowed = Column(String(50), default="Yes", nullable=False)  # "Yes", "No", "Upon Request"
    minimum_child_age = Column(Integer, nullable=True)
    cot_policy = Column(String(50), default="Upon Request", nullable=False)  # "Yes", "No", "Upon Request"
    cot_available = Column(String(20), default="No", nullable=False)  # "Yes", "No"
    cot_quantity = Column(Integer, default=0, nullable=True)
    cot_price = Column(Float, default=0.0, nullable=True)
    cot_charge_unit = Column(String(50), default="Free", nullable=True)  # "Free", "Per night", "Per stay"
    extra_bed_policy = Column(String(50), default="Upon Request", nullable=False)  # "Yes", "No", "Upon Request"
    maximum_extra_beds = Column(Integer, default=0, nullable=True)
    extra_bed_price = Column(Float, default=0.0, nullable=True)
    child_price = Column(Float, default=0.0, nullable=True)
    room_specific_rules = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    room = relationship("Room", back_populates="rules")

