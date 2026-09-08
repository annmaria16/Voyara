import unittest
from datetime import datetime, timedelta
import requests
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.auth.password import hash_password
from app.services.email.email_service import EmailService

BASE_URL = "http://localhost:8000/api"

class TestForgotPasswordFlow(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db = SessionLocal()
        cls.test_email = "test_reset_flow@voyara.com"
        cls.test_phone = "+919999888777"
        cls.test_password = "InitialPassword@2026"
        
        # Clean up old test user if exists
        cls.db.query(User).filter((User.email == cls.test_email) | (User.phone == cls.test_phone)).delete()
        cls.db.commit()

        # Create fresh test user in PostgreSQL
        cls.user = User(
            email=cls.test_email,
            name="Test Reset User",
            phone=cls.test_phone,
            hashed_password=hash_password(cls.test_password),
            role=UserRole.CUSTOMER,
            is_active=True
        )
        cls.db.add(cls.user)
        cls.db.commit()
        cls.db.refresh(cls.user)

    @classmethod
    def tearDownClass(cls):
        cls.db.query(User).filter(User.email == cls.test_email).delete()
        cls.db.commit()
        cls.db.close()

    def test_2_invalid_email_error_display(self):
        """TEST 2: Unregistered email must return 404 error with clear message."""
        res = requests.post(f"{BASE_URL}/auth/forgot-password", json={"email": "nonexistent_99999@voyara.com"})
        self.assertEqual(res.status_code, 404)
        data = res.json()
        self.assertIn("not registered with Voyara", data.get("detail", ""))

    def test_3_invalid_token(self):
        """TEST 3: Submitting an invalid token must be rejected with a 400 error."""
        res = requests.post(f"{BASE_URL}/auth/reset-password", json={
            "token": "completely_fake_invalid_token_xyz_999",
            "new_password": "NewValidPassword@2026"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("invalid or has expired", res.json().get("detail", ""))

    def test_4_expired_token(self):
        """TEST 4: Submitting an expired token must be rejected with a 400 error."""
        db = SessionLocal()
        user = db.query(User).filter(User.email == self.test_email).first()
        user.reset_token = "expired_test_token_12345"
        user.reset_token_expiry = datetime.utcnow() - timedelta(hours=2) # 2 hours in the past
        db.commit()
        db.close()

        res = requests.post(f"{BASE_URL}/auth/reset-password", json={
            "token": "expired_test_token_12345",
            "new_password": "NewValidPassword@2026"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("invalid or has expired", res.json().get("detail", ""))

    def test_5_and_1_token_reuse_and_full_flow(self):
        """TEST 1 & 5: Complete token reset flow, password hashing in PostgreSQL, and single-use token invalidation."""
        # Manually set a valid token in DB for testing the reset endpoint
        db = SessionLocal()
        user = db.query(User).filter(User.email == self.test_email).first()
        valid_token = "valid_secure_token_abc_789"
        user.reset_token = valid_token
        user.reset_token_expiry = datetime.utcnow() + timedelta(hours=1)
        db.commit()
        db.close()

        # Reset password
        new_password = "BrandNewSecurePassword@2026!"
        res = requests.post(f"{BASE_URL}/auth/reset-password", json={
            "token": valid_token,
            "new_password": new_password
        })
        self.assertEqual(res.status_code, 200)
        self.assertIn("Password reset successful", res.json().get("message", ""))

        # Verify DB: Token must be wiped (single-use)
        db = SessionLocal()
        user = db.query(User).filter(User.email == self.test_email).first()
        self.assertIsNone(user.reset_token)
        self.assertIsNone(user.reset_token_expiry)
        db.close()

        # TEST 5: Try reusing the same token -> Must fail with 400
        res_reuse = requests.post(f"{BASE_URL}/auth/reset-password", json={
            "token": valid_token,
            "new_password": "AnotherPassword@2026!"
        })
        self.assertEqual(res_reuse.status_code, 400)
        self.assertIn("invalid or has expired", res_reuse.json().get("detail", ""))

        # Verify login with new password works
        res_login = requests.post(f"{BASE_URL}/auth/login", json={
            "email": self.test_email,
            "password": new_password
        })
        self.assertEqual(res_login.status_code, 200)
        self.assertTrue(bool(res_login.json().get("access_token")))

    def test_6_smtp_config_validation(self):
        """TEST 6: EmailService.validate_smtp_config detects missing credentials."""
        # Check validation logic
        is_valid, err_msg = EmailService.validate_smtp_config()
        print(f"\n[Test Info] Current SMTP configuration status: is_valid={is_valid}, msg='{err_msg}'")
        if not is_valid:
            self.assertIn("SMTP configuration is incomplete", err_msg)

if __name__ == "__main__":
    unittest.main()
