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
