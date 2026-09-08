from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import or_, desc, asc
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.auth.dependencies import get_current_user, get_current_admin
from app.models.user import User, UserRole
from app.models.support import SupportTicket, SupportMessage, TicketStatus

router = APIRouter(prefix="/support", tags=["Support"])

class TicketCreateSchema(BaseModel):
    subject: str
    category: Optional[str] = "General Inquiry"
    booking_id: Optional[int] = None
    message: str

class TicketReplySchema(BaseModel):
    admin_response: Optional[str] = None
    message: Optional[str] = None
    status: Optional[str] = None

class UserReplySchema(BaseModel):
    message: str

def format_ticket_dict(ticket: SupportTicket, include_messages: bool = True):
    user_data = None
    if ticket.user:
        user_data = {
            "id": ticket.user.id,
            "name": ticket.user.name,
            "email": ticket.user.email,
            "phone": ticket.user.phone or "Not provided",
            "role": ticket.user.role.value if hasattr(ticket.user.role, "value") else str(ticket.user.role),
            "avatar_url": ticket.user.avatar_url,
            "created_at": ticket.user.created_at,
        }

    messages_data = []
    if include_messages and ticket.messages:
        for m in ticket.messages:
            messages_data.append({
                "id": m.id,
                "ticket_id": m.ticket_id,
                "sender_id": m.sender_id,
                "sender_role": m.sender_role,
                "sender_name": m.sender_name,
                "message": m.message,
                "created_at": m.created_at,
            })

    return {
        "id": ticket.id,
        "user_id": ticket.user_id,
        "booking_id": ticket.booking_id,
        "subject": ticket.subject,
        "category": ticket.category,
        "message": ticket.message,
        "status": ticket.status.value if hasattr(ticket.status, "value") else str(ticket.status),
        "admin_response": ticket.admin_response,
        "created_at": ticket.created_at,
        "updated_at": ticket.updated_at,
        "user": user_data,
        "user_name": ticket.user.name if ticket.user else "User",
        "user_email": ticket.user.email if ticket.user else "",
        "user_phone": ticket.user.phone if ticket.user else "Not provided",
        "user_role": ticket.user.role.value if (ticket.user and hasattr(ticket.user.role, "value")) else (ticket.user.role if ticket.user else "CUSTOMER"),
        "messages_count": len(ticket.messages) if ticket.messages else 0,
        "messages": messages_data,
    }

@router.post("/tickets")
def create_ticket(
    payload: TicketCreateSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a support inquiry ticket with first message in thread."""
    if not payload.subject or not payload.subject.strip():
        raise HTTPException(status_code=400, detail="Subject is required")
    if not payload.message or not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message is required")

    ticket = SupportTicket(
        user_id=current_user.id,
        booking_id=payload.booking_id,
        subject=payload.subject.strip(),
        category=payload.category.strip() if payload.category else "General Inquiry",
        message=payload.message.strip(),
        status=TicketStatus.OPEN
    )
    db.add(ticket)
    db.flush()

    sender_role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    first_msg = SupportMessage(
        ticket_id=ticket.id,
        sender_id=current_user.id,
        sender_role=sender_role,
        sender_name=current_user.name or "User",
        message=payload.message.strip(),
        created_at=datetime.utcnow()
    )
    db.add(first_msg)
    db.commit()
    db.refresh(ticket)
    return format_ticket_dict(ticket, include_messages=True)

@router.get("/my-tickets")
def get_my_tickets(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all support tickets submitted by current user with message history."""
    tickets = (
        db.query(SupportTicket)
        .options(joinedload(SupportTicket.messages), joinedload(SupportTicket.user))
        .filter(SupportTicket.user_id == current_user.id)
        .order_by(SupportTicket.updated_at.desc(), SupportTicket.created_at.desc())
        .all()
    )
    return [format_ticket_dict(t, include_messages=True) for t in tickets]

@router.get("/tickets/{ticket_id}")
def get_ticket_details(
    ticket_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get single ticket details with full conversation history."""
    ticket = (
        db.query(SupportTicket)
        .options(joinedload(SupportTicket.messages), joinedload(SupportTicket.user))
        .filter(SupportTicket.id == ticket_id)
        .first()
    )
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Support ticket not found")

    is_admin = current_user.role == UserRole.ADMIN or (hasattr(current_user.role, "value") and current_user.role.value == "ADMIN")
    if ticket.user_id != current_user.id and not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this ticket")

    return format_ticket_dict(ticket, include_messages=True)

@router.get("/admin/tickets")
def get_all_tickets_admin(
    status_filter: Optional[str] = Query(None, alias="status"),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    date_sort: Optional[str] = Query("desc"),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Admin endpoint to inspect all platform support inquiries with rich filtering:
    - status: OPEN / IN_PROGRESS / RESOLVED / ALL
    - category: filter by category
    - search: keyword search in user name, email, subject, message
    - date_sort: 'desc' (newest first) or 'asc' (oldest first)
    """
    query = (
        db.query(SupportTicket)
        .join(SupportTicket.user)
        .options(joinedload(SupportTicket.messages), joinedload(SupportTicket.user))
    )

    # Status filter
    if status_filter and status_filter.upper() != "ALL":
        normalized_status = status_filter.upper()
        if normalized_status == "NEW":
            normalized_status = "OPEN"
        if normalized_status in [s.value for s in TicketStatus]:
            query = query.filter(SupportTicket.status == TicketStatus[normalized_status])

    # Category filter
    if category and category.strip() and category.upper() != "ALL":
        query = query.filter(SupportTicket.category == category.strip())

    # Search filter
    if search and search.strip():
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                User.name.ilike(s),
                User.email.ilike(s),
                SupportTicket.subject.ilike(s),
                SupportTicket.message.ilike(s)
            )
        )

    # Date ordering
    if date_sort and date_sort.lower() == "asc":
        query = query.order_by(asc(SupportTicket.created_at))
    else:
        query = query.order_by(desc(SupportTicket.created_at))

    tickets = query.all()
    return [format_ticket_dict(t, include_messages=True) for t in tickets]

@router.post("/admin/tickets/{ticket_id}/reply")
def reply_ticket_admin(
    ticket_id: int,
    payload: TicketReplySchema,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin reply to a user support inquiry and update ticket status."""
    ticket = (
        db.query(SupportTicket)
        .options(joinedload(SupportTicket.messages), joinedload(SupportTicket.user))
        .filter(SupportTicket.id == ticket_id)
        .first()
    )
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Support ticket not found")

    reply_text = payload.admin_response or payload.message
    if not reply_text or not reply_text.strip():
        raise HTTPException(status_code=400, detail="Reply message cannot be empty")

    reply_text = reply_text.strip()

    # Create message in conversation
    admin_msg = SupportMessage(
        ticket_id=ticket.id,
        sender_id=admin.id,
        sender_role="ADMIN",
        sender_name=admin.name or "Voyara Concierge Admin",
        message=reply_text,
        created_at=datetime.utcnow()
    )
    db.add(admin_msg)

    # Update ticket response and status
    ticket.admin_response = reply_text
    if payload.status:
        st_upper = payload.status.upper()
        if st_upper == "NEW":
            st_upper = "OPEN"
        if st_upper in [s.value for s in TicketStatus]:
            ticket.status = TicketStatus[st_upper]
    else:
        ticket.status = TicketStatus.RESOLVED

    ticket.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(ticket)
    return format_ticket_dict(ticket, include_messages=True)

@router.post("/tickets/{ticket_id}/reply")
def reply_ticket_user(
    ticket_id: int,
    payload: UserReplySchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """User (or Admin) posts a follow-up reply in the support conversation."""
    ticket = (
        db.query(SupportTicket)
        .options(joinedload(SupportTicket.messages), joinedload(SupportTicket.user))
        .filter(SupportTicket.id == ticket_id)
        .first()
    )
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Support ticket not found")

    is_admin = current_user.role == UserRole.ADMIN or (hasattr(current_user.role, "value") and current_user.role.value == "ADMIN")
    if ticket.user_id != current_user.id and not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this ticket")

    if not payload.message or not payload.message.strip():
        raise HTTPException(status_code=400, detail="Reply message cannot be empty")

    sender_role = "ADMIN" if is_admin else (current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role))
    user_msg = SupportMessage(
        ticket_id=ticket.id,
        sender_id=current_user.id,
        sender_role=sender_role,
        sender_name=current_user.name or "User",
        message=payload.message.strip(),
        created_at=datetime.utcnow()
    )
    db.add(user_msg)

    # If user replies to a resolved ticket, change status back to IN_PROGRESS or OPEN
    if not is_admin and ticket.status == TicketStatus.RESOLVED:
        ticket.status = TicketStatus.IN_PROGRESS

    ticket.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(ticket)
    return format_ticket_dict(ticket, include_messages=True)

