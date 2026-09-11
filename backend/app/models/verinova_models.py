import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.database import Base

class VeriNovaAssessmentStatus(str, enum.Enum):
    HIGH_CONSISTENCY = "HIGH_CONSISTENCY"
    GOOD_CONSISTENCY = "GOOD_CONSISTENCY"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    HIGH_RISK_INCONSISTENT = "HIGH_RISK_INCONSISTENT"

class VeriNovaEvidenceStatus(str, enum.Enum):
    NOT_PROVIDED = "NOT_PROVIDED"
    SUBMITTED = "SUBMITTED"
    EVIDENCE_AVAILABLE = "EVIDENCE_AVAILABLE"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    ACCEPTED_AS_SUPPORTING_EVIDENCE = "ACCEPTED_AS_SUPPORTING_EVIDENCE"
    REJECTED = "REJECTED"

class VeriNovaCheckStatus(str, enum.Enum):
    PASS = "PASS"
    WARNING = "WARNING"
    FAIL = "FAIL"

class VeriNovaPropertyAssessment(Base):
    __tablename__ = "verinova_property_assessments"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(String(50), unique=True, index=True, nullable=False)  # e.g., VN-PROP-1024
    property_id = Column(Integer, ForeignKey("properties.id", ondelete="CASCADE"), nullable=False, index=True)
    host_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    trust_score = Column(Integer, default=0, nullable=False)  # 0 to 100
    assessment_status = Column(Enum(VeriNovaAssessmentStatus), default=VeriNovaAssessmentStatus.NEEDS_REVIEW, nullable=False)
    property_fingerprint = Column(String(100), nullable=True, index=True)  # VN-PROP-FP-XXXXXXXX
    
    # Duplicate / Anomaly Signals
    duplicate_detected = Column(Boolean, default=False, nullable=False)
    duplicate_property_id = Column(Integer, ForeignKey("properties.id", ondelete="SET NULL"), nullable=True)
    duplicate_similarity_score = Column(Float, nullable=True)
    duplicate_explanation = Column(Text, nullable=True)

    # Supporting Evidence Metadata (Strictly Supporting Evidence, not Legal Proof)
    evidence_status = Column(Enum(VeriNovaEvidenceStatus), default=VeriNovaEvidenceStatus.NOT_PROVIDED, nullable=False)
    evidence_filename = Column(String(255), nullable=True)
    evidence_file_size = Column(Integer, nullable=True)
    evidence_mime_type = Column(String(100), nullable=True)
    evidence_notes = Column(Text, nullable=True)

    # Location & Pincode Consistency Statuses
    location_status = Column(String(50), default="INCOMPLETE", nullable=False)  # CONSISTENT, INCONSISTENT, WARNING, INCOMPLETE
    pincode_status = Column(String(50), default="NOT_FOUND", nullable=False)   # CONSISTENT, MISMATCH, NOT_FOUND

    summary = Column(Text, nullable=False)
    admin_decision = Column(String(50), default="PENDING_VERIFICATION", nullable=False)  # PENDING_VERIFICATION, VERIFIED, NEEDS_REVIEW, REJECTED
    decision_reason = Column(Text, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    property = relationship("Property", foreign_keys=[property_id], back_populates="verinova_assessments")
    duplicate_property = relationship("Property", foreign_keys=[duplicate_property_id])
    host = relationship("User", foreign_keys=[host_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    checks = relationship("VeriNovaPropertyCheck", back_populates="assessment", cascade="all, delete-orphan", order_by="VeriNovaPropertyCheck.id")

class VeriNovaPropertyCheck(Base):
    __tablename__ = "verinova_property_checks"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("verinova_property_assessments.id", ondelete="CASCADE"), nullable=False, index=True)
    check_category = Column(String(50), nullable=False)  # HOST_ACCOUNT, DATA_COMPLETENESS, INDIA_LOCATION, PINCODE_CONSISTENCY, GPS_ADDRESS_CONSISTENCY, PROPERTY_IDENTITY, SUPPORTING_EVIDENCE, PHOTO_AVAILABILITY, DUPLICATE_ANOMALY
    check_name = Column(String(255), nullable=False)
    score_weight = Column(Integer, default=10, nullable=False)
    score_awarded = Column(Integer, default=0, nullable=False)
    status = Column(Enum(VeriNovaCheckStatus), default=VeriNovaCheckStatus.PASS, nullable=False)
    message = Column(Text, nullable=False)
    details = Column(Text, nullable=True)
    explanation = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    assessment = relationship("VeriNovaPropertyAssessment", back_populates="checks")

class VeriNovaAuditLog(Base):
    __tablename__ = "verinova_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String(50), nullable=False, index=True)  # PROPERTY, BOOKING, EVIDENCE, ADMIN_ACTION
    entity_id = Column(Integer, nullable=False, index=True)
    event_type = Column(String(100), nullable=False, index=True)  # ASSESSMENT_GENERATED, DECISION_APPLIED, EVIDENCE_INSPECTED, REVERIFICATION_TRIGGERED, DUPLICATE_FLAGGED, IDENTITY_CHANGED, TRANSACTION_VERIFIED, TRANSACTION_FAILED
    actor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    actor_role = Column(String(50), default="SYSTEM_ENGINE", nullable=False)  # ADMIN, PROVIDER, CUSTOMER, SYSTEM_ENGINE
    summary = Column(Text, nullable=False)
    details_json = Column(Text, nullable=True)  # JSON-encoded additional context
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    actor = relationship("User", foreign_keys=[actor_id])
