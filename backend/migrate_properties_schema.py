from app.database import engine
from sqlalchemy import text

def run_migration():
    with engine.connect() as conn:
        columns_to_add = [
            ("verification_status", "VARCHAR(50) DEFAULT 'PENDING_VERIFICATION' NOT NULL"),
            ("ownership_proof_url", "VARCHAR(500)"),
            ("latitude", "FLOAT"),
            ("longitude", "FLOAT"),
            ("verification_reason", "TEXT"),
            ("verified_by", "INTEGER REFERENCES users(id) ON DELETE SET NULL"),
            ("verified_at", "TIMESTAMP"),
            ("reviewed_by", "INTEGER REFERENCES users(id) ON DELETE SET NULL"),
            ("reviewed_at", "TIMESTAMP"),
        ]

        for col_name, col_type in columns_to_add:
            try:
                conn.execute(text(f"ALTER TABLE properties ADD COLUMN IF NOT EXISTS {col_name} {col_type};"))
                conn.commit()
                print(f"Column '{col_name}' added or verified.")
            except Exception as e:
                print(f"Column '{col_name}' check error: {e}")
                conn.rollback()

        # Update existing seed properties to VERIFIED so demo listings continue working
        try:
            conn.execute(text("""
                UPDATE properties 
                SET verification_status = 'VERIFIED',
                    latitude = COALESCE(latitude, 10.0889),
                    longitude = COALESCE(longitude, 77.0595)
                WHERE verification_status IS NULL OR verification_status = 'PENDING_VERIFICATION';
            """))
            conn.commit()
            print("Existing seed properties marked as VERIFIED with default coordinates.")
        except Exception as e:
            print(f"Error updating seed properties: {e}")
            conn.rollback()

if __name__ == "__main__":
    run_migration()
