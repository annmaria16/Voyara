from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_provider
from app.models.provider import ProviderProfile
from app.schemas.room import RoomCreate, RoomUpdate, RoomResponse
from app.schemas.stayguide import RoomRuleResponse, RoomRuleUpdate
from app.schemas.auth import MessageResponse
from app.services.rooms.room_service import RoomService
from app.services.ai.stayguide_service import StayGuideService

router = APIRouter()

@router.get("/properties/{property_id}/rooms", response_model=List[RoomResponse])
def get_property_rooms(
    property_id: int,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """List all rooms belonging to a property."""
    return RoomService.get_property_rooms(db, property_id, provider_id=provider.id)

@router.post("/properties/{property_id}/rooms", response_model=RoomResponse)
def create_room(
    property_id: int,
    data: RoomCreate,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """Create a new room for a provider's property."""
    return RoomService.create_room(db, property_id, provider.id, data)

@router.get("/rooms/{room_id}", response_model=RoomResponse)
def get_room(
    room_id: int,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """Get room details by ID."""
    return RoomService.get_room_by_id(db, room_id, provider_id=provider.id)

@router.put("/rooms/{room_id}", response_model=RoomResponse)
def update_room(
    room_id: int,
    data: RoomUpdate,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """Update room details."""
    return RoomService.update_room(db, room_id, provider.id, data)

@router.delete("/rooms/{room_id}", response_model=MessageResponse)
def delete_room(
    room_id: int,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """Delete a room unit."""
    return RoomService.delete_room(db, room_id, provider.id)

@router.get("/rooms/{room_id}/rules", response_model=RoomRuleResponse)
def get_room_rules(
    room_id: int,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """Get the configured occupancy rules for a specific room."""
    RoomService.get_room_by_id(db, room_id, provider_id=provider.id)
    return StayGuideService.get_or_create_room_rules(db, room_id)

@router.put("/rooms/{room_id}/rules", response_model=RoomRuleResponse)
def update_room_rules(
    room_id: int,
    data: RoomRuleUpdate,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """Update occupancy rules for a specific room."""
    RoomService.get_room_by_id(db, room_id, provider_id=provider.id)
    return StayGuideService.update_room_rules(db, room_id, data)

