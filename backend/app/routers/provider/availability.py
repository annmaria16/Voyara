from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_provider
from app.models.provider import ProviderProfile
from app.schemas.availability import (
    PropertyClosureCreate,
    PropertyClosureResponse,
    RoomBlockCreate,
    RoomBlockResponse,
    AvailabilityCalendarResponse
)
from app.schemas.auth import MessageResponse
from app.services.availability.availability_service import AvailabilityService

router = APIRouter()

from datetime import date
from typing import Optional
from app.schemas.calendar import PropertyCalendarResponse, CalendarDayDetail

@router.get("/properties/{property_id}/calendar", response_model=PropertyCalendarResponse)
def get_property_month_calendar(
    property_id: int,
    year: Optional[int] = None,
    month: Optional[int] = None,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """
    Get authoritative monthly availability calendar for a single property,
    including day-by-day room inventory, traveler bookings, and blackouts.
    """
    return AvailabilityService.get_property_month_calendar(
        db=db,
        property_id=property_id,
        provider_id=provider.id,
        year=year,
        month=month
    )

@router.get("/properties/{property_id}/calendar/{date_str}", response_model=CalendarDayDetail)
def get_property_date_detail(
    property_id: int,
    date_str: str,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive booking, room inventory breakdown, and blackout details for a single date.
    """
    try:
        target_date = date.fromisoformat(date_str)
    except ValueError:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid date format. Expected YYYY-MM-DD.")

    return AvailabilityService.get_property_date_detail(
        db=db,
        property_id=property_id,
        provider_id=provider.id,
        target_date=target_date
    )

@router.get("/calendar", response_model=PropertyCalendarResponse)
def get_provider_overview_calendar(
    property_id: Optional[int] = None,
    year: Optional[int] = None,
    month: Optional[int] = None,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """
    Get provider calendar overview. If property_id is specified, returns that property's calendar;
    otherwise returns aggregated overview across all properties owned by this provider.
    """
    return AvailabilityService.get_provider_overview_calendar(
        db=db,
        provider_id=provider.id,
        property_id=property_id,
        year=year,
        month=month
    )

@router.get("/properties/{property_id}/availability")
def get_property_availability(
    property_id: int,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """Get full availability calendar, closures, room blocks, and bookings for a property with provider ownership check."""
    return AvailabilityService.get_property_calendar(db, property_id, provider_id=provider.id)

@router.post("/properties/{property_id}/availability/close", response_model=PropertyClosureResponse)
def close_property_dates(
    property_id: int,
    data: PropertyClosureCreate,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """Close the entire property for a date range."""
    return AvailabilityService.block_property_dates(db, property_id, provider.id, data)

@router.delete("/properties/availability/closure/{closure_id}", response_model=MessageResponse)
def remove_property_closure(
    closure_id: int,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """Reopen a closed property date range."""
    return AvailabilityService.remove_property_closure(db, closure_id, provider.id)

@router.post("/rooms/availability/block", response_model=RoomBlockResponse)
def block_room_dates(
    data: RoomBlockCreate,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """Block a specific room for a date range."""
    return AvailabilityService.block_room_dates(db, provider.id, data)

@router.delete("/rooms/availability/block/{block_id}", response_model=MessageResponse)
def remove_room_block(
    block_id: int,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """Unblock a blocked room date range."""
    return AvailabilityService.remove_room_block(db, block_id, provider.id)
