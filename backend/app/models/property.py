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
    guest_information_message = Column(Text, nullable=True)
    cancellation_refund_percentage = Column(Integer, default=50, nullable=False)
    
    # VeriNova Trust & Assessment Fields
    verification_status = Column(String(50), default="PENDING_VERIFICATION", nullable=False, index=True)
    legal_document_status = Column(String(50), default="PENDING", nullable=False, index=True)  # PENDING, VALID, DOCUMENT_EXPIRED, SUSPENDED, REJECTED
    ownership_proof_url = Column(String(500), nullable=True)
    evidence_status = Column(String(50), default="NOT_PROVIDED", nullable=False)
    trust_score = Column(Integer, default=0, nullable=False)
    trust_assessment_status = Column(String(50), default="NEEDS_REVIEW", nullable=False)
    property_identity_fingerprint = Column(String(100), nullable=True, index=True)
    verification_reason = Column(Text, nullable=True)
    verified_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)

    is_active = Column(Boolean, default=True, nullable=False)
    rating = Column(Float, default=0.0, nullable=False)
    review_count = Column(Integer, default=0, nullable=False)
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
    verinova_assessments = relationship("VeriNovaPropertyAssessment", foreign_keys="[VeriNovaPropertyAssessment.property_id]", back_populates="property", cascade="all, delete-orphan", order_by="desc(VeriNovaPropertyAssessment.created_at)")
    home_rules = relationship("PropertyRule", back_populates="property", uselist=False, cascade="all, delete-orphan")
    legal_documents = relationship("PropertyLegalDocument", back_populates="property", cascade="all, delete-orphan", order_by="desc(PropertyLegalDocument.version_number)")

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

class PropertyRule(Base):
    __tablename__ = "property_rules"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    
    # A. Children & Child Occupancy Policy
    children_allowed = Column(String(20), default="Yes", nullable=False)  # "Yes", "No"
    minimum_child_age = Column(Integer, nullable=True)
    maximum_children = Column(Integer, nullable=True)
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
    children_charged_separately = Column(Boolean, default=False, nullable=False)
    child_pricing_note = Column(String(500), nullable=True)
    cot_policy = Column(String(50), default="Upon Request", nullable=False)  # "Yes", "No", "Upon Request"
    cot_available = Column(String(20), default="No", nullable=False)  # "Yes", "No"
    cot_quantity = Column(Integer, default=0, nullable=True)
    cot_price = Column(Float, default=0.0, nullable=True)
    cot_charge_unit = Column(String(50), default="Free", nullable=True)  # "Free", "Per night", "Per stay"

    # B. Pet Policy
    pets_policy = Column(String(50), default="No", nullable=False)  # "Yes", "Upon Request", "No"
    pet_fee = Column(Float, default=0.0, nullable=True)
    pet_policy_description = Column(String(500), nullable=True)

    # C. Smoking Policy
    smoking_policy = Column(String(50), default="No", nullable=False)  # "Yes", "No", "Designated Areas Only"
    smoking_policy_description = Column(String(500), nullable=True)

    # D. Parties and Events
    parties_policy = Column(String(50), default="No", nullable=False)  # "Yes", "No", "Upon Request"
    party_policy_description = Column(String(500), nullable=True)

    # E. Visitor Policy
    visitors_policy = Column(String(50), default="Upon Request", nullable=False)  # "Yes", "No", "Upon Request"
    overnight_visitors_allowed = Column(Boolean, default=False, nullable=False)
    visitor_policy_description = Column(String(500), nullable=True)

    # F. Quiet Hours
    quiet_hours_enabled = Column(Boolean, default=False, nullable=False)
    quiet_hours_start = Column(String(20), default="22:00", nullable=True)
    quiet_hours_end = Column(String(20), default="07:00", nullable=True)

    # G. Check-in and Check-out
    check_in_start = Column(String(20), default="14:00", nullable=True)
    check_in_end = Column(String(20), default="22:00", nullable=True)
    check_out_time = Column(String(20), default="11:00", nullable=True)
    early_checkin_policy = Column(String(50), default="Upon Request", nullable=False)  # "Yes", "No", "Upon Request"
    late_checkout_policy = Column(String(50), default="Upon Request", nullable=False)  # "Yes", "No", "Upon Request"

    # H. Identification and Safety
    government_id_required = Column(Boolean, default=True, nullable=False)
    minimum_checkin_age = Column(Integer, default=18, nullable=True)
    safety_instructions = Column(Text, nullable=True)

    # I. Additional Rules
    additional_rules = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    property = relationship("Property", back_populates="home_rules")


