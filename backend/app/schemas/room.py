from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

class RoomImageSchema(BaseModel):
    id: Optional[int] = None
    image_url: str
    is_primary: bool = False

    class Config:
        from_attributes = True

class RoomAmenitySchema(BaseModel):
    id: Optional[int] = None
    amenity_name: str

    class Config:
        from_attributes = True

class RoomCreate(BaseModel):
    name: str  # e.g., "Deluxe Sunset Ocean Suite"
    room_type: str  # e.g., "Deluxe Room", "Family Villa", "Luxury Tent"
    description: str
    capacity: int = 2
    quantity: int = 1
    base_price: float
    amenities: List[str] = []
    images: List[str] = []

class RoomUpdate(BaseModel):
    name: Optional[str] = None
    room_type: Optional[str] = None
    description: Optional[str] = None
    capacity: Optional[int] = None
    quantity: Optional[int] = None
    base_price: Optional[float] = None
    is_active: Optional[bool] = None
    amenities: Optional[List[str]] = None
    images: Optional[List[str]] = None

class RoomResponse(BaseModel):
    id: int
    property_id: int
    name: str
    room_type: str
    description: str
    capacity: int
    quantity: int
    base_price: float
    is_active: bool
    created_at: datetime
    images: List[RoomImageSchema] = []
    amenities: List[RoomAmenitySchema] = []

    class Config:
        from_attributes = True
