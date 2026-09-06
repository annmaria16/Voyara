from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_provider
from app.models.provider import ProviderProfile
from app.schemas.property import PropertyCreate, PropertyUpdate, PropertyResponse
from app.schemas.auth import MessageResponse
from app.services.properties.property_service import PropertyService

router = APIRouter()

@router.get("/properties", response_model=List[PropertyResponse])
def list_my_properties(
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """List all properties registered by the current provider."""
    return PropertyService.get_provider_properties(db, provider.id)

@router.post("/properties", response_model=PropertyResponse)
def create_property(
    data: PropertyCreate,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """Add a new property to the Voyara platform."""
    prop = PropertyService.create_property(db, provider.id, data)
    return PropertyService._format_property(prop, min_price=0.0, room_count=0, experience_count=0)

@router.get("/properties/{property_id}", response_model=PropertyResponse)
def get_property(
    property_id: int,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """Get property by ID with provider ownership check."""
    prop = PropertyService.get_property_by_id(db, property_id, provider_id=provider.id)
    return PropertyService._format_property(prop, min_price=0.0, room_count=len(prop.rooms), experience_count=len(prop.experiences))

@router.put("/properties/{property_id}", response_model=PropertyResponse)
def update_property(
    property_id: int,
    data: PropertyUpdate,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """Update property details with provider ownership check."""
    prop = PropertyService.update_property(db, property_id, provider.id, data)
    return PropertyService._format_property(prop, min_price=0.0, room_count=len(prop.rooms), experience_count=len(prop.experiences))

@router.delete("/properties/{property_id}", response_model=MessageResponse)
def delete_property(
    property_id: int,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """Delete a property with provider ownership check."""
    return PropertyService.delete_property(db, property_id, provider.id)
