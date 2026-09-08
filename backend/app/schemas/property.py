import re
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, field_validator
from app.models.property import PropertyType, PropertyVerificationStatus
from app.schemas.room import RoomCreate, RoomResponse

def clean_indian_phone(v: Optional[str]) -> Optional[str]:
    if v is None:
        return v
    raw = str(v).strip()
    if not raw:
        raise ValueError("Contact phone number is required.")
    clean = re.sub(r"[\s\-\(\)]", "", raw)
    match = re.match(r"^(?:(?:\+91|91|0)?)?([6-9]\d{9})$", clean)
    if not match:
        raise ValueError("Invalid Indian phone number. Please enter a 10-digit mobile number starting with 6, 7, 8, or 9 (e.g. 9876543210).")
    return match.group(1)

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
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    contact_phone: str
    contact_email: str
    check_in_time: str = "14:00"
    check_out_time: str = "11:00"
    amenities: List[str] = []
    images: List[str] = []  # List of image URLs
    ownership_proof_url: Optional[str] = None
    rooms: List[RoomCreate] = []  # Embedded room units created with the property

    @field_validator("contact_phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        return clean_indian_phone(v)

class PropertyUpdate(BaseModel):
    name: Optional[str] = None
    property_type: Optional[PropertyType] = None
    description: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    location_details: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    check_in_time: Optional[str] = None
    check_out_time: Optional[str] = None
    is_active: Optional[bool] = None
    amenities: Optional[List[str]] = None
    images: Optional[List[str]] = None
    ownership_proof_url: Optional[str] = None

    @field_validator("contact_phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        return clean_indian_phone(v)

# Customer-safe Property Response (never exposes private ownership documents or internal admin notes)
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
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    contact_phone: str
    contact_email: str
    check_in_time: str
    check_out_time: str
    is_active: bool
    verification_status: str = "VERIFIED"
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

# Provider-facing Property Response
class ProviderPropertyResponse(BaseModel):
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
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    contact_phone: str
    contact_email: str
    check_in_time: str
    check_out_time: str
    is_active: bool
    verification_status: str
    ownership_proof_url: Optional[str] = None
    verification_reason: Optional[str] = None
    rating: float
    review_count: int
    featured: bool
    created_at: datetime
    images: List[PropertyImageSchema] = []
    amenities: List[PropertyAmenitySchema] = []
    rooms: List[RoomResponse] = []
    min_price: Optional[float] = None
    room_count: Optional[int] = 0
    experience_count: Optional[int] = 0

    class Config:
        from_attributes = True

# Admin-facing Property Verification Action Request
class PropertyVerificationAction(BaseModel):
    action: str  # "APPROVE", "REJECT", "REQUEST_REVIEW"
    reason: Optional[str] = None

class PropertyVerificationResponse(BaseModel):
    message: str
    success: bool = True
    property_id: int
    verification_status: str
    verification_reason: Optional[str] = None
    verified_by: Optional[int] = None
    verified_at: Optional[datetime] = None
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None

# Admin-facing Property Response with complete audit details
class AdminPropertyResponse(BaseModel):
    id: int
    provider_id: int
    provider_name: Optional[str] = "N/A"
    provider_email: Optional[str] = None
    provider_phone: Optional[str] = None
    name: str
    property_type: str
    description: str
    address: str
    city: str
    state: str
    country: str
    location_details: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    contact_phone: str
    contact_email: str
    check_in_time: str
    check_out_time: str
    is_active: bool
    verification_status: str
    ownership_proof_url: Optional[str] = None
    verification_reason: Optional[str] = None
    verified_by: Optional[int] = None
    verified_at: Optional[datetime] = None
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    rating: float
    rooms_count: int = 0
    experiences_count: int = 0
    created_at: datetime
    images: List[PropertyImageSchema] = []
    amenities: List[PropertyAmenitySchema] = []
    rooms: List[RoomResponse] = []

    class Config:
        from_attributes = True
