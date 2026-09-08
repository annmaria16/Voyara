"""
Database migration script to create support_messages table in PostgreSQL and populate initial messages.
"""
from app.database import engine, Base, SessionLocal
from app.models.support import SupportTicket, SupportMessage
from app.models.user import User, UserRole
from sqlalchemy import text, inspect


def run_migration():
    print("Running migration for support_messages table...")
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()

    if "support_messages" not in existing_tables:
        print("Creating support_messages table...")
        SupportMessage.__table__.create(bind=engine)
        print("support_messages table created successfully.")
    else:
        print("support_messages table already exists.")

    # Populate any existing support tickets with their first message into support_messages
    db = SessionLocal()
    try:
        admin_user = db.query(User).filter(User.role == UserRole.ADMIN).first()
        admin_id = admin_user.id if admin_user else None

        tickets = db.query(SupportTicket).all()
        migrated_count = 0
        for ticket in tickets:
            # Check if ticket already has messages
            existing_msg = db.query(SupportMessage).filter(SupportMessage.ticket_id == ticket.id).first()
            if not existing_msg and ticket.message:
                sender_name = ticket.user.name if ticket.user else "User"
                sender_role = ticket.user.role.value if (ticket.user and hasattr(ticket.user.role, 'value')) else (ticket.user.role if ticket.user else "CUSTOMER")
                initial_msg = SupportMessage(
                    ticket_id=ticket.id,
                    sender_id=ticket.user_id,
                    sender_role=sender_role,
                    sender_name=sender_name,
                    message=ticket.message,
                    created_at=ticket.created_at
                )
                db.add(initial_msg)
                
                # If there is also an admin_response, add that as second message
                if ticket.admin_response and admin_id:
                    admin_msg = SupportMessage(
                        ticket_id=ticket.id,
                        sender_id=admin_id,
                        sender_role="ADMIN",
                        sender_name=admin_user.name if admin_user else "Voyara Concierge Admin",
                        message=ticket.admin_response,
                        created_at=ticket.updated_at
                    )
                    db.add(admin_msg)
                
                migrated_count += 1
        db.commit()
        print(f"Migrated {migrated_count} existing support tickets to support_messages.")
    except Exception as e:
        db.rollback()
        print("Error populating messages:", e)
    finally:
        db.close()


if __name__ == "__main__":
    run_migration()
