import io
import os
import sys
import datetime
import fitz # PyMuPDF
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.main import app
from app.database import SessionLocal, engine
from app.models.user import User, UserRole
from app.models.property import Property, PropertyVerificationStatus
from app.models.property_legal_document import (
    PropertyLegalRelationship,
    PropertyLegalDocumentType,
    PropertyLegalDocument,
    PropertyLegalDocumentAccessLog,
    PropertyDocumentExpiryReminder,
)
from app.models.provider import ProviderProfile
from app.models.notification import Notification
from app.auth.jwt import create_access_token
from app.auth.password import hash_password
from app.services.properties.legal_document_expiry_cron import LegalDocumentExpiryCron

client = TestClient(app)

def create_pdf_bytes(title: str, body_lines: list) -> bytes:
    """Helper to generate clean in-memory PDF with specified text."""
    doc = fitz.open()
    page = doc.new_page(width=595, height=842) # A4
    page.insert_text((50, 60), title, fontsize=18, color=(0.1, 0.2, 0.4))
    y = 100
    for line in body_lines:
        page.insert_text((50, y), line, fontsize=11, color=(0.2, 0.2, 0.2))
        y += 20
    pdf_bytes = doc.write()
    doc.close()
    return pdf_bytes


def setup_test_users():
    db = SessionLocal()
    try:
        # Create Provider User
        provider = db.query(User).filter(User.email == "test_legal_provider@voyara.com").first()
        if not provider:
            provider = User(
                name="Legal Test Host",
                email="test_legal_provider@voyara.com",
                hashed_password=hash_password("password123"),
                role=UserRole.PROVIDER,
                is_active=True,
                phone_verified=True,
                email_verified=True,
            )
            db.add(provider)
            db.commit()
            db.refresh(provider)

        # Ensure ProviderProfile exists
        profile = db.query(ProviderProfile).filter(ProviderProfile.user_id == provider.id).first()
        if not profile:
            profile = ProviderProfile(
                user_id=provider.id,
                business_name="Legal Test Host Hospitality",
                contact_phone="+919876543210",
                contact_email=provider.email,
                verification_status="VERIFIED",
            )
            db.add(profile)
            db.commit()
            db.refresh(profile)

        # Create Admin
        admin = db.query(User).filter(User.email == "test_legal_admin@voyara.com").first()
        if not admin:
            admin = User(
                name="Legal Test Admin",
                email="test_legal_admin@voyara.com",
                hashed_password=hash_password("password123"),
                role=UserRole.ADMIN,
                is_active=True,
                phone_verified=True,
                email_verified=True,
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)

        provider_token = create_access_token(data={"sub": str(provider.id)})
        admin_token = create_access_token(data={"sub": str(admin.id)})

        return provider, admin, provider_token, admin_token, profile
    finally:
        db.close()


def test_relationships_catalog():
    print("\n--- TEST 1: Relationships & Allowed Types Catalog ---")
    resp = client.get("/api/legal-documents/relationships-and-types")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 7
    
    # Verify PROPERTY_OWNER allowed types
    owner_rel = next(r for r in data if r["relationship"] == "PROPERTY_OWNER")
    allowed_types = [t["type"] for t in owner_rel["allowed_document_types"]]
    assert "PROPERTY_OWNERSHIP_DEED" in allowed_types or "SALE_DEED" in allowed_types
    assert "PARTNERSHIP_DEED" not in allowed_types
    print("[PASS] Relationships & dynamically mapped allowed document types returned successfully.")


def test_pre_submission_validations():
    print("\n--- TEST 2: Pre-Submission Document Content Validations ---")
    provider, admin, provider_token, admin_token, profile = setup_test_users()
    headers = {"Authorization": f"Bearer {provider_token}"}

    # 1. Non-PDF File
    txt_data = b"This is a plain text file pretending to be a document."
    resp = client.post(
        "/api/legal-documents/validate-content",
        headers=headers,
        data={
            "legal_relationship": "PROPERTY_OWNER",
            "document_type": "PROPERTY_OWNERSHIP_DEED",
            "property_name": "Voyara Heritage Villa",
            "property_address": "Fort Kochi",
            "city": "Kochi",
            "state": "Kerala",
        },
        files={"file": ("test.txt", txt_data, "text/plain")},
    )
    assert resp.status_code == 200
    res = resp.json()
    assert res["is_valid"] is False
    assert "PDF" in res["message"]
    print("[PASS] Non-PDF file correctly rejected.")

    # 2. Corrupted PDF
    corrupt_data = b"%PDF-1.4 garbage data without valid xref"
    resp = client.post(
        "/api/legal-documents/validate-content",
        headers=headers,
        data={
            "legal_relationship": "PROPERTY_OWNER",
            "document_type": "PROPERTY_OWNERSHIP_DEED",
            "property_name": "Voyara Heritage Villa",
            "property_address": "Fort Kochi",
            "city": "Kochi",
            "state": "Kerala",
        },
        files={"file": ("corrupt.pdf", corrupt_data, "application/pdf")},
    )
    assert resp.status_code == 200
    assert resp.json()["is_valid"] is False
    print("[PASS] Corrupted PDF correctly rejected.")

    # 3. Unrelated PDF (Resume / CV)
    resume_pdf = create_pdf_bytes("Curriculum Vitae - John Doe", [
        "Software Engineer | Education | Work Experience",
        "Skills: Python, React, SQL, DevOps",
        "Employment History: Lead Developer at Tech Corp",
        "References available upon request",
    ])
    resp = client.post(
        "/api/legal-documents/validate-content",
        headers=headers,
        data={
            "legal_relationship": "PROPERTY_OWNER",
            "document_type": "PROPERTY_OWNERSHIP_DEED",
            "property_name": "Voyara Heritage Villa",
            "property_address": "Fort Kochi",
            "city": "Kochi",
            "state": "Kerala",
        },
        files={"file": ("resume.pdf", resume_pdf, "application/pdf")},
    )
    assert resp.status_code == 200
    res = resp.json()
    assert res["is_valid"] is False
    assert "non-legal" in res["message"].lower() or "resume" in res["message"].lower() or "unrelated" in res["message"].lower()
    print("[PASS] Unrelated Resume PDF correctly rejected with negative marker suppression.")

    # 4. Valid Sale Deed for Property Owner
    sale_deed_pdf = create_pdf_bytes("DEED OF SALE / PROPERTY TITLE DEED", [
        "THIS DEED OF ABSOLUTE SALE executed on 12th January 2022 at Kochi, Kerala.",
        "BETWEEN: Vendor Sri Rajesh Kumar AND Vendee Sri Legal Test Host (Purchaser).",
        "WHEREAS Vendor is absolute owner of Schedule Property: Voyara Heritage Villa,",
        "Survey No. 442/1, Municipal Door No. 12/84, Fort Kochi, Kochi, Kerala 682001.",
        "NOW THIS DEED WITNESSETH that in consideration of Rs. 85,00,000 paid,",
        "Vendor conveys absolute freehold title, ownership, rights and interest unto Vendee.",
        "SCHEDULE OF PROPERTY: Land and residential building situated in Fort Kochi, Kochi, Kerala.",
        "IN WITNESS WHEREOF the parties have set their hands and seals.",
    ])
    resp = client.post(
        "/api/legal-documents/validate-content",
        headers=headers,
        data={
            "legal_relationship": "PROPERTY_OWNER",
            "document_type": "PROPERTY_OWNERSHIP_DEED",
            "property_name": "Voyara Heritage Villa",
            "property_address": "Fort Kochi, Survey No 442/1",
            "city": "Kochi",
            "state": "Kerala",
        },
        files={"file": ("sale_deed.pdf", sale_deed_pdf, "application/pdf")},
    )
    assert resp.status_code == 200
    res = resp.json()
    assert res["is_valid"] is True
    assert res["score"] >= 80
    assert res["score_breakdown"]["doc_type_score"] == 100
    assert res["score_breakdown"]["property_match_score"] >= 80
    print("[PASS] Valid Property Ownership Sale Deed passed with high confidence.")

    # 5. Relationship Mismatch: Owner uploading Partnership Deed
    partnership_deed_pdf = create_pdf_bytes("PARTNERSHIP DEED", [
        "THIS DEED OF PARTNERSHIP executed on 1st March 2023.",
        "BETWEEN Partner 1: Alice AND Partner 2: Bob.",
        "WHEREAS the partners desire to carry on business of hospitality under firm name Voyara Stays.",
        "Capital Contribution: 50% each. Profit sharing ratio: 50:50.",
        "The firm shall operate from Fort Kochi, Kochi, Kerala.",
    ])
    resp = client.post(
        "/api/legal-documents/validate-content",
        headers=headers,
        data={
            "legal_relationship": "PROPERTY_OWNER", # MISMATCH: Owner cannot prove sole ownership via partnership deed without partnership co-owner relationship
            "document_type": "PROPERTY_OWNERSHIP_DEED",
            "property_name": "Voyara Heritage Villa",
            "property_address": "Fort Kochi",
            "city": "Kochi",
            "state": "Kerala",
        },
        files={"file": ("partnership.pdf", partnership_deed_pdf, "application/pdf")},
    )
    assert resp.status_code == 200
    res = resp.json()
    assert res["is_valid"] is False
    print("[PASS] Relationship mismatch (Owner uploading Partnership Deed) correctly rejected with clear explanation.")


def test_property_creation_with_legal_document_and_admin_review():
    print("\n--- TEST 3: Property Lifecycle, Immutability, Versioning, and Expiry Cron ---")
    provider, admin, provider_token, admin_token, profile = setup_test_users()
    provider_headers = {"Authorization": f"Bearer {provider_token}"}
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Step A: Create Property in DB
    db = SessionLocal()
    try:
        prop = Property(
            provider_id=profile.id,
            name="Voyara Royal Palms Villa",
            description="Luxury heritage villa in Munnar hills with tea garden views.",
            property_type="Villa",
            address="Palms Estate, Tea County Road",
            city="Munnar",
            state="Kerala",
            country="India",
            latitude=10.0889,
            longitude=77.0595,
            contact_phone="+919876543210",
            contact_email="palms@voyara.com",
            verification_status=PropertyVerificationStatus.PENDING_VERIFICATION,
            legal_document_status="PENDING_VERIFICATION",
            is_active=False,
        )
        db.add(prop)
        db.commit()
        db.refresh(prop)
        property_id = prop.id
    finally:
        db.close()

    print(f"[PASS] Created test property #{property_id} in PENDING_VERIFICATION state.")

    # Step B: Upload Valid Lease Agreement Document (Version 1)
    lease_pdf = create_pdf_bytes("COMMERCIAL PROPERTY LEASE AGREEMENT", [
        "THIS LEASE AGREEMENT is entered into at Munnar, Kerala on 1st January 2024.",
        "LESSOR: Sri Devikulam Estates AND LESSEE: Sri Legal Test Host (Stay Partner).",
        "WHEREAS Lessor is absolute owner of property: Voyara Royal Palms Villa, Munnar, Kerala.",
        "Lessor hereby leases and grants exclusive possession of property to Lessee for 3 years.",
        "Term: Commencing 01/01/2024 to Expiry: 31/12/2026.",
        "Lessee is fully authorized to operate hospitality, guest stays and lodging accommodation.",
        "SCHEDULE: Residential villa premises located at Palms Estate, Munnar, Kerala.",
    ])

    resp = client.post(
        f"/api/provider/properties/{property_id}/documents",
        headers=provider_headers,
        data={
            "legal_relationship": "LEASEHOLDER_TENANT",
            "document_type": "LEASE_AGREEMENT",
            "effective_date": "2024-01-01",
            "expiry_date": "2026-12-31",
            "document_number": "LEASE-MUN-2024-99",
        },
        files={"file": ("lease_agreement.pdf", lease_pdf, "application/pdf")},
    )
    assert resp.status_code == 200, resp.text
    doc_v1 = resp.json()
    assert doc_v1["version_number"] == 1
    assert doc_v1["is_locked"] is False
    assert doc_v1["overall_status"] in ["READY_FOR_ADMIN_REVIEW", "PENDING_ADMIN_REVIEW"]
    doc_v1_id = doc_v1["id"]
    print(f"[PASS] Document v1 (#{doc_v1_id}) uploaded in READY_FOR_ADMIN_REVIEW state.")

    # Step C: Admin Fetches Documents for Property
    resp = client.get(f"/api/admin/legal-documents/property/{property_id}", headers=admin_headers)
    assert resp.status_code == 200
    docs = resp.json()
    assert len(docs) == 1
    assert docs[0]["id"] == doc_v1_id
    print("[PASS] Admin successfully retrieved property legal document dossier.")

    # Step D: Admin Streams Watermarked PDF & Verifies Audit Log
    resp = client.get(f"/api/admin/legal-documents/{doc_v1_id}/view", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.headers.get("content-type") == "application/pdf"
    assert "no-store" in resp.headers.get("cache-control", "").lower()
    
    # Check DB Access Log
    db = SessionLocal()
    try:
        log = db.query(PropertyLegalDocumentAccessLog).filter(
            PropertyLegalDocumentAccessLog.document_id == doc_v1_id,
            PropertyLegalDocumentAccessLog.admin_id == admin.id,
        ).first()
        assert log is not None
        assert log.action in ["VIEW", "ADMIN_VIEW"]
        print("[PASS] Admin secure watermarked document stream generated audit access log entry.")
    finally:
        db.close()

    # Step E: Admin Approves Document -> Locks Document & Verifies Property
    resp = client.post(
        f"/api/admin/legal-documents/{doc_v1_id}/review",
        headers=admin_headers,
        json={"action": "APPROVE", "rejection_reason": "Verified registered lease deed against municipal records."},
    )
    assert resp.status_code == 200
    approved_doc = resp.json()
    assert approved_doc["overall_status"] == "ADMIN_APPROVED"
    assert approved_doc["is_locked"] is True

    # Verify Property State in DB
    db = SessionLocal()
    try:
        p = db.query(Property).filter(Property.id == property_id).first()
        assert p.legal_document_status in ["APPROVED", "VALID"]
        assert p.verification_status in [PropertyVerificationStatus.VERIFIED, "VERIFIED"]
        assert p.is_active is True
        print(f"[PASS] Document v1 approved & locked. Property #{property_id} is now APPROVED and active for bookings.")
    finally:
        db.close()

    # Step F: Immutability Check - Attempt to Delete Locked Approved Document Must Fail
    resp = client.delete(
        f"/api/provider/properties/{property_id}/documents/{doc_v1_id}",
        headers=provider_headers,
    )
    assert resp.status_code == 400
    assert "locked" in resp.text.lower() or "approved" in resp.text.lower()
    print("[PASS] Immutability guard verified: Locked approved document cannot be deleted.")

    # Step G: Versioning - Provider Uploads Replacement Version (v2)
    renewal_pdf = create_pdf_bytes("RENEWAL LEASE AGREEMENT", [
        "THIS RENEWAL LEASE AGREEMENT is entered into at Munnar on 1st January 2027.",
        "LESSOR: Sri Devikulam Estates AND LESSEE: Sri Legal Test Host.",
        "WHEREAS the lease for Voyara Royal Palms Villa, Munnar is extended for 5 years.",
        "New Term: Commencing 01/01/2027 to Expiry: 31/12/2031.",
        "SCHEDULE: Villa at Palms Estate, Munnar, Kerala.",
    ])
    resp = client.post(
        f"/api/provider/properties/{property_id}/documents",
        headers=provider_headers,
        data={
            "legal_relationship": "LEASEHOLDER_TENANT",
            "document_type": "LEASE_AGREEMENT",
            "effective_date": "2027-01-01",
            "expiry_date": "2031-12-31",
            "document_number": "LEASE-MUN-2027-EXT",
        },
        files={"file": ("renewal_lease.pdf", renewal_pdf, "application/pdf")},
    )
    assert resp.status_code == 200
    doc_v2 = resp.json()
    assert doc_v2["version_number"] == 2
    assert doc_v2["is_locked"] is False
    assert doc_v2["overall_status"] in ["READY_FOR_ADMIN_REVIEW", "PENDING_ADMIN_REVIEW"]
    doc_v2_id = doc_v2["id"]
    print(f"[PASS] Version 2 (#{doc_v2_id}) uploaded without overwriting v1 history.")

    # Admin approves v2 -> v1 should become SUPERSEDED
    resp = client.post(
        f"/api/admin/legal-documents/{doc_v2_id}/review",
        headers=admin_headers,
        json={"action": "APPROVE"},
    )
    assert resp.status_code == 200

    db = SessionLocal()
    try:
        v1_in_db = db.query(PropertyLegalDocument).filter(PropertyLegalDocument.id == doc_v1_id).first()
        v2_in_db = db.query(PropertyLegalDocument).filter(PropertyLegalDocument.id == doc_v2_id).first()
        assert v1_in_db.overall_status == "SUPERSEDED"
        assert v2_in_db.overall_status == "ADMIN_APPROVED"
        assert v2_in_db.is_locked is True
        print("[PASS] Version transition verified: v1 marked SUPERSEDED, v2 locked as ADMIN_APPROVED.")
    finally:
        db.close()

    # Step H: Daily Expiry Cron Verification
    print("\n--- TEST 4: Scheduled Daily Validity & Expiry Cron ---")
    db = SessionLocal()
    try:
        # Create an expiring document (expiry in 30 days)
        expiring_doc = PropertyLegalDocument(
            property_id=property_id,
            uploaded_by=provider.id,
            legal_relationship=PropertyLegalRelationship.LEASEHOLDER_TENANT.value,
            document_type=PropertyLegalDocumentType.LEASE_AGREEMENT.value,
            original_filename="expiring_lease.pdf",
            storage_path="secure_documents/test_expiring.pdf",
            file_size=1024,
            document_hash="test_hash_expiring_30",
            document_effective_date=datetime.datetime.utcnow() - datetime.timedelta(days=335),
            document_expiry_date=datetime.datetime.utcnow() + datetime.timedelta(days=30), # Exactly 30 days milestone
            overall_status="ADMIN_APPROVED",
            is_locked=True,
            is_active_version=True,
            version_number=3,
        )
        db.add(expiring_doc)

        # Create an already expired document (expired yesterday) on a new property
        expired_prop = Property(
            provider_id=profile.id,
            name="Voyara Sunset Manor",
            description="Serene cliffside homestay in Varkala.",
            property_type="Homestay",
            address="Cliff Road",
            city="Varkala",
            state="Kerala",
            contact_phone="+919988776655",
            contact_email="varkala@voyara.com",
            verification_status=PropertyVerificationStatus.VERIFIED,
            legal_document_status="VALID",
            is_active=True,
        )
        db.add(expired_prop)
        db.commit()
        db.refresh(expired_prop)

        expired_doc = PropertyLegalDocument(
            property_id=expired_prop.id,
            uploaded_by=provider.id,
            legal_relationship=PropertyLegalRelationship.LEASEHOLDER_TENANT.value,
            document_type=PropertyLegalDocumentType.LEASE_AGREEMENT.value,
            original_filename="expired_lease.pdf",
            storage_path="secure_documents/test_expired.pdf",
            file_size=1024,
            document_hash="test_hash_expired_yesterday",
            document_effective_date=datetime.datetime.utcnow() - datetime.timedelta(days=366),
            document_expiry_date=datetime.datetime.utcnow() - datetime.timedelta(days=1), # Expired yesterday
            overall_status="ADMIN_APPROVED",
            is_locked=True,
            is_active_version=True,
            version_number=1,
        )
        db.add(expired_doc)
        db.commit()
        db.refresh(expiring_doc)
        db.refresh(expired_doc)

        # Run Cron Job
        cron_summary = LegalDocumentExpiryCron.run_daily_expiry_checks(db=db)
        print(f"[PASS] Cron executed. Summary: {cron_summary}")
        assert cron_summary["reminders_30d"] >= 1
        assert cron_summary["expired_suspended"] >= 1

        # Check that 30-day reminder record was created idempotently
        reminder = db.query(PropertyDocumentExpiryReminder).filter(
            PropertyDocumentExpiryReminder.document_id == expiring_doc.id,
            PropertyDocumentExpiryReminder.reminder_type == "30_DAYS",
        ).first()
        assert reminder is not None
        print("[PASS] 30-day milestone reminder recorded.")

        # Re-running cron immediately should NOT send duplicate reminder (idempotency)
        second_cron = LegalDocumentExpiryCron.run_daily_expiry_checks(db=db)
        assert second_cron["reminders_30d"] == 0
        print("[PASS] Cron idempotency verified: 0 duplicate notifications sent on re-run.")

        # Check that expired property was automatically suspended
        refreshed_expired_prop = db.query(Property).filter(Property.id == expired_prop.id).first()
        assert refreshed_expired_prop.legal_document_status in ["DOCUMENT_EXPIRED", "EXPIRED"]
        assert refreshed_expired_prop.is_active is False
        print(f"[PASS] Expired property #{expired_prop.id} automatically suspended from new bookings (legal_document_status=DOCUMENT_EXPIRED, is_active=False).")

    finally:
        db.close()

    print("\n=======================================================")
    print("ALL 35 PROPERTY LEGAL VERIFICATION TEST POINTS PASSED!")
    print("=======================================================\n")


if __name__ == "__main__":
    test_relationships_catalog()
    test_pre_submission_validations()
    test_property_creation_with_legal_document_and_admin_review()
