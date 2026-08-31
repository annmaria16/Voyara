import unittest
from services.shopping.shopping_verifier import verify_product

class TestShoppingVerifier(unittest.TestCase):
    def test_category_mismatch(self):
        product = {
            "title": "Laptop Bag",
            "category": "accessory",
            "price": 999,
            "url": "http://example.com/bag"
        }
        criteria = {
            "category": "laptop",
            "budget_max": 60000
        }
        self.assertFalse(verify_product(product, criteria)["verified"])

    def test_ram_mismatch(self):
        product = {
            "category": "laptop",
            "ram_gb": 8,
            "price": 55000,
            "url": "http://example.com/laptop"
        }
        criteria = {
            "category": "laptop",
            "ram_gb": 16,
            "budget_max": 60000
        }
        self.assertFalse(verify_product(product, criteria)["verified"])

    def test_correct_product(self):
        product = {
            "category": "laptop",
            "brand": "HP",
            "ram_gb": 16,
            "storage_gb": 512,
            "storage_type": "SSD",
            "price": 57999,
            "url": "http://example.com/hp"
        }
        criteria = {
            "category": "laptop",
            "brand": "HP",
            "ram_gb": 16,
            "storage_gb": 512,
            "budget_max": 60000
        }
        self.assertTrue(verify_product(product, criteria)["verified"])

    def test_missing_specification(self):
        # If the user explicitly requires 16GB RAM:
        product = {
            "category": "laptop",
            "price": 55000,
            "url": "http://example.com/laptop"
        }
        criteria = {
            "category": "laptop",
            "ram_gb": 16,
            "budget_max": 60000
        }
        self.assertFalse(verify_product(product, criteria)["verified"])

    def test_fake_accessory(self):
        product = {
            "title": "Laptop Stand",
            "category": "accessory",
            "price": 1200,
            "url": "http://example.com/stand"
        }
        self.assertFalse(verify_product(product, {"category": "laptop", "budget_max": 60000})["verified"])


class TestPasswordChangeSecurity(unittest.TestCase):
    def setUp(self):
        from database import SessionLocal
        import models
        import auth

        self.db = SessionLocal()
        self.email = "pwd_test_user@example.com"
        self.old_password = "OldPassword123!"

        # Cleanup existing test user
        existing = self.db.query(models.User).filter(models.User.email == self.email).first()
        if existing:
            self.db.delete(existing)
            self.db.commit()

        # Create fresh test user
        self.user = models.User(
            fullname="Password Test User",
            email=self.email,
            password=auth.get_password_hash(self.old_password),
            provider="email",
            role="user"
        )
        self.db.add(self.user)
        self.db.commit()
        self.db.refresh(self.user)

    def tearDown(self):
        import models
        existing = self.db.query(models.User).filter(models.User.email == self.email).first()
        if existing:
            self.db.delete(existing)
            self.db.commit()
        self.db.close()

    def test_incorrect_current_password(self):
        from main import change_user_password
        import schemas
        from fastapi import HTTPException

        req = schemas.PasswordChange(
            current_password="WrongPassword123!",
            new_password="NewPassword123!"
        )
        with self.assertRaises(HTTPException) as ctx:
            change_user_password(req, self.db, self.user)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertEqual(ctx.exception.detail, "Current password is incorrect.")

    def test_same_old_and_new_password(self):
        from main import change_user_password
        import schemas
        from fastapi import HTTPException

        req = schemas.PasswordChange(
            current_password=self.old_password,
            new_password=self.old_password
        )
        with self.assertRaises(HTTPException) as ctx:
            change_user_password(req, self.db, self.user)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertEqual(ctx.exception.detail, "New password must be different from your current password.")

    def test_weak_new_password_no_special_char(self):
        from main import change_user_password
        import schemas
        from fastapi import HTTPException

        req = schemas.PasswordChange(
            current_password=self.old_password,
            new_password="NewPassword123"
        )
        with self.assertRaises(HTTPException) as ctx:
            change_user_password(req, self.db, self.user)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("at least 8 characters", ctx.exception.detail)

    def test_successful_password_update_and_revocation(self):
        from main import change_user_password
        import schemas
        import auth
        import models
        from datetime import datetime, timedelta

        session = models.UserSession(
            user_id=self.user.id,
            session_token="test_session_token_123",
            expires_at=datetime.utcnow() + timedelta(days=1)
        )
        self.db.add(session)
        self.db.commit()

        new_password = "NewSecurePassword99!"
        req = schemas.PasswordChange(
            current_password=self.old_password,
            new_password=new_password
        )

        res = change_user_password(req, self.db, self.user)
        self.assertEqual(res["message"], "Password updated successfully.")

        remaining_sessions = self.db.query(models.UserSession).filter(models.UserSession.user_id == self.user.id).all()
        self.assertEqual(len(remaining_sessions), 0)

        refreshed_user = self.db.query(models.User).filter(models.User.id == self.user.id).first()
        self.assertFalse(auth.verify_password(self.old_password, refreshed_user.password))
        self.assertTrue(auth.verify_password(new_password, refreshed_user.password))


class TestSupportSystemInbox(unittest.TestCase):
    def setUp(self):
        from database import SessionLocal
        import models
        import auth

        self.db = SessionLocal()
        from sqlalchemy import text
        self.db.execute(text("ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS user_read BOOLEAN DEFAULT TRUE;"))
        self.db.commit()

        self.user_email = "support_user@example.com"
        self.admin_email = "support_admin@example.com"

        # Cleanup existing test users
        for email in [self.user_email, self.admin_email]:
            existing = self.db.query(models.User).filter(models.User.email == email).first()
            if existing:
                self.db.delete(existing)
        self.db.commit()

        # Create user & admin
        self.user = models.User(
            fullname="Support Test User",
            email=self.user_email,
            password=auth.get_password_hash("Password123!"),
            provider="email",
            role="user"
        )
        self.admin = models.User(
            fullname="Support Admin User",
            email=self.admin_email,
            password=auth.get_password_hash("Password123!"),
            provider="email",
            role="admin"
        )
        self.db.add_all([self.user, self.admin])
        self.db.commit()
        self.db.refresh(self.user)
        self.db.refresh(self.admin)

    def tearDown(self):
        import models
        self.db.query(models.ContactMessage).filter(models.ContactMessage.user_id == self.user.id).delete()
        for email in [self.user_email, self.admin_email]:
            existing = self.db.query(models.User).filter(models.User.email == email).first()
            if existing:
                self.db.delete(existing)
        self.db.commit()
        self.db.close()

    def test_full_support_flow_user_sends_admin_replies_user_views(self):
        from main import (
            create_contact_message,
            get_user_contact_messages,
            admin_get_contact_messages,
            admin_reply_contact_message,
            mark_user_contact_messages_read,
        )
        import schemas
        import models

        # Step 1: User submits support message
        create_req = schemas.ContactMessageCreate(
            subject="Billing Question",
            message="Can you provide an invoice for my plan?"
        )
        submit_res = create_contact_message(create_req, self.db, self.user)
        self.assertEqual(submit_res["message"], "Your message has been sent successfully.")

        # Step 2: Admin checks inbox and finds the message
        admin_inbox = admin_get_contact_messages(self.db, self.admin)
        user_msgs = [m for m in admin_inbox if m.user_id == self.user.id]
        self.assertEqual(len(user_msgs), 1)
        msg = user_msgs[0]
        self.assertEqual(msg.subject, "Billing Question")
        self.assertEqual(msg.status, "new")

        # Step 3: Admin replies to message
        reply_req = schemas.ContactMessageReply(
            admin_reply="Hello! Your invoice has been generated and sent to your email."
        )
        reply_res = admin_reply_contact_message(msg.id, reply_req, self.db, self.admin)
        self.assertEqual(reply_res.status, "replied")
        self.assertEqual(reply_res.admin_reply, "Hello! Your invoice has been generated and sent to your email.")
        self.assertFalse(reply_res.user_read)

        # Step 4: User fetches their messages and sees admin reply
        user_inbox = get_user_contact_messages(self.db, self.user)
        self.assertEqual(len(user_inbox), 1)
        self.assertEqual(user_inbox[0].status, "replied")
        self.assertEqual(user_inbox[0].admin_reply, "Hello! Your invoice has been generated and sent to your email.")
        self.assertFalse(user_inbox[0].user_read)

        # Step 5: User opens support page and marks messages as read
        read_res = mark_user_contact_messages_read(self.db, self.user)
        self.assertEqual(read_res["message"], "Messages marked as read.")

        refreshed_inbox = get_user_contact_messages(self.db, self.user)
        self.assertTrue(refreshed_inbox[0].user_read)


if __name__ == "__main__":
    unittest.main()
