import json
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import get_current_user, get_optional_user
from app.models.user import User
from app.schemas.legal_document import LegalDocumentValidationResult
from app.services.properties.legal_document_service import LegalDocumentService
from app.services.properties.legal_document_validator import LegalDocumentValidator

router = APIRouter(prefix="/legal-documents", tags=["Legal Documents"])


@router.get("/relationships-and-types")
def get_relationships_and_document_types():
    """Returns the supported legal relationships and corresponding document categories."""
    return LegalDocumentService.get_allowed_relationships_and_types()


@router.post("/validate-content", response_model=LegalDocumentValidationResult)
async def validate_document_content_pre_upload(
    legal_relationship: str = Form(...),
    document_type: str = Form(...),
    file: UploadFile = File(...),
    property_name: Optional[str] = Form(None),
    city: Optional[str] = Form(None),
    state: Optional[str] = Form(None),
    pincode: Optional[str] = Form(None),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Pre-submission validation endpoint for Add Property.
    Reads PDF text / OCR, validates relationship and structural clauses, checks property consistency,
    and returns structured feedback without saving the file.
    """
    if not file:
        raise HTTPException(status_code=400, detail="No PDF document file provided.")

    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Document file size exceeds 10 MB limit.")

    prop_context = {
        "name": property_name,
        "city": city,
        "state": state,
        "pincode": pincode,
    }

    stay_partner_name = current_user.name if current_user else None

    result = LegalDocumentValidator.validate_document(
        file_bytes=file_bytes,
        legal_relationship=legal_relationship,
        document_type=document_type,
        property_context=prop_context,
        stay_partner_name=stay_partner_name,
    )

    return result
