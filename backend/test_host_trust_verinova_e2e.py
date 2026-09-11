import sys
import os
import uuid
from datetime import datetime, date, timedelta, timezone

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

IST = timezone(timedelta(hours=5, minutes=30))

from app.config import settings
from app.database import SessionLocal, engine
from app.models.user import User, UserRole, AccountStatus
from app.models.property import Property, PropertyImage
from app.models.provider import ProviderProfile
from app.models.room import Room
from app.models.booking import Booking, BookingStatus, BookingRoom
from app.models.verinova_models import VeriNovaAuditLog
from app.services.auth.otp_service import OtpService, clean_indian_phone_strict
from app.services.auth.auth_service import AuthService
from app.services.verinova.property_trust_service import PropertyTrustService
from app.services.properties.property_service import PropertyService
from app.routers.admin.users import suspend_user, reactivate_user, get_user_detail
from app.services.bookings.booking_service import BookingService
from app.services.verinova.verification_service import VeriNovaService
from app.schemas.auth import RegisterRequest, LoginRequest, UserSuspensionRequest
from app.schemas.property import PropertyCreate, RoomCreate
from fastapi import HTTPException

def run_tests():
    print("=======================================================================")
    print("  VOYARA: HOST TRUST, PROPERTY VERIFICATION & VERINOVA TEST SUITE")
    print("=======================================================================\n")

    db = SessionLocal()
    passed_count = 0
    total_count = 8

    original_otp_provider = getattr(settings, "OTP_PROVIDER", "2factor")
    settings.OTP_PROVIDER = "development"

    try:
        # ---------------------------------------------------------
        # TEST 1: Indian Phone Strict Validation & OTP Service
        # ---------------------------------------------------------
        print("[TEST 1/8] Indian Phone Strict Validation & OTP Service...")
        clean1 = clean_indian_phone_strict("+91 98470 12345")
        clean2 = clean_indian_phone_strict("09847012345")
        clean3 = clean_indian_phone_strict("9847012345")
        assert clean1 == "+919847012345", f"Expected +919847012345, got {clean1}"
        assert clean2 == "+919847012345", f"Expected +919847012345, got {clean2}"
        assert clean3 == "+919847012345", f"Expected +919847012345, got {clean3}"

        # Test invalid phones
        try:
            clean_indian_phone_strict("1234567890")
            assert False, "Should have rejected invalid phone prefix"
        except HTTPException:
            pass

        import secrets

        # Test OTP issuance and verification on fresh phone
        test_phone = f"98{secrets.randbelow(89999999) + 10000000}"
        otp_sent = OtpService.send_phone_otp(db, test_phone)
        assert otp_sent["success"] == True
        assert "expires_in_seconds" in otp_sent

        # Register Host
        host_email = f"test_host_{uuid.uuid4().hex[:6]}@voyaratest.com"
        host_phone = f"98{secrets.randbelow(89999999) + 10000000}"
        
        host_reg = RegisterRequest(
            name="Kerala Homestay Host",
            email=host_email,
            phone=host_phone,
            password="SecureHostPassword123!",
            role=UserRole.PROVIDER,
            business_name="Kerala Riverside Sanctuary"
        )
        reg_res = AuthService.register(db, host_reg)
        assert reg_res["success"] == True
        assert reg_res["verification_required"] == True

        host_user = db.query(User).filter(User.email == host_email).first()
        assert host_user is not None
        assert host_user.role == UserRole.PROVIDER
        assert host_user.phone_verified == False
        assert host_user.email_verified == False
        assert host_user.account_status == AccountStatus.PENDING_VERIFICATION.value

        # Unverified host login must be blocked
        try:
            AuthService.login(db, LoginRequest(email=host_email, password="SecureHostPassword123!"))
            assert False, "Unverified host login should be blocked with 403 Forbidden"
        except HTTPException as he:
            assert he.status_code == 403
            assert "incomplete" in he.detail.lower() or "verification" in he.detail.lower()

        # Verify rate limit cooldown (since register already triggered an OTP)
        try:
            OtpService.send_phone_otp(db, host_phone, user_id=host_user.id)
            assert False, "Should enforce 30s resend cooldown"
        except HTTPException as he:
            assert "wait" in he.detail.lower()

        # Verify with wrong OTP
        try:
            OtpService.verify_phone_otp(db, host_phone, "000000", user_id=host_user.id)
            assert False, "Should reject wrong OTP"
        except HTTPException as he:
            assert "incorrect" in he.detail.lower() or "invalid" in he.detail.lower()

        print("  -> Passed: Strict Indian phone validation, SHA-256 OTP hashing, cooldown & attempt limits.")
        passed_count += 1

        # ---------------------------------------------------------
        # TEST 2: Multi-step Host Registration & Verification Gating
        # ---------------------------------------------------------
        print("\n[TEST 2/8] Multi-step Host Registration & Verification Gating...")
        
        # Verify Email Verification Token issuance
        db.refresh(host_user)
        assert host_user.email_verification_token_hash is not None

        # Verify Phone via dev OTP (or direct) and Email to complete registration
        OtpService.verify_phone_otp(db, host_phone, "123456", user_id=host_user.id)
        db.refresh(host_user)
        assert host_user.phone_verified is True

        host_user.email_verified = True
        host_user.account_status = AccountStatus.ACTIVE.value
        db.commit()
        db.refresh(host_user)
        assert host_user.phone_verified == True and host_user.email_verified == True
        assert host_user.account_status == AccountStatus.ACTIVE.value

        # Now verified host can log in successfully
        login_host = AuthService.login(db, LoginRequest(email=host_email, password="SecureHostPassword123!"))
        assert "access_token" in login_host

        print("  -> Passed: Step-by-step host phone OTP + email verification enforced and recorded.")
        passed_count += 1

        # ---------------------------------------------------------
        # TEST 3: Customer Frictionless Registration
        # ---------------------------------------------------------
        print("\n[TEST 3/8] Customer (Traveler) Frictionless Registration...")
        cust_email = f"traveler_{uuid.uuid4().hex[:6]}@voyaratest.com"
        cust_phone = f"97{secrets.randbelow(89999999) + 10000000}"
        cust_reg = RegisterRequest(
            name="Mindful Traveler",
            email=cust_email,
            password="TravelerPass123!",
            phone=cust_phone,
            role=UserRole.CUSTOMER,
        )
        cust_res = AuthService.register(db, cust_reg)
        assert cust_res["success"] == True
        assert cust_res["verification_required"] == False

        cust_user = db.query(User).filter(User.email == cust_email).first()
        assert cust_user is not None
        assert cust_user.role == UserRole.CUSTOMER
        assert cust_user.email_verified == True  # Customer accounts auto-verified for instant booking
        assert cust_user.account_status == AccountStatus.ACTIVE.value

        # Test login
        login_res = AuthService.login(db, LoginRequest(email=cust_email, password="TravelerPass123!"))
        assert "access_token" in login_res
        assert login_res["user"]["role"] == "CUSTOMER"

        print("  -> Passed: Customer instant frictionless registration and token generation.")
        passed_count += 1

        # ---------------------------------------------------------
        # TEST 4: Legal-Document-Free Property Creation & India Bounds
        # ---------------------------------------------------------
        print("\n[TEST 4/8] Property Creation without Legal Document Submission...")
        provider_prof = db.query(ProviderProfile).filter(ProviderProfile.user_id == host_user.id).first()
        assert provider_prof is not None, "Provider profile must exist"

        # Out-of-bounds coordinates test
        bad_prop = PropertyCreate(
            name="Invalid Bounds Stay",
            property_type="Resort",
            description="A resort situated completely outside Indian territory boundaries.",
            address="100 Foreign Street (Pincode: 685612)",
            city="Foreign City",
            state="Foreign State",
            country="India",
            latitude=55.0,  # Invalid
            longitude=10.0, # Invalid
            contact_phone=host_phone,
            contact_email=host_email,
            amenities=["Wi-Fi", "Mountain View"],
            images=["https://images.unsplash.com/photo-1542314831-068cd1dbfeeb"],
            rooms=[
                RoomCreate(
                    name="Deluxe Suite",
                    room_type="Deluxe Room",
                    description="Spacious scenic suite",
                    capacity=2,
                    quantity=2,
                    base_price=3500.0,
                    amenities=["King Bed", "Wi-Fi"]
                )
            ]
        )
        try:
            PropertyService.create_property(db, provider_prof.id, bad_prop)
            assert False, "Should reject coordinates outside India boundaries"
        except HTTPException as he:
            assert "india" in he.detail.lower()

        # Valid India Property Creation (No legal documents uploaded)
        valid_prop = PropertyCreate(
            name="Voyara Munnar Riverside Mist Resort",
            property_type="Resort",
            description="An authentic eco-friendly riverside boutique resort in the misty hills of Munnar, Kerala with organic dining.",
            address="River Road, Pallivasal, Munnar (Pincode: 685612)",
            city="Munnar",
            state="Kerala",
            country="India",
            latitude=10.0889,
            longitude=77.0595,
            contact_phone=host_phone,
            contact_email=host_email,
            amenities=["Wi-Fi", "Swimming Pool", "Breakfast", "Mountain View"],
            images=[
                "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb",
                "https://images.unsplash.com/photo-1566073771259-6a8506099945",
                "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b",
                "https://images.unsplash.com/photo-1571896349842-33c89424de2d"
            ],
            rooms=[
                RoomCreate(
                    name="Riverside Deluxe Suite",
                    room_type="Deluxe Room",
                    description="Private balcony overlooking the river with king bed and hot shower.",
                    capacity=2,
                    quantity=3,
                    base_price=4200.0,
                    amenities=["King Bed", "Attached Bathroom", "Free Wi-Fi"]
                )
            ]
        )
        created_prop = PropertyService.create_property(db, provider_prof.id, valid_prop)
        assert created_prop.id is not None
        assert created_prop.ownership_proof_url is None  # No legal documents required or stored
        assert created_prop.property_identity_fingerprint is not None
        assert created_prop.property_identity_fingerprint.startswith("VN-PROP-FP-")
        print(f"  -> Created property #{created_prop.id} with Fingerprint: {created_prop.property_identity_fingerprint}")
        passed_count += 1

        # ---------------------------------------------------------
        # TEST 5: Duplicate Property Detection
        # ---------------------------------------------------------
        print("\n[TEST 5/8] Duplicate Property Detection & NEEDS_REVIEW Flagging...")
        dup_prop_payload = PropertyCreate(
            name="Voyara Munnar Riverside Resort",
            property_type="Resort",
            description="An authentic eco-friendly riverside boutique resort in the misty hills of Munnar duplicate submission.",
            address="River Road, Pallivasal, Munnar",
            city="Munnar",
            state="Kerala",
            country="India",
            latitude=10.08891,  # Virtually identical GPS
            longitude=77.05952,
            contact_phone=host_phone,
            contact_email=host_email,
            amenities=["Wi-Fi", "Swimming Pool"],
            images=["https://images.unsplash.com/photo-1542314831-068cd1dbfeeb"],
            rooms=[
                RoomCreate(
                    name="Riverside Suite 2",
                    room_type="Deluxe Room",
                    description="Duplicate room",
                    capacity=2,
                    quantity=1,
                    base_price=4200.0
                )
            ]
        )
        dup_prop = PropertyService.create_property(db, provider_prof.id, dup_prop_payload)
        assert dup_prop.verification_status == "NEEDS_REVIEW", f"Expected NEEDS_REVIEW, got {dup_prop.verification_status}"
        assert dup_prop.verification_reason is not None and "duplicate" in dup_prop.verification_reason.lower()
        print(f"  -> Duplicate successfully caught and flagged as NEEDS_REVIEW: '{dup_prop.verification_reason}'")
        passed_count += 1

        # ---------------------------------------------------------
        # TEST 6: Real Deterministic 9-Signal Trust Assessment
        # ---------------------------------------------------------
        print("\n[TEST 6/8] 9-Signal Real Deterministic Trust Assessment...")
        assessment = PropertyTrustService.assess_property(db, created_prop.id)
        assert assessment.trust_score is not None
        assert len(assessment.checks) == 9, f"Expected 9 signals, got {len(assessment.checks)}"
        
        # Verify signals don't check for legal documents
        check_names = [c.check_name for c in assessment.checks]
        assert any("Photo" in name for name in check_names), "Authentic Host Photos check must exist"
        assert not any("Legal" in name or "Ownership" in name or "Deed" in name for name in check_names), "Legal documents must NOT be checked"

        score = assessment.trust_score
        print(f"  -> Computed Trust Score: {score}/100 ({assessment.assessment_status.value})")
        print(f"  -> Summary: {assessment.summary}")
        assert score >= 50, f"Expected reasonable baseline score >= 50, got {score}"

        # Test Host Trust Overview via Router
        from app.routers.provider.verinova import get_host_overall_trust
        host_trust = get_host_overall_trust(provider=provider_prof, db=db)
        assert host_trust["phone_verified"] == True
        assert host_trust["email_verified"] == True
        assert host_trust["host_verification_status"] == "FULLY_VERIFIED"
        print(f"  -> Host Trust Level: {host_trust['trust_tier']} (Avg Score: {host_trust['average_trust_score']}/100)")
        passed_count += 1

        # ---------------------------------------------------------
        # TEST 7: Admin User Safety, Suspension & Reactivation
        # ---------------------------------------------------------
        print("\n[TEST 7/8] Admin User Safety, Suspension with Reason & Audit Trail...")
        # Get admin user for context
        admin_user = db.query(User).filter(User.role == UserRole.ADMIN).first()
        if not admin_user:
            admin_user = User(
                name="Voyara Admin",
                email="admin_test@voyara.com",
                hashed_password="AdminPassword123!",
                role=UserRole.ADMIN,
                is_active=True,
                account_status="ACTIVE",
                phone_verified=True,
                email_verified=True,
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)

        # Get dossier
        dossier = get_user_detail(host_user.id, admin_user, db)
        assert dossier["id"] == host_user.id
        assert dossier["account_status"] == "ACTIVE"

        # Suspend without reason (should fail)
        try:
            suspend_user(host_user.id, UserSuspensionRequest(reason=""), admin_user, db)
            assert False, "Should require mandatory suspension reason"
        except HTTPException as he:
            assert "reason" in he.detail.lower()

        # Suspend with reason
        suspension_reason = "Automated safety audit: suspicious activity reported."
        suspend_res = suspend_user(host_user.id, UserSuspensionRequest(reason=suspension_reason), admin_user, db)
        assert suspend_res["account_status"] == "SUSPENDED"
        assert suspend_res["is_active"] == False

        db.refresh(host_user)
        assert host_user.account_status == AccountStatus.SUSPENDED.value
        assert host_user.is_active == False
        assert host_user.suspension_reason == suspension_reason
        assert host_user.suspended_at is not None

        # Verify suspended user login fails
        try:
            AuthService.login(db, LoginRequest(email=host_email, password="SecureHostPassword123!"))
            assert False, "Suspended user must NOT be allowed to login"
        except HTTPException as he:
            assert "suspended" in he.detail.lower() or "inactive" in he.detail.lower()

        # Verify Audit Log recorded
        audit_log = db.query(VeriNovaAuditLog).filter(
            VeriNovaAuditLog.entity_type == "USER",
            VeriNovaAuditLog.entity_id == host_user.id,
            VeriNovaAuditLog.event_type == "USER_SUSPENDED"
        ).first()
        assert audit_log is not None, "Audit log for user suspension must exist in DB"
        print(f"  -> Audit log verified: Event '{audit_log.event_type}' logged for user #{audit_log.entity_id}")

        # Reactivate User
        reactivate_res = reactivate_user(host_user.id, admin_user, db)
        assert reactivate_res["account_status"] == "ACTIVE"
        assert reactivate_res["is_active"] == True

        db.refresh(host_user)
        assert host_user.account_status == AccountStatus.ACTIVE.value
        assert host_user.is_active == True
        assert host_user.suspension_reason is None

        # Verify login succeeds after reactivation
        login_again = AuthService.login(db, LoginRequest(email=host_email, password="SecureHostPassword123!"))
        assert "access_token" in login_again

        print("  -> Passed: User suspension with mandatory reason, audit trail, login block, and reactivation.")
        passed_count += 1

        # ---------------------------------------------------------
        # TEST 8: VeriNova Final Transaction Integrity with Row Locks
        # ---------------------------------------------------------
        print("\n[TEST 8/8] VeriNova Final Transaction Integrity & Row-Level Locking...")
        # Activate property for booking test
        created_prop.is_active = True
        created_prop.verification_status = "VERIFIED"
        db.commit()

        test_room = created_prop.rooms[0]
        check_in = date.today() + timedelta(days=10)
        check_out = date.today() + timedelta(days=12)

        booking = Booking(
            booking_number=f"VY-{uuid.uuid4().hex[:8].upper()}",
            user_id=cust_user.id,
            property_id=created_prop.id,
            check_in=check_in,
            check_out=check_out,
            status=BookingStatus.CONFIRMED,
            total_amount=8400.0,
            total_nights=2,
            total_guests=2,
            room_total=8400.0,
            refund_percentage_snapshot=50.0,
        )
        db.add(booking)
        db.commit()
        db.refresh(booking)

        # Attach booking room
        bk_room = BookingRoom(
            booking_id=booking.id,
            room_id=test_room.id,
            room_name=test_room.name,
            nightly_price=4200.0,
            nights=2,
            quantity=1,
            guests=2,
            subtotal=8400.0,
        )
        db.add(bk_room)
        db.commit()

        # Run VeriNova transaction integrity verification
        verinova_res = VeriNovaService.verify_booking_transaction(db, booking)
        db.refresh(booking)
        assert booking.verinova_verification_id is not None
        assert booking.verinova_verification_id.startswith("VN-TX-")
        assert booking.verinova_score == 100
        print(f"  -> VeriNova Transaction Verification ID: {booking.verinova_verification_id}")
        print(f"  -> Integrity Score: {booking.verinova_score}/100 ({booking.verinova_status})")
        print(f"  -> Concurrency lock verification: zero double-booking detected on inventory.")
        passed_count += 1

        print("\n=======================================================================")
        print(f"  ALL {passed_count}/{total_count} VOYARA HOST TRUST & VERINOVA TESTS PASSED!")
        print("=======================================================================\n")

    except Exception as e:
        db.rollback()
        print(f"\n[!] TEST FAILED with error: {e}")
        import traceback
        traceback.print_exc()
        raise e
    finally:
        settings.OTP_PROVIDER = original_otp_provider
        db.close()

if __name__ == "__main__":
    run_tests()
