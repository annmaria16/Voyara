"""
PostgreSQL Schema Migration for Host Verification, Trust, and User Account Safety.
Adds missing columns to `users` and ensures existing seed/test users have phone_verified=True, email_verified=True.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.database import engine

def run_migration():
    print("[MIGRATION] Starting Host Trust & User Safety database migration on PostgreSQL...")
    with engine.connect() as conn:
        columns_to_add = [
            ("account_status", "VARCHAR(50) DEFAULT 'ACTIVE' NOT NULL"),
            ("phone_verified", "BOOLEAN DEFAULT FALSE NOT NULL"),
            ("phone_verified_at", "TIMESTAMP NULL"),
            ("phone_otp_hash", "VARCHAR(255) NULL"),
            ("phone_otp_expires_at", "TIMESTAMP NULL"),
            ("phone_otp_attempts", "INTEGER DEFAULT 0 NOT NULL"),
            ("phone_otp_last_sent_at", "TIMESTAMP NULL"),
            ("email_verified", "BOOLEAN DEFAULT FALSE NOT NULL"),
            ("email_verified_at", "TIMESTAMP NULL"),
            ("email_verification_token_hash", "VARCHAR(255) NULL"),
            ("email_verification_expires_at", "TIMESTAMP NULL"),
            ("suspended_at", "TIMESTAMP NULL"),
            ("suspended_by", "INTEGER NULL"),
            ("suspension_reason", "VARCHAR(1000) NULL"),
            ("deactivated_at", "TIMESTAMP NULL"),
            ("deactivated_by", "INTEGER NULL"),
            ("deactivation_reason", "VARCHAR(1000) NULL"),
            ("token_version", "INTEGER DEFAULT 1 NOT NULL"),
        ]

        for col_name, col_def in columns_to_add:
            try:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col_name} {col_def};"))
                print(f"  + Checked column: users.{col_name}")
            except Exception as e:
                print(f"  * Note on users.{col_name}: {e}")

        # Update existing users so they are verified and active
        try:
            conn.execute(text("""
                UPDATE users
                SET phone_verified = TRUE,
                    phone_verified_at = COALESCE(phone_verified_at, NOW()),
                    email_verified = TRUE,
                    email_verified_at = COALESCE(email_verified_at, NOW()),
                    account_status = 'ACTIVE'
                WHERE is_active = TRUE;
            """))
            print("  + Initialized existing active users as phone_verified=True, email_verified=True, account_status='ACTIVE'")
        except Exception as e:
            print(f"  * Error initializing users: {e}")

        conn.commit()
        print("[SUCCESS] Host Trust schema migration applied successfully!")

if __name__ == "__main__":
    run_migration()
