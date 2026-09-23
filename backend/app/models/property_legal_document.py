import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Enum, Float
from sqlalchemy.orm import relationship
from app.database import Base


class PropertyLegalRelationship(str, enum.Enum):
    PROPERTY_OWNER = "PROPERTY_OWNER"
    LEASEHOLDER_TENANT = "LEASEHOLDER_TENANT"
    AUTHORIZED_PROPERTY_MANAGER = "AUTHORIZED_PROPERTY_MANAGER"
    BUSINESS_ESTABLISHMENT_OPERATOR = "BUSINESS_ESTABLISHMENT_OPERATOR"
    PARTNERSHIP_CO_OWNER = "PARTNERSHIP_CO_OWNER"
    AUTHORIZED_REPRESENTATIVE = "AUTHORIZED_REPRESENTATIVE"
    OTHER_LEGAL_AUTHORITY = "OTHER_LEGAL_AUTHORITY"


class PropertyLegalDocumentType(str, enum.Enum):
    SALE_DEED = "SALE_DEED"
    PROPERTY_OWNERSHIP_DEED = "PROPERTY_OWNERSHIP_DEED"
    LEASE_AGREEMENT = "LEASE_AGREEMENT"
    RENT_AGREEMENT = "RENT_AGREEMENT"
    PROPERTY_TAX_RECEIPT = "PROPERTY_TAX_RECEIPT"
    LAND_RECORD = "LAND_RECORD"
    BUILDING_REGISTRATION = "BUILDING_REGISTRATION"
    BUSINESS_REGISTRATION = "BUSINESS_REGISTRATION"
    PARTNERSHIP_DEED = "PARTNERSHIP_DEED"
    AUTHORIZATION_LETTER = "AUTHORIZATION_LETTER"
    MANAGEMENT_AUTHORIZATION = "MANAGEMENT_AUTHORIZATION"
    OTHER_LEGAL_PROPERTY_DOCUMENT = "OTHER_LEGAL_PROPERTY_DOCUMENT"


class PropertyLegalDocument(Base):
    __tablename__ = "property_legal_documents"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id", ondelete="CASCADE"), nullable=False, index=True)
    uploaded_by = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Claimed Legal Relationship & Document Category
    legal_relationship = Column(String(60), nullable=False, default="PROPERTY_OWNER", index=True)
    document_type = Column(String(100), nullable=False, index=True)
    version_number = Column(Integer, default=1, nullable=False)

    # File Storage & Integrity
    original_filename = Column(String(255), nullable=False)
    storage_path = Column(String(500), nullable=False)
    mime_type = Column(String(100), default="application/pdf", nullable=False)
    file_size = Column(Integer, nullable=False)
    document_hash = Column(String(64), nullable=False)  # SHA-256

    # Automated Validation & Verification Statuses
    technical_status = Column(String(50), default="VALID", nullable=False)  # "VALID", "INVALID", "CORRUPTED"
    content_validation_status = Column(String(50), default="PASSED", nullable=False)  # "PASSED", "REJECTED", "NEEDS_REVIEW"
    relationship_validation_status = Column(String(50), default="PASSED", nullable=False)  # "PASSED", "REJECTED", "NEEDS_REVIEW"
    property_consistency_status = Column(String(50), default="PASSED", nullable=False)  # "PASSED", "REJECTED", "NEEDS_REVIEW"
    authenticity_status = Column(String(50), default="NOT_EXTERNALLY_VERIFIED", nullable=False)  # "NOT_EXTERNALLY_VERIFIED", "VERIFIED"
    overall_status = Column(String(50), default="READY_FOR_ADMIN_REVIEW", nullable=False, index=True)
    # Overall statuses: READY_FOR_ADMIN_REVIEW, ADMIN_APPROVED, ADMIN_REJECTED, NEEDS_REVIEW, REUPLOAD_REQUIRED, DOCUMENT_EXPIRED, SUPERSEDED

    # Validity & Expiry Dates
    validity_type = Column(String(50), default="EXPIRING", nullable=False)  # "EXPIRING", "PERMANENT_OR_NO_EXPIRY_IDENTIFIED"
    document_issue_date = Column(DateTime, nullable=True)
    document_effective_date = Column(DateTime, nullable=True)
    document_expiry_date = Column(DateTime, nullable=True, index=True)
    is_manually_entered_date = Column(Boolean, default=False, nullable=False)

    # Structured Data & Audit
    extracted_data = Column(Text, nullable=True)  # JSON-encoded extracted fields
    validation_result = Column(Text, nullable=True)  # JSON-encoded signals & scoring
    rejection_reason = Column(Text, nullable=True)

    # Immutability & Active Version Flag
    is_active_version = Column(Boolean, default=False, nullable=False)
    is_locked = Column(Boolean, default=False, nullable=False)  # Becomes True when Admin approves; locked forever

    # Timestamps & Reviewer
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    reviewed_at = Column(DateTime, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_at = Column(DateTime, nullable=True)

    # Relationships
    property = relationship("Property", back_populates="legal_documents")
    uploader = relationship("User", foreign_keys=[uploaded_by], lazy="joined")
    reviewer = relationship("User", foreign_keys=[reviewed_by], lazy="joined")
    access_logs = relationship("PropertyLegalDocumentAccessLog", back_populates="document", cascade="all, delete-orphan")
    reminders = relationship("PropertyDocumentExpiryReminder", back_populates="document", cascade="all, delete-orphan")


class PropertyLegalDocumentAccessLog(Base):
    __tablename__ = "property_legal_document_access_logs"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("property_legal_documents.id", ondelete="CASCADE"), nullable=False, index=True)
    admin_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    action = Column(String(50), default="VIEW", nullable=False)  # "VIEW", "DOWNLOAD", "INSPECT"
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)
    accessed_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    document = relationship("PropertyLegalDocument", back_populates="access_logs")
    admin = relationship("User", foreign_keys=[admin_id], lazy="joined")


class PropertyDocumentExpiryReminder(Base):
    __tablename__ = "property_document_expiry_reminders"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("property_legal_documents.id", ondelete="CASCADE"), nullable=False, index=True)
    property_id = Column(Integer, ForeignKey("properties.id", ondelete="CASCADE"), nullable=False, index=True)
    reminder_type = Column(String(50), nullable=False)  # "60_DAYS", "30_DAYS", "7_DAYS", "1_DAY", "EXPIRY_DAY"
    sent_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    document = relationship("PropertyLegalDocument", back_populates="reminders")
    property = relationship("Property", foreign_keys=[property_id])
