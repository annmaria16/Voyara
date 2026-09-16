from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.stayguide import PropertyChatRequest, PropertyChatResponse, StayGuideAskRequest, StayGuideAskResponse
from app.services.ai.stayguide_service import StayGuideService

router = APIRouter()

@router.post("/property-chat", response_model=PropertyChatResponse)
@router.post("/ask", response_model=PropertyChatResponse)
async def ask_property_chat(
    request: PropertyChatRequest,
    db: Session = Depends(get_db)
):
    """
    Voyara AI – Property Information Assistant Endpoint.
    Answers traveler questions strictly grounded in PostgreSQL property and room records.
    Provides sources and rule references without exposing platform/system/admin/other property details.
    """
    effective_q = request.effective_question
    if not effective_q:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question cannot be empty."
        )

    return await StayGuideService.ask_stayguide(db=db, req=request)

