from typing import List
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_provider
from app.models.provider import ProviderProfile
from app.schemas.property import (
    PropertyCreate,
    PropertyUpdate,
    PropertyResponse,
    ProviderPropertyResponse,
    GuestInformationMessageRequest,
    GuestInformationMessageResponse,
    CancellationPolicyRequest,
    CancellationPolicyResponse,
)
from app.schemas.auth import MessageResponse
from app.schemas.stayguide import PropertyRuleResponse, PropertyRuleUpdate
from app.services.properties.property_service import PropertyService
from app.services.ai.stayguide_service import StayGuideService

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

@router.get("/properties/{property_id}/guest-information", response_model=GuestInformationMessageResponse)
def get_property_guest_information(
    property_id: int,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """Get the host guest information & safety message for a specific property (verified provider ownership)."""
    prop = PropertyService.get_property_by_id(db, property_id, provider_id=provider.id)
    return {
        "property_id": prop.id,
        "property_name": prop.name,
        "guest_information_message": prop.guest_information_message,
        "message": "Success"
    }

@router.put("/properties/{property_id}/guest-information", response_model=GuestInformationMessageResponse)
def update_property_guest_information(
    property_id: int,
    data: GuestInformationMessageRequest,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """Update or clear the host guest information & safety message for a specific property (verified provider ownership)."""
    msg = data.guest_information_message
    if msg and len(msg) > 5000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Guest information message must not exceed 5000 characters."
        )
    prop = PropertyService.get_property_by_id(db, property_id, provider_id=provider.id)
    prop.guest_information_message = msg.strip() if msg and msg.strip() else None
    db.commit()
    db.refresh(prop)
    return {
        "property_id": prop.id,
        "property_name": prop.name,
        "guest_information_message": prop.guest_information_message,
        "message": "Guest information & safety message updated successfully."
    }

@router.get("/properties/{property_id}/cancellation-policy", response_model=CancellationPolicyResponse)
def get_property_cancellation_policy(
    property_id: int,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """Get the host cancellation refund policy for a specific property."""
    prop = PropertyService.get_property_by_id(db, property_id, provider_id=provider.id)
    pct = prop.cancellation_refund_percentage if prop.cancellation_refund_percentage is not None else 50
    desc = (
        f"Free cancellation (100% refund) up to 2 days before check-in. "
        f"If cancelled within 2 days of check-in, a {pct}% refund is issued."
    ) if pct > 0 else (
        "Free cancellation (100% refund) up to 2 days before check-in. "
        "If cancelled within 2 days of check-in, no refund is issued (0% refund)."
    )
    return {
        "property_id": prop.id,
        "property_name": prop.name,
        "cancellation_refund_percentage": pct,
        "policy_description": desc,
        "message": "Success"
    }

@router.put("/properties/{property_id}/cancellation-policy", response_model=CancellationPolicyResponse)
def update_property_cancellation_policy(
    property_id: int,
    data: CancellationPolicyRequest,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """Update the host cancellation refund percentage for a specific property."""
    if data.cancellation_refund_percentage not in [0, 25, 50, 75, 100]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cancellation refund percentage must be one of: 0, 25, 50, 75, 100."
        )
    prop = PropertyService.get_property_by_id(db, property_id, provider_id=provider.id)
    prop.cancellation_refund_percentage = data.cancellation_refund_percentage
    db.commit()
    db.refresh(prop)
    
    pct = prop.cancellation_refund_percentage
    desc = (
        f"Free cancellation (100% refund) up to 2 days before check-in. "
        f"If cancelled within 2 days of check-in, a {pct}% refund is issued."
    ) if pct > 0 else (
        "Free cancellation (100% refund) up to 2 days before check-in. "
        "If cancelled within 2 days of check-in, no refund is issued (0% refund)."
    )
    return {
        "property_id": prop.id,
        "property_name": prop.name,
        "cancellation_refund_percentage": pct,
        "policy_description": desc,
        "message": "Cancellation policy updated successfully."
    }

@router.get("/properties/{property_id}/rules", response_model=PropertyRuleResponse)
def get_property_rules(
    property_id: int,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """Get the configured Home Rules for a specific property."""
    PropertyService.get_property_by_id(db, property_id, provider_id=provider.id)
    return StayGuideService.get_or_create_property_rules(db, property_id)

@router.put("/properties/{property_id}/rules", response_model=PropertyRuleResponse)
def update_property_rules(
    property_id: int,
    data: PropertyRuleUpdate,
    provider: ProviderProfile = Depends(get_current_provider),
    db: Session = Depends(get_db)
):
    """Update Home Rules for a specific property."""
    PropertyService.get_property_by_id(db, property_id, provider_id=provider.id)
    return StayGuideService.update_property_rules(db, property_id, data)



