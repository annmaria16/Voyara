from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User, UserRole
from app.models.ai_booking import AIBookingSession
from app.schemas.payment import PaymentOrderResponse, PaymentFailureRequest
from app.schemas.ai_booking import (
    AIBookingChatRequest,
    AIBookingChatResponse,
    AIBookingCreatePaymentOrderRequest,
    AIBookingVerifyPaymentRequest,
    AIBookingConfirmRequest,
    AIBookingConfirmResponse,
    AIResearchMetricsResponse,
    AIResearchLogItemResponse,
    AISimulationRequest
)
from app.services.ai.booking_agent_service import BookingAgentService
from app.services.ai.booking_execution_service import BookingExecutionService
from app.services.ai.booking_research_service import BookingResearchService

router = APIRouter()

def require_traveler_role(user: User = Depends(get_current_user)) -> User:
    """Enforce that autonomous booking endpoints are strictly accessible only by Customers/Travelers."""
    if user.role == UserRole.PROVIDER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Stay Partners / Providers cannot use Traveler autonomous booking tools. Please use the Provider dashboard."
        )
    return user

def require_admin_role(user: User = Depends(get_current_user)) -> User:
    """Enforce that research simulation & telemetry endpoints are strictly for Admins."""
    if user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required to access AI agent research telemetry."
        )
    return user

# =========================================================================
# TRAVELER AUTONOMOUS BOOKING ENDPOINTS
# =========================================================================

@router.post("/booking/chat", response_model=AIBookingChatResponse)
def chat_booking_agent(
    request: AIBookingChatRequest,
    current_user: User = Depends(require_traveler_role),
    db: Session = Depends(get_db)
):
    """
    Conversational AI booking agent endpoint for travelers.
    Understands natural language requests, checks availability, prepares room configuration,
    and returns rich property/room cards and booking preview cards.
    """
    return BookingAgentService.handle_chat_message(
        db=db,
        traveler_id=current_user.id,
        request=request
    )

@router.post("/booking/create-payment-order", response_model=PaymentOrderResponse)
def create_payment_order_agent(
    request: AIBookingCreatePaymentOrderRequest,
    current_user: User = Depends(require_traveler_role),
    db: Session = Depends(get_db)
):
    """
    Creates a server-side validated Razorpay Order for an AI booking preview.
    Initializes pending booking and payment record with exact preview payable amount.
    """
    return BookingExecutionService.create_payment_order(
        db=db,
        traveler_id=current_user.id,
        request=request
    )

@router.post("/booking/verify-payment", response_model=AIBookingConfirmResponse)
def verify_payment_agent(
    request: AIBookingVerifyPaymentRequest,
    current_user: User = Depends(require_traveler_role),
    db: Session = Depends(get_db)
):
    """
    Verifies the cryptographic HMAC-SHA256 signature returned by Razorpay Checkout.
    Only upon successful verification, marks payment as PAID, confirms booking,
    updates AI session, and triggers VeriNova verification.
    """
    return BookingExecutionService.verify_and_confirm_payment(
        db=db,
        traveler_id=current_user.id,
        request=request
    )

@router.post("/booking/record-payment-failure")
def record_payment_failure_agent(
    request: PaymentFailureRequest,
    current_user: User = Depends(require_traveler_role),
    db: Session = Depends(get_db)
):
    """
    Records a Razorpay checkout window cancellation or gateway failure.
    """
    return BookingExecutionService.record_payment_failure(
        db=db,
        traveler_id=current_user.id,
        request=request
    )

@router.post("/booking/confirm", response_model=AIBookingConfirmResponse)
def confirm_booking_agent(
    request: AIBookingConfirmRequest,
    current_user: User = Depends(require_traveler_role),
    db: Session = Depends(get_db)
):
    """
    Dedicated explicit booking confirmation endpoint.
    Revalidates server preview, executes booking in PostgreSQL transaction with row locks,
    and runs independent VeriNova outcome verification.
    """
    return BookingExecutionService.confirm_and_execute_booking(
        db=db,
        traveler_id=current_user.id,
        request=request
    )

@router.get("/booking/sessions")
def get_traveler_booking_sessions(
    current_user: User = Depends(require_traveler_role),
    db: Session = Depends(get_db)
):
    """List traveler's unique AI booking journeys with structured summaries."""
    sessions = db.query(AIBookingSession).filter(
        AIBookingSession.traveler_id == current_user.id
    ).order_by(AIBookingSession.updated_at.desc()).limit(30).all()

    journeys = []
    seen_ids = set()

    for s in sessions:
        if s.id in seen_ids:
            continue
        seen_ids.add(s.id)

        reqs = s.requirements_json or {}
        # Skip empty sessions with no destination and no messages
        if not reqs.get("destination") and not s.messages:
            continue

        c_in = reqs.get("check_in")
        c_out = reqs.get("check_out")
        adults = reqs.get("adults", 2)
        children = reqs.get("children", 0)
        room_type = reqs.get("room_type")

        # Format dates
        dates_disp = ""
        if c_in and c_out:
            try:
                d1 = date.fromisoformat(c_in)
                d2 = date.fromisoformat(c_out)
                dates_disp = f"{d1.strftime('%d %b')} – {d2.strftime('%d %b %Y')}"
            except Exception:
                dates_disp = f"{c_in} → {c_out}"

        # Format guests
        guest_parts = []
        if adults:
            guest_parts.append(f"{adults} Adult{'s' if adults > 1 else ''}")
        if children:
            guest_parts.append(f"{children} Child{'ren' if children > 1 else ''}")
        guests_disp = ", ".join(guest_parts) if guest_parts else "2 Adults"

        # Check booking reference
        b_num = None
        if s.booking:
            b_num = s.booking.booking_number
            status_disp = "CONFIRMED"
        elif s.status.value == "AWAITING_CONFIRMATION":
            status_disp = "AWAITING_CONFIRMATION"
        elif s.status.value == "COMPLETED":
            status_disp = "CONFIRMED"
        else:
            status_disp = s.status.value

        journeys.append({
            "id": s.id,
            "session_id": s.id,
            "conversation_id": s.conversation_id,
            "status": status_disp,
            "destination": reqs.get("destination") or "Journey Request",
            "dates_formatted": dates_disp,
            "guests_formatted": guests_disp,
            "room_type": room_type,
            "booking_number": b_num,
            "requirements": reqs,
            "selected_property_id": s.selected_property_id,
            "selected_room_id": s.selected_room_id,
            "booking_id": s.booking_id,
            "created_at": s.created_at.isoformat(),
            "updated_at": s.updated_at.isoformat()
        })

    return journeys

@router.get("/booking/sessions/{session_id}")
def get_session_detail(
    session_id: str,
    current_user: User = Depends(require_traveler_role),
    db: Session = Depends(get_db)
):
    """Retrieve full message history and current state for a specific session."""
    session = db.query(AIBookingSession).filter(
        AIBookingSession.id == session_id,
        AIBookingSession.traveler_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking session not found.")

    return {
        "id": session.id,
        "conversation_id": session.conversation_id,
        "status": session.status.value,
        "requirements": session.requirements_json,
        "selected_property_id": session.selected_property_id,
        "selected_room_id": session.selected_room_id,
        "booking_id": session.booking_id,
        "messages": [
            {
                "id": m.id,
                "sender": m.sender,
                "text": m.text,
                "intent": m.intent,
                "requires_user_action": m.requires_user_action,
                "action": m.action,
                "properties": m.properties_payload,
                "rooms": m.rooms_payload,
                "alternatives": m.alternatives_payload or [],
                "booking_preview": m.booking_preview_payload,
                "booking": m.booking_payload,
                "verification": m.verification_payload,
                "created_at": m.created_at.isoformat()
            }
            for m in session.messages
        ]
    }

# =========================================================================
# ADMIN RESEARCH & TELEMETRY ENDPOINTS
# =========================================================================

@router.get("/admin/ai-agent-research/metrics", response_model=AIResearchMetricsResponse)
def get_research_metrics(
    current_user: User = Depends(require_admin_role),
    db: Session = Depends(get_db)
):
    """Retrieve aggregate research metrics including False Success Rate, Latencies, and Detection Rate."""
    return BookingResearchService.get_research_metrics(db=db)

@router.get("/admin/ai-agent-research/logs", response_model=List[AIResearchLogItemResponse])
def get_research_logs(
    limit: int = 50,
    include_simulations: bool = True,
    current_user: User = Depends(require_admin_role),
    db: Session = Depends(get_db)
):
    """Retrieve audit logs of autonomous booking agent tasks and VeriNova verification checks."""
    return BookingResearchService.get_research_logs(
        db=db,
        limit=limit,
        include_simulations=include_simulations
    )

@router.post("/admin/ai-agent-research/simulate")
def run_research_simulation(
    request: AISimulationRequest,
    current_user: User = Depends(require_admin_role),
    db: Session = Depends(get_db)
):
    """Trigger controlled research failure injection to evaluate VeriNova false success detection."""
    return BookingResearchService.run_controlled_simulation(
        db=db,
        admin_user_id=current_user.id,
        req=request
    )
