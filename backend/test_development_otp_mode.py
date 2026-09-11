import sys
import os
import secrets
import uuid
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import HTTPException
from app.config import settings
from app.database import SessionLocal
from app.models.user import User, UserRole, AccountStatus
from app.models.provider import ProviderProfile
from app.services.auth.otp_service import OtpService, hash_code, clean_indian_phone_strict
from app.services.sms.sms_service import SmsService
from app.services.auth.auth_service import AuthService
from app.schemas.auth import RegisterRequest, LoginRequest
from app.main import validate_security_configuration

def run_dev_otp_tests():
    print("=======================================================================")
    print("  VOYARA: SAFE DEVELOPMENT OTP & 2FACTOR CREDIT PROTECTION TEST SUITE")
    print("=======================================================================\n")

    db = SessionLocal()
    passed_count = 0
    total_count = 6

    try:
        # ---------------------------------------------------------------------
        # TEST 1: Development OTP Generation & Zero 2Factor API Calls
        # ---------------------------------------------------------------------
        print("[TEST 1/6] Development OTP Mode - Zero 2Factor API Requests...")
        settings.OTP_PROVIDER = "development"
        settings.ENVIRONMENT = "development"

        test_phone = f"98{secrets.randbelow(89999999) + 10000000}"
        test_email = f"test_dev_host_{uuid.uuid4().hex[:6]}@voyaratest.com"

        # Create user
        host_user = User(
            name="Dev Test Host",
            email=test_email,
            phone=f"+91{test_phone}",
            hashed_password="TestPassword123!",
            role=UserRole.PROVIDER,
            is_active=True,
            phone_verified=False,
            email_verified=False
        )
        db.add(host_user)
        db.commit()
        db.refresh(host_user)

        with patch("requests.get") as mock_get, patch("requests.post") as mock_post:
            otp_res = OtpService.send_phone_otp(db, test_phone, user_id=host_user.id)
            assert otp_res["success"] is True
            # Assert that no 2Factor or outbound HTTP request was made
            mock_get.assert_not_called()
            mock_post.assert_not_called()

        db.refresh(host_user)
        assert host_user.phone_otp_hash is not None
        assert host_user.phone_otp_expires_at is not None
        print("  -> Passed: No outbound SMS HTTP call made. 2Factor credits 100% protected.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 2: Development OTP Verification with Fixed Code (123456)
        # ---------------------------------------------------------------------
        print("\n[TEST 2/6] Development OTP Verification with '123456'...")
        # Verify with wrong code first
        try:
            OtpService.verify_phone_otp(db, test_phone, "999999", user_id=host_user.id)
            assert False, "Should reject wrong code"
        except HTTPException as he:
            assert "incorrect" in he.detail.lower() or "attempt" in he.detail.lower()

        # Verify with development OTP 123456
        verify_res = OtpService.verify_phone_otp(db, test_phone, "123456", user_id=host_user.id)
        assert verify_res["success"] is True
        assert verify_res["phone_verified"] is True

        db.refresh(host_user)
        assert host_user.phone_verified is True
        assert host_user.phone_otp_hash is None  # Single-use cleared
        assert host_user.phone_otp_expires_at is None
        print("  -> Passed: Development OTP '123456' accepted and single-use cleared.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 3: Resend Invalidation & 5-Attempt Lockout
        # ---------------------------------------------------------------------
        print("\n[TEST 3/6] Resend Invalidation & 5-Attempt Lockout Protection...")
        test_phone_2 = f"98{secrets.randbelow(89999999) + 10000000}"
        host_user_2 = User(
            name="Dev Test Host 2",
            email=f"test_dev2_{uuid.uuid4().hex[:6]}@voyaratest.com",
            phone=f"+91{test_phone_2}",
            hashed_password="TestPassword123!",
            role=UserRole.PROVIDER,
            is_active=True,
            phone_verified=False,
            email_verified=False
        )
        db.add(host_user_2)
        db.commit()
        db.refresh(host_user_2)

        OtpService.send_phone_otp(db, test_phone_2, user_id=host_user_2.id)
        
        # Test 5 incorrect attempts
        for attempt in range(1, 6):
            try:
                OtpService.verify_phone_otp(db, test_phone_2, f"00000{attempt}", user_id=host_user_2.id)
            except HTTPException as he:
                pass

        db.refresh(host_user_2)
        # 6th attempt must indicate invalidated OTP
        try:
            OtpService.verify_phone_otp(db, test_phone_2, "123456", user_id=host_user_2.id)
            assert False, "Should reject locked OTP"
        except HTTPException as he:
            assert "invalidated" in he.detail.lower() or "too many" in he.detail.lower()

        print("  -> Passed: 5 failed attempts locked and invalidated OTP.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 4: Real 2Factor Mode Calls API & Rejects Dev Bypass
        # ---------------------------------------------------------------------
        print("\n[TEST 4/6] Real 2Factor Mode Triggering...")
        settings.OTP_PROVIDER = "2factor"
        settings.TWOFACTOR_API_KEY = "test_2factor_dummy_key"

        test_phone_3 = f"98{secrets.randbelow(89999999) + 10000000}"
        host_user_3 = User(
            name="Live Test Host",
            email=f"test_live_{uuid.uuid4().hex[:6]}@voyaratest.com",
            phone=f"+91{test_phone_3}",
            hashed_password="TestPassword123!",
            role=UserRole.PROVIDER,
            is_active=True,
            phone_verified=False,
            email_verified=False
        )
        db.add(host_user_3)
        db.commit()
        db.refresh(host_user_3)

        with patch("requests.get") as mock_2factor_get:
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.text = '{"Status": "Success", "Details": "OTP-Sent"}'
            mock_2factor_get.return_value = mock_resp

            OtpService.send_phone_otp(db, test_phone_3, user_id=host_user_3.id)
            # Verify 2Factor endpoint was called with correct parameters
            mock_2factor_get.assert_called_once()
            called_url = mock_2factor_get.call_args[0][0]
            assert "2factor.in" in called_url
            assert test_phone_3 in called_url

        print("  -> Passed: Real 2Factor mode successfully connects to 2Factor endpoint.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 5: Production Security Enforcement (Refuse Dev Mode in Production)
        # ---------------------------------------------------------------------
        print("\n[TEST 5/6] Production Security Guard (Fail-Safe Startup Check)...")
        settings.ENVIRONMENT = "production"
        settings.OTP_PROVIDER = "development"

        # Startup check must refuse to run
        try:
            validate_security_configuration()
            assert False, "Should raise RuntimeError when running in production with dev OTP"
        except RuntimeError as re:
            assert "critical security error" in str(re).lower()
            print(f"  -> Caught expected startup guard: {re}")

        # Verification must also reject dev OTP in production
        db.refresh(host_user_3)
        try:
            OtpService.verify_phone_otp(db, test_phone_3, "123456", user_id=host_user_3.id)
            assert False, "Production mode must strictly reject fixed dev OTP '123456'"
        except HTTPException:
            pass

        # Reset back to development mode
        settings.ENVIRONMENT = "development"
        settings.OTP_PROVIDER = "development"
        print("  -> Passed: Production mode strictly blocks development OTP and fails safely.")
        passed_count += 1

        # ---------------------------------------------------------------------
        # TEST 6: End-to-End Host Registration with Dev OTP Mode
        # ---------------------------------------------------------------------
        print("\n[TEST 6/6] End-to-End Host Registration with Dev OTP Mode...")
        reg_email = f"e2e_dev_host_{uuid.uuid4().hex[:6]}@voyaratest.com"
        reg_phone = f"98{secrets.randbelow(89999999) + 10000000}"

        host_reg = RegisterRequest(
            name="E2E Dev Host",
            email=reg_email,
            phone=reg_phone,
            password="SecurePassword123!",
            role=UserRole.PROVIDER,
            business_name="Wayanad Coffee Retreat"
        )
        reg_res = AuthService.register(db, host_reg)
        assert reg_res["success"] is True
        assert reg_res["verification_required"] is True

        created_host = db.query(User).filter(User.email == reg_email).first()
        assert created_host is not None
        assert created_host.phone_verified is False

        # Host verifies phone with dev OTP
        phone_v = OtpService.verify_phone_otp(db, reg_phone, "123456", user_id=created_host.id)
        assert phone_v["phone_verified"] is True

        # Host verifies email
        db.refresh(created_host)
        created_host.email_verified = True
        db.commit()

        # Login
        login_res = AuthService.login(db, LoginRequest(email=reg_email, password="SecurePassword123!"))
        assert "access_token" in login_res
        assert login_res["user"]["phone_verified"] is True
        assert login_res["user"]["email_verified"] is True

        print("  -> Passed: Full E2E Host Registration completed seamlessly with Dev OTP mode.")
        passed_count += 1

        print("\n=======================================================================")
        print(f"  ALL {passed_count}/{total_count} SAFE DEV OTP & 2FACTOR TESTS PASSED (100%)!")
        print("=======================================================================\n")

    except Exception as e:
        db.rollback()
        print(f"\n[!] TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        raise e
    finally:
        settings.ENVIRONMENT = "development"
        settings.OTP_PROVIDER = "development"
        db.close()

if __name__ == "__main__":
    run_dev_otp_tests()
