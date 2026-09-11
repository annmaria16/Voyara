"""
Migration script for Booking Lifecycle, Cancellation, Refund, Check-in/Check-out, Room Inventory & Review System.
Safe and idempotent.
"""

import sys
import os

backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from sqlalchemy import text
from app.database import engine, Base
import app.models # Ensure all models are registered

def run_migration():
    print("Running Booking Lifecycle & Refund schema migration...")
    with engine.begin() as conn:
        # 1. Update bookingstatus enum in Postgres if enum type is used
        try:
            conn.execute(text("ALTER TYPE bookingstatus ADD VALUE IF NOT EXISTS 'CHECKED_IN';"))
            conn.execute(text("ALTER TYPE bookingstatus ADD VALUE IF NOT EXISTS 'CHECKED_OUT';"))
            print("Enum values CHECKED_IN and CHECKED_OUT added to bookingstatus.")
        except Exception as e:
            print("Notice on enum update (may already exist or VARCHAR):", e)

        # 2. Add columns to properties table
        try:
            conn.execute(text("""
                ALTER TABLE properties 
                ADD COLUMN IF NOT EXISTS cancellation_refund_percentage INTEGER DEFAULT 50 NOT NULL;
            """))
            print("Column cancellation_refund_percentage added to properties.")
        except Exception as e:
            print("Notice on properties table:", e)

        # 3. Add columns to bookings table
        try:
            conn.execute(text("""
                ALTER TABLE bookings 
                ADD COLUMN IF NOT EXISTS cancellation_policy_snapshot TEXT,
                ADD COLUMN IF NOT EXISTS refund_percentage_snapshot DOUBLE PRECISION,
                ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITHOUT TIME ZONE,
                ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
                ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP WITHOUT TIME ZONE,
                ADD COLUMN IF NOT EXISTS checked_out_at TIMESTAMP WITHOUT TIME ZONE,
                ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITHOUT TIME ZONE;
            """))
            print("Lifecycle & snapshot columns added to bookings.")
        except Exception as e:
            print("Notice on bookings table:", e)

        # 4. Create refunds table if not exists
        try:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS refunds (
                    id SERIAL PRIMARY KEY,
                    booking_id INTEGER NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    refund_reference VARCHAR(100) NOT NULL UNIQUE,
                    refund_amount DOUBLE PRECISION NOT NULL,
                    refund_percentage DOUBLE PRECISION NOT NULL,
                    cancellation_fee DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
                    refund_status VARCHAR(50) DEFAULT 'REFUNDED' NOT NULL,
                    refund_reason TEXT,
                    requested_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
                    processed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
                    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
                );
                CREATE INDEX IF NOT EXISTS ix_refunds_id ON refunds(id);
                CREATE INDEX IF NOT EXISTS ix_refunds_booking_id ON refunds(booking_id);
                CREATE INDEX IF NOT EXISTS ix_refunds_user_id ON refunds(user_id);
                CREATE INDEX IF NOT EXISTS ix_refunds_refund_reference ON refunds(refund_reference);
            """))
            print("Refunds table and indexes created/verified.")
        except Exception as e:
            print("Notice on refunds table:", e)

    # Call Base.metadata.create_all to ensure all tables exist
    Base.metadata.create_all(bind=engine)
    print("Schema migration completed successfully!")

if __name__ == "__main__":
    run_migration()
