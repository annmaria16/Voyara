"""
Database Migration Script for Voyara StayGuide AI & Property Home Rules.
Creates property_rules, room_rules, and booking_rule_snapshots tables.
Safe, idempotent, and non-destructive to existing booking data.
"""

import sys
import os

backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from sqlalchemy import text
from app.database import engine, Base
import app.models  # Ensures all models are registered

def run_migration():
    print("Running Voyara StayGuide & Property Home Rules Schema Migration...")
    with engine.begin() as conn:
        # 1. Create property_rules table if not exists
        try:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS property_rules (
                    id SERIAL PRIMARY KEY,
                    property_id INTEGER NOT NULL UNIQUE REFERENCES properties(id) ON DELETE CASCADE,
                    children_allowed VARCHAR(20) DEFAULT 'Yes' NOT NULL,
                    minimum_child_age INTEGER,
                    maximum_children INTEGER,
                    children_charged_separately BOOLEAN DEFAULT FALSE NOT NULL,
                    child_pricing_note VARCHAR(500),
                    cot_policy VARCHAR(50) DEFAULT 'Upon Request' NOT NULL,
                    cot_quantity INTEGER DEFAULT 0,
                    pets_policy VARCHAR(50) DEFAULT 'No' NOT NULL,
                    pet_fee DOUBLE PRECISION DEFAULT 0.0,
                    pet_policy_description VARCHAR(500),
                    smoking_policy VARCHAR(50) DEFAULT 'No' NOT NULL,
                    smoking_policy_description VARCHAR(500),
                    parties_policy VARCHAR(50) DEFAULT 'No' NOT NULL,
                    party_policy_description VARCHAR(500),
                    visitors_policy VARCHAR(50) DEFAULT 'Upon Request' NOT NULL,
                    overnight_visitors_allowed BOOLEAN DEFAULT FALSE NOT NULL,
                    visitor_policy_description VARCHAR(500),
                    quiet_hours_enabled BOOLEAN DEFAULT FALSE NOT NULL,
                    quiet_hours_start VARCHAR(20) DEFAULT '22:00',
                    quiet_hours_end VARCHAR(20) DEFAULT '07:00',
                    check_in_start VARCHAR(20) DEFAULT '14:00',
                    check_in_end VARCHAR(20) DEFAULT '22:00',
                    check_out_time VARCHAR(20) DEFAULT '11:00',
                    early_checkin_policy VARCHAR(50) DEFAULT 'Upon Request' NOT NULL,
                    late_checkout_policy VARCHAR(50) DEFAULT 'Upon Request' NOT NULL,
                    government_id_required BOOLEAN DEFAULT TRUE NOT NULL,
                    minimum_checkin_age INTEGER DEFAULT 18,
                    safety_instructions TEXT,
                    additional_rules TEXT,
                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
                    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
                );
                CREATE INDEX IF NOT EXISTS ix_property_rules_id ON property_rules(id);
                CREATE INDEX IF NOT EXISTS ix_property_rules_property_id ON property_rules(property_id);
            """))
            print("Table property_rules created/verified.")
        except Exception as e:
            print("Notice on property_rules table:", e)

        # 2. Create room_rules table if not exists
        try:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS room_rules (
                    id SERIAL PRIMARY KEY,
                    room_id INTEGER NOT NULL UNIQUE REFERENCES rooms(id) ON DELETE CASCADE,
                    maximum_total_guests INTEGER DEFAULT 2 NOT NULL,
                    maximum_adults INTEGER DEFAULT 2,
                    maximum_children INTEGER DEFAULT 1,
                    children_allowed VARCHAR(50) DEFAULT 'Yes' NOT NULL,
                    minimum_child_age INTEGER,
                    cot_policy VARCHAR(50) DEFAULT 'Upon Request' NOT NULL,
                    cot_quantity INTEGER DEFAULT 0,
                    extra_bed_policy VARCHAR(50) DEFAULT 'Upon Request' NOT NULL,
                    maximum_extra_beds INTEGER DEFAULT 0,
                    extra_bed_price DOUBLE PRECISION DEFAULT 0.0,
                    child_price DOUBLE PRECISION DEFAULT 0.0,
                    room_specific_rules TEXT,
                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
                    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
                );
                CREATE INDEX IF NOT EXISTS ix_room_rules_id ON room_rules(id);
                CREATE INDEX IF NOT EXISTS ix_room_rules_room_id ON room_rules(room_id);
            """))
            print("Table room_rules created/verified.")
        except Exception as e:
            print("Notice on room_rules table:", e)

        # 3. Create booking_rule_snapshots table if not exists
        try:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS booking_rule_snapshots (
                    id SERIAL PRIMARY KEY,
                    booking_id INTEGER NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
                    property_rules_snapshot JSON,
                    room_rules_snapshot JSON,
                    adults INTEGER DEFAULT 1 NOT NULL,
                    children INTEGER DEFAULT 0 NOT NULL,
                    child_ages JSON,
                    cot_count INTEGER DEFAULT 0 NOT NULL,
                    extra_bed_count INTEGER DEFAULT 0 NOT NULL,
                    accepted_by_customer BOOLEAN DEFAULT TRUE NOT NULL,
                    accepted_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
                );
                CREATE INDEX IF NOT EXISTS ix_booking_rule_snapshots_id ON booking_rule_snapshots(id);
                CREATE INDEX IF NOT EXISTS ix_booking_rule_snapshots_booking_id ON booking_rule_snapshots(booking_id);
            """))
            print("Table booking_rule_snapshots created/verified.")
        except Exception as e:
            print("Notice on booking_rule_snapshots table:", e)

    # Ensure all models are created in Base metadata as well
    Base.metadata.create_all(bind=engine)
    print("Voyara StayGuide & Property Home Rules schema migration successfully applied!")

if __name__ == "__main__":
    run_migration()
