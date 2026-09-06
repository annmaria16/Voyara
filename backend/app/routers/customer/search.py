from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.properties.property_service import PropertyService
from app.services.experiences.experience_service import ExperienceService

router = APIRouter()

@router.get("/search")
def search_listings(
    destination: Optional[str] = Query(None, description="City, state, or destination name"),
    check_in: Optional[date] = Query(None, description="Check-in date"),
    check_out: Optional[date] = Query(None, description="Check-out date"),
    guests: Optional[int] = Query(None, description="Minimum guest capacity"),
    property_type: Optional[str] = Query(None, description="Property type filter (Hotel, Homestay, Resort, Camp, Cottage, Villa)"),
    min_price: Optional[float] = Query(None, description="Minimum room price"),
    max_price: Optional[float] = Query(None, description="Maximum room price"),
    amenities: Optional[List[str]] = Query(None, description="Amenities required"),
    experience: Optional[str] = Query(None, description="Experience keyword filter"),
    experience_date: Optional[date] = Query(None, description="Experience date filter"),
    db: Session = Depends(get_db)
):
    """
    Real-time database-driven search for Voyara accommodation and experiences.
    Queries PostgreSQL/database records with availability, closure, and pricing constraints.
    """
    return PropertyService.search_properties(
        db=db,
        destination=destination,
        check_in=check_in,
        check_out=check_out,
        guests=guests,
        property_type=property_type,
        min_price=min_price,
        max_price=max_price,
        amenities=amenities,
        experience=experience,
        experience_date=experience_date
    )

@router.get("/properties/{property_id}")
def get_property_details(property_id: int, db: Session = Depends(get_db)):
    """Get full details of a specific property including active rooms, amenities, and experiences."""
    return PropertyService.get_public_property_details(db, property_id)

@router.get("/experiences")
def get_experiences(
    experience_type: Optional[str] = Query(None),
    destination: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Browse experiences and activities across Voyara destinations."""
    return ExperienceService.list_all_experiences(db, experience_type, destination)

@router.get("/experiences/{experience_id}")
def get_experience_details(
    experience_id: int,
    target_date: Optional[date] = Query(None),
    db: Session = Depends(get_db)
):
    """Get full details and live remaining capacity of an experience."""
    return ExperienceService.get_experience_by_id(db, experience_id, target_date)
