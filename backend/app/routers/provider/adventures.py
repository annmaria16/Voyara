from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_provider
from app.models.provider import ProviderProfile
from app.schemas.adventure import AdventureCreate, AdventureUpdate, AdventureResponse
from app.schemas.auth import MessageResponse
from app.services.adventures.adventure_service import AdventureService

router = APIRouter()

# Primary /adventures endpoints
@router.get("/properties/{property_id}/adventures")
def get_property_adventures(
    property_id: int,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """List all adventures belonging to a property."""
    adventures = AdventureService.get_property_adventures(db, property_id, provider_id=provider.id)
    return [AdventureService.get_adventure_by_id(db, a.id) for a in adventures]

@router.post("/properties/{property_id}/adventures")
def create_adventure(
    property_id: int,
    data: AdventureCreate,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """Add a new adventure to a property."""
    adv = AdventureService.create_adventure(db, property_id, provider.id, data)
    return AdventureService.get_adventure_by_id(db, adv.id)

@router.get("/adventures/{adventure_id}")
def get_adventure(
    adventure_id: int,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """Get adventure details."""
    return AdventureService.get_adventure_by_id(db, adventure_id)

@router.put("/adventures/{adventure_id}")
def update_adventure(
    adventure_id: int,
    data: AdventureUpdate,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """Update adventure details."""
    adv = AdventureService.update_adventure(db, adventure_id, provider.id, data)
    return AdventureService.get_adventure_by_id(db, adv.id)

@router.delete("/adventures/{adventure_id}", response_model=MessageResponse)
def delete_adventure(
    adventure_id: int,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """Delete an adventure."""
    return AdventureService.delete_adventure(db, adventure_id, provider.id)


# Compatibility /experiences routes
@router.get("/properties/{property_id}/experiences")
def get_property_experiences_compat(
    property_id: int,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    return get_property_adventures(property_id, provider, db)

@router.post("/properties/{property_id}/experiences")
def create_experience_compat(
    property_id: int,
    data: AdventureCreate,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    return create_adventure(property_id, data, provider, db)

@router.get("/experiences/{experience_id}")
def get_experience_compat(
    experience_id: int,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    return get_adventure(experience_id, provider, db)

@router.put("/experiences/{experience_id}")
def update_experience_compat(
    experience_id: int,
    data: AdventureUpdate,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    return update_adventure(experience_id, data, provider, db)

@router.delete("/experiences/{experience_id}", response_model=MessageResponse)
def delete_experience_compat(
    experience_id: int,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    return delete_adventure(experience_id, provider, db)
