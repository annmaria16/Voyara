from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from app.models.verinova_models import VeriNovaAssessmentStatus, VeriNovaEvidenceStatus, VeriNovaCheckStatus

class VeriNovaCheckResponse(BaseModel):
    id: int
    check_category: str
    check_name: str
    score_weight: int
    score_awarded: int
    status: VeriNovaCheckStatus
    message: str
    details: Optional[str] = None
    explanation: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class VeriNovaDuplicatePropertySummary(BaseModel):
    id: int
    name: str
    city: str
    state: str
    address: str
    contact_phone: str
    contact_email: str
    verification_status: str
    created_at: datetime
    similarity_score: Optional[float] = None
    similarity_reasons: Optional[List[str]] = []

    class Config:
        from_attributes = True

class VeriNovaAssessmentResponse(BaseModel):
    id: int
    assessment_id: str
    property_id: int
    host_id: int
    property_name: Optional[str] = None
    host_name: Optional[str] = None
    host_email: Optional[str] = None
    trust_score: int
    assessment_status: VeriNovaAssessmentStatus
    property_fingerprint: Optional[str] = None
    
    duplicate_detected: bool
    duplicate_property_id: Optional[int] = None
    duplicate_similarity_score: Optional[float] = None
    duplicate_explanation: Optional[str] = None
    
    evidence_status: VeriNovaEvidenceStatus
    evidence_filename: Optional[str] = None
    evidence_file_size: Optional[int] = None
    evidence_mime_type: Optional[str] = None
    evidence_notes: Optional[str] = None
    
    location_status: str
    pincode_status: str
    summary: str
    admin_decision: str
    decision_reason: Optional[str] = None
    reviewed_by: Optional[int] = None
    reviewer_name: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    
    created_at: datetime
    updated_at: datetime
    checks: List[VeriNovaCheckResponse] = []

    class Config:
        from_attributes = True

class VeriNovaPropertyDetailResponse(BaseModel):
    property_id: int
    name: str
    property_type: str
    address: str
    city: str
    state: str
    country: str
    location_details: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    contact_phone: str
    contact_email: str
    is_active: bool
    verification_status: str
    ownership_proof_url: Optional[str] = None
    trust_score: int
    trust_assessment_status: Optional[str] = None
    evidence_status: Optional[str] = None
    property_identity_fingerprint: Optional[str] = None
    
    # Host details
    provider_id: int
    provider_name: Optional[str] = None
    provider_email: Optional[str] = None
    provider_phone: Optional[str] = None
    provider_joined_at: Optional[datetime] = None
    
    # Counts
    images_count: int = 0
    rooms_count: int = 0
    amenities_count: int = 0
    
    # Latest assessment
    latest_assessment: Optional[VeriNovaAssessmentResponse] = None
    duplicate_property: Optional[VeriNovaDuplicatePropertySummary] = None
    
    # Images preview
    images: List[Dict[str, Any]] = []

class VeriNovaOverviewMetrics(BaseModel):
    total_properties_assessed: int
    high_consistency_count: int
    good_consistency_count: int
    needs_review_count: int
    high_risk_count: int
    potential_duplicates_count: int
    evidence_submitted_count: int
    evidence_accepted_count: int
    total_transactions_verified: int
    avg_trust_score: float

class VeriNovaTransactionVerificationResponse(BaseModel):
    booking_id: int
    booking_code: str
    customer_id: int
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    property_id: int
    property_name: Optional[str] = None
    room_id: Optional[int] = None
    room_name: Optional[str] = None
    experience_id: Optional[int] = None
    experience_name: Optional[str] = None
    check_in_date: str
    check_out_date: str
    total_price: float
    payment_status: str
    booking_status: str
    
    # VeriNova Integrity verification info
    verinova_verification_id: Optional[str] = None
    verinova_score: Optional[int] = 100
    verinova_status: Optional[str] = "VERIFIED"
    verinova_verified_at: Optional[datetime] = None
    
    integrity_checks: List[Dict[str, Any]] = []

    class Config:
        from_attributes = True

class VeriNovaAuditLogResponse(BaseModel):
    id: int
    entity_type: str
    entity_id: int
    event_type: str
    actor_id: Optional[int] = None
    actor_name: Optional[str] = "System Engine"
    actor_role: str
    summary: str
    details_json: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class VeriNovaAdminDecisionRequest(BaseModel):
    action: str  # "APPROVE", "REJECT", "REQUEST_REVIEW"
    reason: Optional[str] = None

class VeriNovaEvidenceUpdateRequest(BaseModel):
    evidence_status: VeriNovaEvidenceStatus  # ACCEPTED_AS_SUPPORTING_EVIDENCE, REVIEW_REQUIRED, REJECTED
    evidence_notes: Optional[str] = None
