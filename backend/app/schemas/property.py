from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from app.models.property import PropertyType

class PropertyImageSchema(BaseModel):
    id: Optional[int] = None
    image_url: str
    caption: Optional[str] = None
    is_primary: bool = False

    class Config:
        from_attributes = True

class PropertyAmenitySchema(BaseModel):
    id: Optional[int] = None
    amenity_name: str

    class Config:
        from_attributes = True

class PropertyCreate(BaseModel):
    name: str
    property_type: PropertyType  # Hotel, Homestay, Resort, Camp, Cottage, Villa
    description: str
    address: str
    city: str
    state: str
    country: str = "India"
    location_details: Optional[str] = None
    contact_phone: str
    contact_email: str
    check_in_time: str = "14:00"
    check_out_time: str = "11:00"
    amenities: List[str] = []
    images: List[str] = []  # List of image URLs

class PropertyUpdate(BaseModel):
    name: Optional[str] = None
    property_type: Optional[PropertyType] = None
    description: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    location_details: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    check_in_time: Optional[str] = None
    check_out_time: Optional[str] = None
    is_active: Optional[bool] = None
    amenities: Optional[List[str]] = None
    images: Optional[List[str]] = None

class PropertyResponse(BaseModel):
    id: int
    provider_id: int
    name: str
    property_type: str
    description: str
    address: str
    city: str
    state: str
    country: str
    location_details: Optional[str] = None
    contact_phone: str
    contact_email: str
    check_in_time: str
    check_out_time: str
    is_active: bool
    rating: float
    review_count: int
    featured: bool
    created_at: datetime
    images: List[PropertyImageSchema] = []
    amenities: List[PropertyAmenitySchema] = []
    min_price: Optional[float] = None
    room_count: Optional[int] = 0
    experience_count: Optional[int] = 0

    class Config:
        from_attributes = True
