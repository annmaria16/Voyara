from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_user, get_current_admin
from app.models.user import User
from app.models.support import SupportTicket, TicketStatus

router = APIRouter(prefix="/support", tags=["Support"])

class TicketCreateSchema(BaseModel):
    subject: str
    category: Optional[str] = "General Inquiry"
    booking_id: Optional[int] = None
    message: str

class TicketReplySchema(BaseModel):
    admin_response: str
    status: Optional[str] = "RESOLVED"

@router.post("/tickets")
def create_ticket(
    payload: TicketCreateSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a support inquiry ticket."""
    ticket = SupportTicket(
        user_id=current_user.id,
        booking_id=payload.booking_id,
        subject=payload.subject,
        category=payload.category or "General Inquiry",
        message=payload.message,
        status=TicketStatus.OPEN
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return {
        "id": ticket.id,
        "subject": ticket.subject,
        "category": ticket.category,
        "status": ticket.status.value,
        "created_at": ticket.created_at
    }

@router.get("/my-tickets")
def get_my_tickets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all support tickets submitted by current user."""
    tickets = db.query(SupportTicket).filter(SupportTicket.user_id == current_user.id).order_by(SupportTicket.created_at.desc()).all()
    return [
        {
            "id": t.id,
            "subject": t.subject,
            "category": t.category,
            "message": t.message,
            "status": t.status.value,
            "admin_response": t.admin_response,
            "booking_id": t.booking_id,
            "created_at": t.created_at,
            "updated_at": t.updated_at
        }
        for t in tickets
    ]

@router.get("/admin/tickets")
def get_all_tickets_admin(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin endpoint to inspect all platform support inquiries."""
    tickets = db.query(SupportTicket).order_by(SupportTicket.created_at.desc()).all()
    return [
        {
            "id": t.id,
            "user_name": t.user.name if t.user else "User",
            "user_email": t.user.email if t.user else "",
            "subject": t.subject,
            "category": t.category,
            "message": t.message,
            "status": t.status.value,
            "admin_response": t.admin_response,
            "booking_id": t.booking_id,
            "created_at": t.created_at,
            "updated_at": t.updated_at
        }
        for t in tickets
    ]

@router.post("/admin/tickets/{ticket_id}/reply")
def reply_ticket_admin(
    ticket_id: int,
    payload: TicketReplySchema,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin reply to a user support inquiry."""
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    ticket.admin_response = payload.admin_response
    if payload.status:
        ticket.status = TicketStatus[payload.status.upper()]
    db.commit()
    db.refresh(ticket)
    return {
        "id": ticket.id,
        "status": ticket.status.value,
        "admin_response": ticket.admin_response,
        "updated_at": ticket.updated_at
    }
