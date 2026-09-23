import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User, UserRole
from app.schemas.legal_document import (
    LegalDocumentResponse,
    LegalDocumentReviewRequest,
    LegalDocumentOverviewMetrics,
)
from app.services.properties.legal_document_service import LegalDocumentService
from app.routers.provider.legal_documents import serialize_doc_response

router = APIRouter(prefix="/legal-documents", tags=["Admin Legal Documents"])


@router.get("/overview", response_model=LegalDocumentOverviewMetrics)
def get_legal_documents_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin dashboard summary metrics of legal documents."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required.")
    return LegalDocumentService.get_admin_overview_metrics(db=db)


@router.get("/property/{property_id}", response_model=List[LegalDocumentResponse])
def get_admin_property_documents(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns all document versions for a property during Admin inspection."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required.")
    docs = LegalDocumentService.get_property_documents(db=db, property_id=property_id, current_user=current_user)
    return [serialize_doc_response(d) for d in docs]


@router.get("/{document_id}/view")
def admin_view_document(
    document_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Securely streams document to Admin with audit logging and no-store headers."""
    ip_addr = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return LegalDocumentService.admin_view_document(
        db=db,
        document_id=document_id,
        admin_user=current_user,
        ip_address=ip_addr,
        user_agent=user_agent,
    )


@router.post("/{document_id}/review", response_model=LegalDocumentResponse)
def admin_review_document(
    document_id: int,
    payload: LegalDocumentReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Admin review action (APPROVE, REQUEST_CHANGES, REJECT).
    Approving locks the document and makes the property live.
    """
    doc = LegalDocumentService.admin_review_document(
        db=db,
        document_id=document_id,
        admin_user=current_user,
        action=payload.action,
        rejection_reason=payload.rejection_reason,
    )
    return serialize_doc_response(doc)
