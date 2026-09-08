from app.database import engine, Base
from sqlalchemy import text
from app.models.review import Review

def run_migration():
    # Connect with AUTOCOMMIT isolation level so ALTER TYPE can execute without a transaction block
    autocommit_engine = engine.execution_options(isolation_level="AUTOCOMMIT")
    with autocommit_engine.connect() as conn:
        print("Migrating PostgreSQL enums and tables...")
        
        # Check current enum values
        res = conn.execute(text("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'bookingstatus';"))
        labels = [r[0] for r in res]
        print(f"Current labels in bookingstatus enum: {labels}")
        
        if "COMPLETED" not in labels:
            try:
                conn.execute(text("ALTER TYPE bookingstatus ADD VALUE 'COMPLETED';"))
                print("Successfully added 'COMPLETED' to enum bookingstatus.")
            except Exception as e:
                print(f"Error adding COMPLETED: {e}")
        else:
            print("'COMPLETED' already exists in enum bookingstatus.")

        if "FAILED" not in labels:
            try:
                conn.execute(text("ALTER TYPE bookingstatus ADD VALUE 'FAILED';"))
                print("Successfully added 'FAILED' to enum bookingstatus.")
            except Exception as e:
                print(f"Error adding FAILED: {e}")

        # Check updated enum values
        res = conn.execute(text("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'bookingstatus';"))
        updated_labels = [r[0] for r in res]
        print(f"Updated labels in bookingstatus enum: {updated_labels}")

        # Verify tables
        Base.metadata.create_all(bind=engine)
        print("Successfully verified all table schemas in PostgreSQL.")

if __name__ == "__main__":
    run_migration()
