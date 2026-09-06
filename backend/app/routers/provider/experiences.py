from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_provider
from app.models.provider import ProviderProfile
from app.schemas.experience import ExperienceCreate, ExperienceUpdate, ExperienceResponse
from app.schemas.auth import MessageResponse
from app.services.experiences.experience_service import ExperienceService

router = APIRouter()

@router.get("/properties/{property_id}/experiences")
def get_property_experiences(
    property_id: int,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """List all experiences belonging to a property."""
    experiences = ExperienceService.get_property_experiences(db, property_id, provider_id=provider.id)
    return [ExperienceService.get_experience_by_id(db, e.id) for e in experiences]

@router.post("/properties/{property_id}/experiences")
def create_experience(
    property_id: int,
    data: ExperienceCreate,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """Add a new experience/event to a property."""
    exp = ExperienceService.create_experience(db, property_id, provider.id, data)
    return ExperienceService.get_experience_by_id(db, exp.id)

@router.get("/experiences/{experience_id}")
def get_experience(
    experience_id: int,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """Get experience details."""
    return ExperienceService.get_experience_by_id(db, experience_id)

@router.put("/experiences/{experience_id}")
def update_experience(
    experience_id: int,
    data: ExperienceUpdate,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """Update experience details."""
    exp = ExperienceService.update_experience(db, experience_id, provider.id, data)
    return ExperienceService.get_experience_by_id(db, exp.id)

@router.delete("/experiences/{experience_id}", response_model=MessageResponse)
def delete_experience(
    experience_id: int,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """Delete an experience."""
    return ExperienceService.delete_experience(db, experience_id, provider.id)
