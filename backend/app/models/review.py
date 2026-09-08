from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base

class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id", ondelete="CASCADE"), nullable=False, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    rating = Column(Float, nullable=False)  # 1.0 to 5.0
    cleanliness_rating = Column(Float, nullable=True)
    staff_rating = Column(Float, nullable=True)
    location_rating = Column(Float, nullable=True)
    value_rating = Column(Float, nullable=True)
    comment = Column(Text, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    property = relationship("Property", back_populates="reviews")
    booking = relationship("Booking", back_populates="review")
    user = relationship("User")
