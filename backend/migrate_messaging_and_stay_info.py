import os
import sys
from sqlalchemy import create_engine, text, inspect
from app.config import settings
from app.database import Base, engine
from app.models import BookingMessage, SupportTicket, SupportMessage

def run_migration():
    print("[*] Running migration for booking_messages and support_tickets enhancements...")
    
    # 1. Ensure all tables are created
    Base.metadata.create_all(bind=engine)
    print("[+] Base.metadata.create_all executed successfully.")

    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    print(f"[+] Existing tables: {existing_tables}")

    with engine.connect() as conn:
        # Check support_tickets columns
        columns = [c['name'] for c in inspector.get_columns('support_tickets')]
        if 'property_id' not in columns:
            print("[*] Adding property_id column to support_tickets...")
            conn.execute(text("ALTER TABLE support_tickets ADD COLUMN property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL;"))
            conn.commit()
            print("[+] Added property_id column to support_tickets.")
        else:
            print("[+] property_id column already exists in support_tickets.")

        # Check if TicketStatus enum in postgres has WAITING_FOR_USER and CLOSED
        try:
            conn.execute(text("ALTER TYPE ticketstatus ADD VALUE IF NOT EXISTS 'WAITING_FOR_USER';"))
            conn.execute(text("ALTER TYPE ticketstatus ADD VALUE IF NOT EXISTS 'CLOSED';"))
            conn.commit()
            print("[+] Updated postgres enum ticketstatus with WAITING_FOR_USER and CLOSED.")
        except Exception as e:
            print(f"[*] Note on enum update (might not be native PG enum or already updated): {e}")

    print("[OK] Migration completed successfully.")

if __name__ == "__main__":
    run_migration()
