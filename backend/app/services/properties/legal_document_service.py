import os
import io
import uuid
import hashlib
import json
import datetime
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status, UploadFile
from fastapi.responses import Response

from app.config import settings
from app.models.user import User, UserRole
from app.models.property import Property, PropertyVerificationStatus
from app.models.property_legal_document import (
    PropertyLegalRelationship,
    PropertyLegalDocumentType,
    PropertyLegalDocument,
    PropertyLegalDocumentAccessLog,
    PropertyDocumentExpiryReminder,
)
from app.services.properties.legal_document_validator import LegalDocumentValidator
from app.services.notifications.notification_service import NotificationService


class LegalDocumentService:
    SECURE_DIR_NAME = "secure_documents"

    @classmethod
    def get_secure_storage_dir(cls) -> str:
        """Returns the private absolute directory path for legal documents."""
        base = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        secure_dir = os.path.join(base, cls.SECURE_DIR_NAME)
        os.makedirs(secure_dir, exist_ok=True)
        return secure_dir

    @classmethod
    def calculate_sha256(cls, file_bytes: bytes) -> str:
        """Calculates SHA-256 hash for document integrity and tamper detection."""
        return hashlib.sha256(file_bytes).hexdigest()

    @classmethod
    def get_allowed_relationships_and_types(cls) -> List[Dict[str, Any]]:
        """Returns the full catalog of legal relationships and corresponding valid document types."""
        relationships = [
            {
                "relationship": "PROPERTY_OWNER",
                "label": "Property Owner",
                "description": "I am the lawful owner of this property (individual or direct owner).",
                "allowed_document_types": [
                    {"type": "SALE_DEED", "label": "Registered Sale Deed", "description": "Conveys absolute ownership rights."},
                    {"type": "PROPERTY_OWNERSHIP_DEED", "label": "Property Ownership Deed", "description": "Title deed or ownership proof."},
                    {"type": "LAND_RECORD", "label": "Land / Property Record", "description": "Patta, Khata, or Revenue record."},
                    {"type": "BUILDING_REGISTRATION", "label": "Property Registration Certificate", "description": "Municipal or statutory registration."},
                    {"type": "PROPERTY_TAX_RECEIPT", "label": "Property Tax Record / Receipt", "description": "Recent property tax assessment receipt."},
                    {"type": "OTHER_LEGAL_PROPERTY_DOCUMENT", "label": "Other Accepted Ownership Document", "description": "Other formal ownership evidence."},
                ],
            },
            {
                "relationship": "LEASEHOLDER_TENANT",
                "label": "Leaseholder / Tenant",
                "description": "I hold a valid lease or tenancy agreement permitting commercial or hospitality use.",
                "allowed_document_types": [
                    {"type": "LEASE_AGREEMENT", "label": "Registered Lease Agreement", "description": "Formal registered lease deed."},
                    {"type": "RENT_AGREEMENT", "label": "Registered Rent Agreement", "description": "Tenancy contract with occupancy terms."},
                    {"type": "OTHER_LEGAL_PROPERTY_DOCUMENT", "label": "Valid Tenancy / Occupancy Agreement", "description": "Occupancy agreement."},
                ],
            },
            {
                "relationship": "AUTHORIZED_PROPERTY_MANAGER",
                "label": "Authorized Property Manager",
                "description": "I am appointed or authorized by the owner to manage and list this property.",
                "allowed_document_types": [
                    {"type": "MANAGEMENT_AUTHORIZATION", "label": "Property Management Authorization", "description": "Formal management contract or POA."},
                    {"type": "AUTHORIZATION_LETTER", "label": "Authorization Letter from Owner", "description": "Written owner authorization."},
                    {"type": "OTHER_LEGAL_PROPERTY_DOCUMENT", "label": "Management Contract", "description": "Operational agreement."},
                ],
            },
            {
                "relationship": "BUSINESS_ESTABLISHMENT_OPERATOR",
                "label": "Business / Establishment Operator",
                "description": "The property is operated by a registered commercial enterprise, hotel, or business.",
                "allowed_document_types": [
                    {"type": "BUSINESS_REGISTRATION", "label": "Business Registration / Establishment Certificate", "description": "GSTIN, MSME, or Trade License."},
                    {"type": "BUILDING_REGISTRATION", "label": "Trade / Establishment Registration", "description": "Municipal establishment license."},
                    {"type": "OTHER_LEGAL_PROPERTY_DOCUMENT", "label": "Business-related Property Authorization", "description": "Commercial authorization."},
                ],
            },
            {
                "relationship": "PARTNERSHIP_CO_OWNER",
                "label": "Partnership / Co-owner",
                "description": "The property is owned by a partnership firm or jointly with co-owners.",
                "allowed_document_types": [
                    {"type": "PARTNERSHIP_DEED", "label": "Partnership Deed", "description": "Registered Deed of Partnership."},
                    {"type": "PROPERTY_OWNERSHIP_DEED", "label": "Registered Partnership Document / Co-ownership", "description": "Co-ownership title deed."},
                    {"type": "AUTHORIZATION_LETTER", "label": "Authorization from Co-owner(s)", "description": "Co-owner consent letter."},
                    {"type": "OTHER_LEGAL_PROPERTY_DOCUMENT", "label": "Other Accepted Partnership Document", "description": "Partnership resolution."},
                ],
            },
            {
                "relationship": "AUTHORIZED_REPRESENTATIVE",
                "label": "Authorized Representative",
                "description": "I have power of attorney or specific written authorization to represent the owner.",
                "allowed_document_types": [
                    {"type": "AUTHORIZATION_LETTER", "label": "Authorization Letter", "description": "Owner letter of authorization."},
                    {"type": "MANAGEMENT_AUTHORIZATION", "label": "Power of Attorney / Property Authorization", "description": "Formal power of attorney."},
                    {"type": "OTHER_LEGAL_PROPERTY_DOCUMENT", "label": "Owner Authorization Document", "description": "Representative consent."},
                ],
            },
            {
                "relationship": "OTHER_LEGAL_AUTHORITY",
                "label": "Other Legal Authority",
                "description": "Other legally recognized authority or statutory right to operate the property.",
                "allowed_document_types": [
                    {"type": "OTHER_LEGAL_PROPERTY_DOCUMENT", "label": "Other Legal Property Document", "description": "Accepted statutory document."},
                    {"type": "AUTHORIZATION_LETTER", "label": "Authorization Letter", "description": "Supporting authority letter."},
                    {"type": "PROPERTY_OWNERSHIP_DEED", "label": "Supporting Property Deed", "description": "Supporting deed evidence."},
                ],
            },
        ]
        return relationships

    @classmethod
    def validate_pre_upload(
        cls,
        file_bytes: bytes,
        filename: str,
        legal_relationship: str,
        document_type: str,
        property_context: Optional[Dict[str, Any]] = None,
        stay_partner_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Runs the validation pipeline without persisting the file (pre-submission check)."""
        return LegalDocumentValidator.validate_document(
            file_bytes=file_bytes,
            legal_relationship=legal_relationship,
            document_type=document_type,
            property_context=property_context,
            stay_partner_name=stay_partner_name,
        )

    @classmethod
    def upload_property_document(
        cls,
        db: Session,
        property_id: int,
        uploader_user: User,
        legal_relationship: str,
        document_type: str,
        file: UploadFile,
        manual_expiry_date: Optional[str] = None,
        is_manual_date: bool = False,
    ) -> PropertyLegalDocument:
        """
        Processes and stores a legal verification document for a property.
        Validates relationship, content structure, property consistency, saves securely,
        and links to property with versioning.
        """
        # 1. Verify property access
        prop = db.query(Property).filter(Property.id == property_id).first()
        if not prop:
            raise HTTPException(status_code=404, detail="Property not found.")

        # Ensure Provider owns the property (or Admin)
        if uploader_user.role != UserRole.ADMIN:
            from app.models.provider import ProviderProfile
            provider = db.query(ProviderProfile).filter(ProviderProfile.user_id == uploader_user.id).first()
            if not provider or prop.provider_id != provider.id:
                raise HTTPException(status_code=403, detail="Access denied: You can only upload legal documents for your own properties.")

        # 2. Read and validate binary bytes
        file_bytes = file.file.read()
        if len(file_bytes) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Document file size exceeds the 10 MB maximum limit.")

        prop_context = {
            "name": prop.name,
            "city": prop.city,
            "state": prop.state,
            "pincode": prop.address[-6:] if prop.address and prop.address[-6:].isdigit() else "",
        }

        # 3. Execute deep validation engine
        val_result = LegalDocumentValidator.validate_document(
            file_bytes=file_bytes,
            legal_relationship=legal_relationship,
            document_type=document_type,
            property_context=prop_context,
            stay_partner_name=uploader_user.name,
        )

        if val_result.get("content_status") != "PASSED" or val_result.get("relationship_consistency") != "PASSED":
            raise HTTPException(status_code=400, detail=val_result.get("message", "Document content validation failed."))

        if val_result.get("property_consistency") == "FAILED":
            raise HTTPException(status_code=400, detail=val_result.get("message", "Property information consistency check failed."))

        # 4. Determine next version number
        existing_docs = (
            db.query(PropertyLegalDocument)
            .filter(PropertyLegalDocument.property_id == property_id)
            .order_by(PropertyLegalDocument.version_number.desc())
            .all()
        )
        version_number = 1
        if existing_docs:
            version_number = existing_docs[0].version_number + 1

        # 5. Save to private secure storage
        storage_dir = cls.get_secure_storage_dir()
        file_uuid = uuid.uuid4().hex
        secure_filename = f"doc_prop_{property_id}_{file_uuid}.pdf"
        secure_file_path = os.path.join(storage_dir, secure_filename)

        with open(secure_file_path, "wb") as f:
            f.write(file_bytes)

        # 6. Parse dates
        extracted_data = val_result.get("extracted_data", {})
        doc_issue_date = None
        doc_effective_date = None
        doc_expiry_date = None

        if extracted_data.get("execution_date"):
            try:
                doc_issue_date = datetime.datetime.strptime(extracted_data["execution_date"], "%Y-%m-%d")
            except Exception:
                pass

        if extracted_data.get("effective_date"):
            try:
                doc_effective_date = datetime.datetime.strptime(extracted_data["effective_date"], "%Y-%m-%d")
            except Exception:
                pass

        if extracted_data.get("expiry_date"):
            try:
                doc_expiry_date = datetime.datetime.strptime(extracted_data["expiry_date"], "%Y-%m-%d")
            except Exception:
                pass

        # Handle manually entered expiry date if provided
        if manual_expiry_date and not doc_expiry_date:
            try:
                doc_expiry_date = datetime.datetime.strptime(manual_expiry_date, "%Y-%m-%d")
                is_manual_date = True
            except Exception:
                pass

        validity_type = extracted_data.get("validity_type", "PERMANENT_OR_NO_EXPIRY_IDENTIFIED")
        if doc_expiry_date:
            validity_type = "EXPIRING"

        # 7. Create and persist document record
        doc_record = PropertyLegalDocument(
            property_id=property_id,
            uploaded_by=uploader_user.id,
            legal_relationship=legal_relationship.upper().strip(),
            document_type=document_type.upper().strip(),
            version_number=version_number,
            original_filename=file.filename or "legal_document.pdf",
            storage_path=secure_file_path,
            mime_type="application/pdf",
            file_size=len(file_bytes),
            document_hash=cls.calculate_sha256(file_bytes),
            technical_status="VALID",
            content_validation_status="PASSED",
            relationship_validation_status="PASSED",
            property_consistency_status="PASSED",
            authenticity_status="NOT_EXTERNALLY_VERIFIED",
            overall_status="READY_FOR_ADMIN_REVIEW",
            validity_type=validity_type,
            document_issue_date=doc_issue_date,
            document_effective_date=doc_effective_date,
            document_expiry_date=doc_expiry_date,
            is_manually_entered_date=is_manual_date,
            extracted_data=json.dumps(extracted_data),
            validation_result=json.dumps(val_result),
            is_active_version=False,  # Becomes active only after Admin approval
            is_locked=False,
            uploaded_at=datetime.datetime.utcnow(),
        )
        db.add(doc_record)

        # Update property verification status
        prop.verification_status = PropertyVerificationStatus.PENDING_VERIFICATION.value
        prop.legal_document_status = "PENDING"
        prop.is_active = False  # Hidden until Admin approves

        db.commit()
        db.refresh(doc_record)

        # 8. Notify platform Admins
        try:
            NotificationService.notify_admins(
                db=db,
                title="New Property Legal Document for Review",
                message=f"Stay Partner uploaded a {document_type.replace('_', ' ').title()} (v{version_number}) for '{prop.name}'.",
                type="LEGAL_DOCUMENT_SUBMITTED",
                link=f"/admin/properties",
            )
        except Exception as e:
            print("Failed to notify admins of legal document:", e)

        return doc_record

    @classmethod
    def get_property_documents(cls, db: Session, property_id: int, current_user: User) -> List[PropertyLegalDocument]:
        """Returns the document history for a property. Enforces role isolation."""
        prop = db.query(Property).filter(Property.id == property_id).first()
        if not prop:
            raise HTTPException(status_code=404, detail="Property not found.")

        # Check permission: Admin or property owner
        if current_user.role != UserRole.ADMIN:
            from app.models.provider import ProviderProfile
            provider = db.query(ProviderProfile).filter(ProviderProfile.user_id == current_user.id).first()
            if not provider or prop.provider_id != provider.id:
                raise HTTPException(status_code=403, detail="Access denied: You can only view legal documents for your own properties.")

        docs = (
            db.query(PropertyLegalDocument)
            .filter(PropertyLegalDocument.property_id == property_id)
            .order_by(PropertyLegalDocument.version_number.desc())
            .all()
        )
        return docs

    @classmethod
    def admin_view_document(
        cls, db: Session, document_id: int, admin_user: User, ip_address: Optional[str] = None, user_agent: Optional[str] = None
    ) -> Response:
        """Securely streams document to Admin with audit logging and no-store headers."""
        if admin_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Access denied: Only Administrators can inspect legal documents.")

        doc = db.query(PropertyLegalDocument).filter(PropertyLegalDocument.id == document_id).first()
        if not doc or not os.path.isfile(doc.storage_path):
            raise HTTPException(status_code=404, detail="Document file not found in secure storage.")

        # Record access audit log
        access_log = PropertyLegalDocumentAccessLog(
            document_id=doc.id,
            admin_id=admin_user.id,
            action="VIEW",
            ip_address=ip_address,
            user_agent=user_agent,
            accessed_at=datetime.datetime.utcnow(),
        )
        db.add(access_log)
        db.commit()

        with open(doc.storage_path, "rb") as f:
            content = f.read()

        headers = {
            "Content-Disposition": f"inline; filename={doc.original_filename}",
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Pragma": "no-cache",
            "X-Content-Type-Options": "nosniff",
        }
        return Response(content=content, media_type="application/pdf", headers=headers)

    @classmethod
    def admin_review_document(
        cls, db: Session, document_id: int, admin_user: User, action: str, rejection_reason: Optional[str] = None
    ) -> PropertyLegalDocument:
        """
        Admin review action (APPROVE, REQUEST_CHANGES, REJECT).
        On APPROVE: locks the document, activates version, supersedes older versions, and activates property.
        """
        if admin_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Access denied: Only Administrators can review legal documents.")

        doc = db.query(PropertyLegalDocument).filter(PropertyLegalDocument.id == document_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Legal document record not found.")

        prop = db.query(Property).filter(Property.id == doc.property_id).first()
        if not prop:
            raise HTTPException(status_code=404, detail="Associated property not found.")

        now = datetime.datetime.utcnow()
        action_upper = action.upper().strip()

        if action_upper == "APPROVE":
            # 1. Lock this document and set active
            doc.overall_status = "ADMIN_APPROVED"
            doc.is_locked = True
            doc.is_active_version = True
            doc.approved_at = now
            doc.reviewed_at = now
            doc.reviewed_by = admin_user.id
            doc.rejection_reason = None

            # 2. Supersede older versions for this property
            other_docs = (
                db.query(PropertyLegalDocument)
                .filter(PropertyLegalDocument.property_id == prop.id, PropertyLegalDocument.id != doc.id)
                .all()
            )
            for od in other_docs:
                od.is_active_version = False
                if od.overall_status == "ADMIN_APPROVED":
                    od.overall_status = "SUPERSEDED"

            # 3. Update property to VERIFIED and ACTIVE
            prop.verification_status = PropertyVerificationStatus.VERIFIED.value
            prop.legal_document_status = "VALID"
            prop.is_active = True
            prop.verified_at = now
            prop.verified_by = admin_user.id

            db.commit()
            db.refresh(doc)

            # 4. Notify Stay Partner
            from app.models.provider import ProviderProfile
            provider_profile = db.query(ProviderProfile).filter(ProviderProfile.id == prop.provider_id).first()
            if provider_profile:
                NotificationService.create_notification(
                    db=db,
                    user_id=provider_profile.user_id,
                    title="Legal Document Approved — Property is Live!",
                    message=f"Your legal document for '{prop.name}' has been approved by the Voyara Control Center. Your property is now live and searchable.",
                    type="PROPERTY_APPROVED",
                    link=f"/provider/properties",
                )

        elif action_upper == "REQUEST_CHANGES":
            doc.overall_status = "NEEDS_REVIEW"
            doc.rejection_reason = rejection_reason or "Corrections or updated documentation requested by administrator."
            doc.reviewed_at = now
            doc.reviewed_by = admin_user.id

            prop.verification_status = PropertyVerificationStatus.NEEDS_REVIEW.value
            prop.legal_document_status = "REJECTED"
            prop.is_active = False

            db.commit()
            db.refresh(doc)

            from app.models.provider import ProviderProfile
            provider_profile = db.query(ProviderProfile).filter(ProviderProfile.id == prop.provider_id).first()
            if provider_profile:
                NotificationService.create_notification(
                    db=db,
                    user_id=provider_profile.user_id,
                    title="Document Review: Corrections Requested",
                    message=f"Administrator requested revisions for '{prop.name}': {doc.rejection_reason}",
                    type="PROPERTY_NEEDS_REVIEW",
                    link=f"/provider/properties/{prop.id}/edit",
                )

        elif action_upper == "REJECT":
            doc.overall_status = "ADMIN_REJECTED"
            doc.rejection_reason = rejection_reason or "Legal documentation rejected by administrator."
            doc.reviewed_at = now
            doc.reviewed_by = admin_user.id

            prop.verification_status = PropertyVerificationStatus.REJECTED.value
            prop.legal_document_status = "REJECTED"
            prop.is_active = False

            db.commit()
            db.refresh(doc)

            from app.models.provider import ProviderProfile
            provider_profile = db.query(ProviderProfile).filter(ProviderProfile.id == prop.provider_id).first()
            if provider_profile:
                NotificationService.create_notification(
                    db=db,
                    user_id=provider_profile.user_id,
                    title="Property Legal Document Rejected",
                    message=f"Legal document for '{prop.name}' was rejected: {doc.rejection_reason}",
                    type="PROPERTY_REJECTED",
                    link=f"/provider/properties/{prop.id}/edit",
                )
        else:
            raise HTTPException(status_code=400, detail="Invalid review action. Must be APPROVE, REQUEST_CHANGES, or REJECT.")

        return doc

    @classmethod
    def delete_document(cls, db: Session, property_id: int, document_id: int, current_user: User) -> bool:
        """Deletes an unapproved draft document. Locked approved documents cannot be deleted."""
        doc = db.query(PropertyLegalDocument).filter(
            PropertyLegalDocument.id == document_id, PropertyLegalDocument.property_id == property_id
        ).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found.")

        # Immutability check: Locked documents cannot be deleted
        if doc.is_locked or doc.overall_status == "ADMIN_APPROVED":
            raise HTTPException(
                status_code=400,
                detail="Approved legal documents are locked and immutable. To provide updated documentation, please upload a replacement version.",
            )

        # Access check
        if current_user.role != UserRole.ADMIN and doc.uploaded_by != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied.")

        if os.path.isfile(doc.storage_path):
            try:
                os.remove(doc.storage_path)
            except Exception:
                pass

        db.delete(doc)
        db.commit()
        return True

    @classmethod
    def get_admin_overview_metrics(cls, db: Session) -> Dict[str, int]:
        """Returns count of pending review, expiring soon, expired, approved, and rejected documents."""
        now = datetime.datetime.utcnow()
        sixty_days_future = now + datetime.timedelta(days=60)

        pending_count = db.query(PropertyLegalDocument).filter(PropertyLegalDocument.overall_status == "READY_FOR_ADMIN_REVIEW").count()
        approved_count = db.query(PropertyLegalDocument).filter(PropertyLegalDocument.overall_status == "ADMIN_APPROVED").count()
        rejected_count = db.query(PropertyLegalDocument).filter(PropertyLegalDocument.overall_status == "ADMIN_REJECTED").count()
        needs_review_count = db.query(PropertyLegalDocument).filter(PropertyLegalDocument.overall_status == "NEEDS_REVIEW").count()

        expired_count = (
            db.query(PropertyLegalDocument)
            .filter(
                PropertyLegalDocument.is_active_version == True,
                PropertyLegalDocument.document_expiry_date.isnot(None),
                PropertyLegalDocument.document_expiry_date < now,
            )
            .count()
        )

        expiring_soon_count = (
            db.query(PropertyLegalDocument)
            .filter(
                PropertyLegalDocument.is_active_version == True,
                PropertyLegalDocument.document_expiry_date.isnot(None),
                PropertyLegalDocument.document_expiry_date >= now,
                PropertyLegalDocument.document_expiry_date <= sixty_days_future,
            )
            .count()
        )

        return {
            "pending_review_count": pending_count,
            "expiring_soon_count": expiring_soon_count,
            "expired_count": expired_count,
            "approved_count": approved_count,
            "rejected_count": rejected_count,
            "replacement_required_count": needs_review_count,
        }
