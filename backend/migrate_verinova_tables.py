import sys
import os
from sqlalchemy import text
from app.database import engine, Base
import app.models  # load all models to register with Base

def run_migration():
    print("Starting VeriNova Database Migration...")
    
    # 1. Create tables if they don't exist via Base.metadata
    Base.metadata.create_all(bind=engine)
    print("Base.metadata.create_all completed.")

    # 2. Add columns to properties and bookings if not already present
    with engine.connect() as conn:
        with conn.begin():
            # Properties table additions
            print("Checking properties table columns...")
            conn.execute(text("""
                ALTER TABLE properties 
                ADD COLUMN IF NOT EXISTS evidence_status VARCHAR(50) DEFAULT 'NOT_PROVIDED',
                ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 0,
                ADD COLUMN IF NOT EXISTS trust_assessment_status VARCHAR(50) DEFAULT 'NEEDS_REVIEW',
                ADD COLUMN IF NOT EXISTS property_identity_fingerprint VARCHAR(100);
            """))

            # Bookings table additions
            print("Checking bookings table columns...")
            conn.execute(text("""
                ALTER TABLE bookings
                ADD COLUMN IF NOT EXISTS verinova_verification_id VARCHAR(50),
                ADD COLUMN IF NOT EXISTS verinova_score INTEGER DEFAULT 100,
                ADD COLUMN IF NOT EXISTS verinova_status VARCHAR(50) DEFAULT 'VERIFIED',
                ADD COLUMN IF NOT EXISTS verinova_verified_at TIMESTAMP WITHOUT TIME ZONE;
            """))

            # Create indexes on critical VeriNova fields
            print("Creating VeriNova indexes...")
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_properties_fingerprint ON properties(property_identity_fingerprint);
                CREATE INDEX IF NOT EXISTS idx_bookings_verinova_tx ON bookings(verinova_verification_id);
                CREATE INDEX IF NOT EXISTS idx_verinova_audit_entity ON verinova_audit_logs(entity_type, entity_id);
            """))

    print("VeriNova Database Migration completed successfully!")

if __name__ == "__main__":
    run_migration()
