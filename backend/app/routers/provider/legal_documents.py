import json
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User, UserRole
from app.schemas.legal_document import LegalDocumentResponse
from app.services.properties.legal_document_service import LegalDocumentService

router = APIRouter(prefix="/properties", tags=["Provider Legal Documents"])


def serialize_doc_response(doc) -> dict:
    extracted_data = {}
    validation_result = {}
    if doc.extracted_data:
        try:
            extracted_data = json.loads(doc.extracted_data)
        except Exception:
            pass
    if doc.validation_result:
        try:
            validation_result = json.loads(doc.validation_result)
        except Exception:
            pass

    return {
        "id": doc.id,
        "property_id": doc.property_id,
        "uploaded_by": doc.uploaded_by,
        "legal_relationship": doc.legal_relationship,
        "document_type": doc.document_type,
        "document_type_label": doc.document_type.replace("_", " ").title(),
        "legal_relationship_label": doc.legal_relationship.replace("_", " ").title(),
        "version_number": doc.version_number,
        "original_filename": doc.original_filename,
        "mime_type": doc.mime_type,
        "file_size": doc.file_size,
        "document_hash": doc.document_hash,
        "technical_status": doc.technical_status,
        "content_validation_status": doc.content_validation_status,
        "relationship_validation_status": doc.relationship_validation_status,
        "property_consistency_status": doc.property_consistency_status,
        "authenticity_status": doc.authenticity_status,
        "overall_status": doc.overall_status,
        "validity_type": doc.validity_type,
        "document_issue_date": doc.document_issue_date,
        "document_effective_date": doc.document_effective_date,
        "document_expiry_date": doc.document_expiry_date,
        "is_manually_entered_date": doc.is_manually_entered_date,
        "extracted_data_parsed": extracted_data,
        "validation_result_parsed": validation_result,
        "rejection_reason": doc.rejection_reason,
        "is_active_version": doc.is_active_version,
        "is_locked": doc.is_locked,
        "uploaded_at": doc.uploaded_at,
        "reviewed_at": doc.reviewed_at,
        "reviewed_by": doc.reviewed_by,
        "approved_at": doc.approved_at,
    }


@router.get("/{property_id}/documents", response_model=List[LegalDocumentResponse])
def get_property_documents(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns all legal document records and versions for a property."""
    docs = LegalDocumentService.get_property_documents(db=db, property_id=property_id, current_user=current_user)
    return [serialize_doc_response(d) for d in docs]


@router.post("/{property_id}/documents", response_model=LegalDocumentResponse)
def upload_property_document(
    property_id: int,
    legal_relationship: str = Form(...),
    document_type: str = Form(...),
    file: UploadFile = File(...),
    manual_expiry_date: Optional[str] = Form(None),
    is_manual_date: bool = Form(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Uploads and validates a legal verification document for property onboarding or replacement."""
    doc = LegalDocumentService.upload_property_document(
        db=db,
        property_id=property_id,
        uploader_user=current_user,
        legal_relationship=legal_relationship,
        document_type=document_type,
        file=file,
        manual_expiry_date=manual_expiry_date,
        is_manual_date=is_manual_date,
    )
    return serialize_doc_response(doc)


@router.delete("/{property_id}/documents/{document_id}")
def delete_property_document(
    property_id: int,
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Deletes an unapproved draft legal document. Locked approved documents cannot be deleted."""
    success = LegalDocumentService.delete_document(
        db=db, property_id=property_id, document_id=document_id, current_user=current_user
    )
    return {"status": "success", "message": "Document deleted successfully."}
