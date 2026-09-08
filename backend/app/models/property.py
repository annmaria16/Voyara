import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.database import Base

class PropertyType(str, enum.Enum):
    HOTEL = "Hotel"
    HOMESTAY = "Homestay"
    RESORT = "Resort"
    CAMP = "Camp"
    COTTAGE = "Cottage"
    VILLA = "Villa"

class PropertyVerificationStatus(str, enum.Enum):
    PENDING_VERIFICATION = "PENDING_VERIFICATION"
    VERIFIED = "VERIFIED"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    REJECTED = "REJECTED"

class Property(Base):
    __tablename__ = "properties"

    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(Integer, ForeignKey("provider_profiles.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False, index=True)
    property_type = Column(String(50), nullable=False, index=True)  # Hotel, Homestay, Resort, Camp, Cottage, Villa
    description = Column(Text, nullable=False)
    address = Column(String(255), nullable=False)
    city = Column(String(100), nullable=False, index=True)
    state = Column(String(100), nullable=False)
    country = Column(String(100), default="India", nullable=False)
    location_details = Column(String(255), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    contact_phone = Column(String(50), nullable=False)
    contact_email = Column(String(255), nullable=False)
    check_in_time = Column(String(20), default="14:00", nullable=False)
    check_out_time = Column(String(20), default="11:00", nullable=False)
    
    # Verification & Visibility Control
    verification_status = Column(String(50), default="PENDING_VERIFICATION", nullable=False, index=True)
    ownership_proof_url = Column(String(500), nullable=True)
    verification_reason = Column(Text, nullable=True)
    verified_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)

    is_active = Column(Boolean, default=True, nullable=False)
    rating = Column(Float, default=4.8, nullable=False)
    review_count = Column(Integer, default=12, nullable=False)
    featured = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    provider = relationship("ProviderProfile", back_populates="properties")
    verifier = relationship("User", foreign_keys=[verified_by], lazy="joined")
    reviewer = relationship("User", foreign_keys=[reviewed_by], lazy="joined")
    images = relationship("PropertyImage", back_populates="property", cascade="all, delete-orphan", order_by="desc(PropertyImage.is_primary), PropertyImage.id")
    amenities = relationship("PropertyAmenity", back_populates="property", cascade="all, delete-orphan")
    rooms = relationship("Room", back_populates="property", cascade="all, delete-orphan")
    experiences = relationship("Experience", back_populates="property", cascade="all, delete-orphan")
    availability_blocks = relationship("PropertyAvailability", back_populates="property", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="property", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="property", cascade="all, delete-orphan", order_by="desc(Review.created_at)")

class PropertyImage(Base):
    __tablename__ = "property_images"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    image_url = Column(Text, nullable=False)
    caption = Column(String(255), nullable=True)
    is_primary = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    property = relationship("Property", back_populates="images")

class PropertyAmenity(Base):
    __tablename__ = "property_amenities"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    amenity_name = Column(String(100), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    property = relationship("Property", back_populates="amenities")
