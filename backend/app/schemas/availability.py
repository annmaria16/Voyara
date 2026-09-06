from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel

class PropertyClosureCreate(BaseModel):
    start_date: date
    end_date: date
    reason: Optional[str] = "Property closure"

class PropertyClosureResponse(BaseModel):
    id: int
    property_id: int
    start_date: date
    end_date: date
    is_closed: bool
    reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class RoomBlockCreate(BaseModel):
    room_id: int
    start_date: date
    end_date: date
    reason: Optional[str] = "Maintenance / Blocked"

class RoomBlockResponse(BaseModel):
    id: int
    room_id: int
    start_date: date
    end_date: date
    is_blocked: bool
    reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AvailabilityCalendarResponse(BaseModel):
    property_id: int
    closures: List[PropertyClosureResponse] = []
    room_blocks: List[RoomBlockResponse] = []

class RoomAvailabilityCheckResponse(BaseModel):
    room_id: int
    property_id: int
    room_name: str
    total_quantity: int
    booked_quantity: int
    blocked_quantity: int
    available_quantity: int
    max_guests: int
    price_per_night: float
    is_available: bool
    is_property_closed: bool = False
    is_room_blocked: bool = False
    message: Optional[str] = None
