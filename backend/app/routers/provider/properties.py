from typing import List
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_provider
from app.models.provider import ProviderProfile
from app.schemas.property import PropertyCreate, PropertyUpdate, PropertyResponse, ProviderPropertyResponse
from app.schemas.auth import MessageResponse
from app.services.properties.property_service import PropertyService

router = APIRouter()

@router.get("/pincode/{pincode}")
async def lookup_pincode(pincode: str):
    """Lookup real Indian postal pincode details from India Post API."""
    clean_pincode = pincode.strip()
    if not clean_pincode.isdigit() or len(clean_pincode) != 6:
        raise HTTPException(status_code=400, detail="Pincode must be a 6-digit number.")
    
    try:
        async with httpx.AsyncClient(timeout=8.0, verify=False) as client:
            res = await client.get(f"https://api.postalpincode.in/pincode/{clean_pincode}")
            if res.status_code == 200:
                data = res.json()
                if data and isinstance(data, list) and len(data) > 0:
                    status_str = data[0].get("Status")
                    post_offices = data[0].get("PostOffice") or []
                    if status_str == "Success" and len(post_offices) > 0:
                        first_po = post_offices[0]
                        return {
                            "status": "success",
                            "pincode": clean_pincode,
                            "district": first_po.get("District"),
                            "state": first_po.get("State"),
                            "country": first_po.get("Country", "India"),
                            "places": [po.get("Name") for po in post_offices if po.get("Name")],
                            "post_offices": post_offices,
                        }
    except Exception as e:
        print("Backend pincode lookup exception:", e)
    
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No post office records found for this pincode in India.")

@router.get("/properties", response_model=List[ProviderPropertyResponse])
def list_my_properties(
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """List all properties registered by the current provider."""
    return PropertyService.get_provider_properties(db, provider.id)

@router.post("/properties", response_model=ProviderPropertyResponse)
def create_property(
    data: PropertyCreate,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """Add a new property to the Voyara platform."""
    prop = PropertyService.create_property(db, provider.id, data)
    return PropertyService._format_property(prop, min_price=0.0, room_count=0, experience_count=0)

@router.get("/properties/{property_id}", response_model=ProviderPropertyResponse)
def get_property(
    property_id: int,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """Get property by ID with provider ownership check."""
    prop = PropertyService.get_property_by_id(db, property_id, provider_id=provider.id)
    return PropertyService._format_property(prop, min_price=0.0, room_count=len(prop.rooms), experience_count=len(prop.experiences))

@router.put("/properties/{property_id}", response_model=ProviderPropertyResponse)
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

