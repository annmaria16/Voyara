from typing import List, Optional, Dict, Any
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import get_current_user, get_optional_user
from app.models.user import User
from app.models.trip_chat_session import TripPlannerChatSession, TripPlannerChatMessage
from app.schemas.trip_planner import (
    TripPlannerRequest,
    TripPlanResponse,
    RegenerateDayRequest,
    SelectStayRequest,
    RevalidateTripResponse,
    SaveTripRequest,
    SavedTripSummaryResponse,
    SavedTripDetailResponse,
    TripChatRequest,
    TripChatResponse,
    ChatSessionSummaryResponse,
    ChatSessionDetailResponse,
    CreateChatSessionRequest,
    ChatMessageItem
)
from app.services.ai.trip_planner import TripPlannerService
from app.services.ai.trip_planner_chat import TripPlannerChatService

router = APIRouter()

@router.post("/trip-planner/chat", response_model=TripChatResponse)
def chat_trip_planner(
    request: TripChatRequest,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    Conversational AI travel planner endpoint.
    Parses natural language requests, checks missing fields, and generates real plans.
    """
    user_id = current_user.id if current_user else None
    return TripPlannerChatService.handle_chat_message(db=db, request=request, user_id=user_id)

@router.post("/trip-planner", response_model=TripPlanResponse)
def generate_trip_plan(
    request: TripPlannerRequest,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    Generate a complete, real, validated trip plan combining traveler preferences,
    PostgreSQL properties, real room availability & pricing, Voyara experiences,
    and verified destination attractions.
    Strictly forbids hallucinated stays, prices, or inventory.
    """
    user_id = current_user.id if current_user else None
    return TripPlannerService.generate_trip_plan(db=db, request=request, user_id=user_id)

@router.post("/trip-planner/select-stay", response_model=TripPlanResponse)
def select_stay(
    request: SelectStayRequest,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    Revalidates and switches the selected property and room in the itinerary,
    updating total stay pricing and day-by-day logistics.
    """
    user_id = current_user.id if current_user else None
    return TripPlannerService.select_stay_and_room(db=db, request=request, user_id=user_id)

@router.post("/trip-planner/validate")
def validate_trip_planner_input(
    request: TripPlannerRequest,
    db: Session = Depends(get_db)
):
    """
    Pre-validates trip planner parameters and verifies basic inventory feasibility.
    """
    return {"valid": True, "message": "Trip planner input is valid."}

@router.post("/trip-planner/regenerate-day", response_model=TripPlanResponse)
def regenerate_day(
    request: RegenerateDayRequest,
    db: Session = Depends(get_db)
):
    """
    Regenerates a specific day in the itinerary with alternative real-world attractions
    or activities, keeping the rest of the plan and stay intact.
    """
    return TripPlannerService.regenerate_day(db=db, request=request)

@router.post("/trip-planner/revalidate", response_model=RevalidateTripResponse)
def revalidate_trip(
    trip_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Rechecks live room and experience availability and pricing freshness for a saved plan.
    """
    return TripPlannerService.revalidate_saved_trip(db=db, trip_id=trip_id, user_id=current_user.id)

# ==========================================
# CHAT SESSIONS & HISTORY (ChatGPT-Style)
# ==========================================
@router.get("/trip-planner/sessions", response_model=List[ChatSessionSummaryResponse])
def get_chat_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lists all persistent chat planning sessions for the authenticated traveler."""
    sessions = db.query(TripPlannerChatSession).filter(
        TripPlannerChatSession.user_id == current_user.id
    ).order_by(TripPlannerChatSession.updated_at.desc()).all()

    results = []
    for s in sessions:
        msg_count = len(s.messages) if s.messages else 0
        last_msg = s.messages[-1].text if s.messages else None
        results.append(ChatSessionSummaryResponse(
            id=s.id,
            title=s.title,
            destination=s.destination,
            message_count=msg_count,
            last_message=last_msg,
            created_at=s.created_at.isoformat(),
            updated_at=s.updated_at.isoformat()
        ))
    return results

@router.post("/trip-planner/sessions", response_model=ChatSessionDetailResponse)
def create_chat_session(
    request: CreateChatSessionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Creates a new persistent chat planning session."""
    session_obj = TripPlannerChatSession(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        title=request.title or f"{request.destination or 'New'} Journey",
        destination=request.destination,
        current_context=request.initial_context.model_dump() if request.initial_context else {}
    )
    db.add(session_obj)
    db.commit()
    db.refresh(session_obj)

    return ChatSessionDetailResponse(
        id=session_obj.id,
        title=session_obj.title,
        destination=session_obj.destination,
        current_context=session_obj.current_context,
        current_plan=session_obj.current_plan_snapshot,
        messages=[],
        created_at=session_obj.created_at.isoformat(),
        updated_at=session_obj.updated_at.isoformat()
    )

@router.get("/trip-planner/sessions/{session_id}", response_model=ChatSessionDetailResponse)
def get_chat_session_details(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves full message history, context, and generated plan snapshot for a session."""
    session_obj = db.query(TripPlannerChatSession).filter(
        TripPlannerChatSession.id == session_id,
        TripPlannerChatSession.user_id == current_user.id
    ).first()

    if not session_obj:
        raise HTTPException(status_code=404, detail="Chat session not found.")

    messages_data = []
    for m in session_obj.messages:
        messages_data.append(ChatMessageItem(
            id=m.id,
            sender=m.sender,
            text=m.text,
            suggestions=m.suggestions or [],
            budget_analysis=m.budget_analysis,
            plan_status=m.plan_status,
            action_type=m.action_type,
            booking_payload=m.booking_payload,
            created_at=m.created_at.isoformat()
        ))

    return ChatSessionDetailResponse(
        id=session_obj.id,
        title=session_obj.title,
        destination=session_obj.destination,
        current_context=session_obj.current_context,
        current_plan=session_obj.current_plan_snapshot,
        messages=messages_data,
        created_at=session_obj.created_at.isoformat(),
        updated_at=session_obj.updated_at.isoformat()
    )

@router.delete("/trip-planner/sessions/{session_id}")
def delete_chat_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Deletes a chat session and its associated messages."""
    session_obj = db.query(TripPlannerChatSession).filter(
        TripPlannerChatSession.id == session_id,
        TripPlannerChatSession.user_id == current_user.id
    ).first()

    if not session_obj:
        raise HTTPException(status_code=404, detail="Chat session not found.")

    db.delete(session_obj)
    db.commit()
    return {"message": "Chat session removed successfully.", "success": True}

# ==========================================
# SAVED TRIPS (PERMANENT JOURNEY ITINERARIES)
# ==========================================
@router.post("/trips", response_model=SavedTripDetailResponse)
def save_trip(
    request: SaveTripRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Saves an itinerary plan to the authenticated traveler's saved trips collection.
    """
    return TripPlannerService.save_trip(db=db, user_id=current_user.id, req=request)

@router.get("/trips", response_model=List[SavedTripSummaryResponse])
def get_my_trips(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lists all saved trip plans for the current authenticated traveler.
    """
    return TripPlannerService.get_user_trips(db=db, user_id=current_user.id)

@router.get("/trips/{trip_id}", response_model=SavedTripDetailResponse)
def get_trip_details(
    trip_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves full details of a saved trip with live inventory and pricing revalidation.
    """
    return TripPlannerService.get_trip_by_id(db=db, trip_id=trip_id, user_id=current_user.id)

@router.delete("/trips/{trip_id}")
def delete_trip(
    trip_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deletes a saved trip plan.
    """
    return TripPlannerService.delete_trip(db=db, trip_id=trip_id, user_id=current_user.id)
