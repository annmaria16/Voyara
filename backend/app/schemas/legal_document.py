from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class LegalRelationshipOption(BaseModel):
    relationship: str
    label: str
    description: str
    allowed_document_types: List[str]


class LegalDocumentTypeOption(BaseModel):
    document_type: str
    label: str
    description: str
    required_evidence_summary: str


class ExtractedDocumentData(BaseModel):
    document_type: Optional[str] = None
    document_title: Optional[str] = None
    parties: List[str] = []
    property_name: Optional[str] = None
    property_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    execution_date: Optional[str] = None
    effective_date: Optional[str] = None
    expiry_date: Optional[str] = None
    validity_type: str = "PERMANENT_OR_NO_EXPIRY_IDENTIFIED"
    registration_number: Optional[str] = None
    reference_number: Optional[str] = None
    stamp_information: Optional[str] = None
    signatures_detected: bool = False


class LegalDocumentValidationResult(BaseModel):
    is_valid: bool = True
    technical_status: str = "VALID"
    document_type_status: str = "MATCHED"
    content_status: str = "PASSED"
    property_consistency: str = "PASSED"
    relationship_consistency: str = "PASSED"
    authenticity_status: str = "NOT_EXTERNALLY_VERIFIED"
    overall_status: str = "READY_FOR_ADMIN_REVIEW"
    validation_score: float = 1.0
    score: Optional[int] = 100
    score_breakdown: Optional[Dict[str, Any]] = None
    signals: Dict[str, Any] = {}
    extracted_data: ExtractedDocumentData = ExtractedDocumentData()
    missing_requirements: List[str] = []
    matched_criteria: List[str] = []
    message: str = "Document content validation passed. Submitted for administrative verification."


class LegalDocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    property_id: int
    uploaded_by: int
    legal_relationship: str
    document_type: str
    document_type_label: Optional[str] = None
    legal_relationship_label: Optional[str] = None
    version_number: int = 1
    original_filename: str
    mime_type: str
    file_size: int
    document_hash: str

    technical_status: str
    content_validation_status: str
    relationship_validation_status: str
    property_consistency_status: str
    authenticity_status: str
    overall_status: str
    validity_type: str

    document_issue_date: Optional[datetime] = None
    document_effective_date: Optional[datetime] = None
    document_expiry_date: Optional[datetime] = None
    is_manually_entered_date: bool = False

    extracted_data_parsed: Optional[Dict[str, Any]] = None
    validation_result_parsed: Optional[Dict[str, Any]] = None
    rejection_reason: Optional[str] = None

    is_active_version: bool
    is_locked: bool

    uploaded_at: datetime
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[int] = None
    approved_at: Optional[datetime] = None


class LegalDocumentReviewRequest(BaseModel):
    action: str  # "APPROVE", "REQUEST_CHANGES", "REJECT"
    rejection_reason: Optional[str] = None


class LegalDocumentAccessLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    document_id: int
    admin_id: int
    admin_name: Optional[str] = None
    admin_email: Optional[str] = None
    action: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    accessed_at: datetime


class LegalDocumentOverviewMetrics(BaseModel):
    pending_review_count: int = 0
    expiring_soon_count: int = 0
    expired_count: int = 0
    approved_count: int = 0
    rejected_count: int = 0
    replacement_required_count: int = 0
