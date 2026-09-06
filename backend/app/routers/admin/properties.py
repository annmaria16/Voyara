from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_admin
from app.models.user import User
from app.models.property import Property
from app.models.room import Room
from app.models.experience import Experience
from app.schemas.auth import MessageResponse

router = APIRouter()

@router.get("/properties")
def get_all_properties(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin endpoint to list all properties."""
    properties = db.query(Property).order_by(Property.created_at.desc()).all()
    results = []
    for p in properties:
        results.append({
            "id": p.id,
            "name": p.name,
            "property_type": p.property_type,
            "city": p.city,
            "state": p.state,
            "country": p.country,
            "provider_id": p.provider_id,
            "provider_name": p.provider.business_name if p.provider else "N/A",
            "is_active": p.is_active,
            "rating": p.rating,
            "rooms_count": len(p.rooms),
            "experiences_count": len(p.experiences),
            "created_at": p.created_at
        })
    return results

@router.put("/properties/{property_id}/toggle-status", response_model=MessageResponse)
def toggle_property_status(
    property_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Toggle property active status."""
    prop = db.query(Property).filter(Property.id == property_id).first()
    if not prop:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found.")
    
    prop.is_active = not prop.is_active
    db.commit()
    status_str = "activated" if prop.is_active else "deactivated"
    return {"message": f"Property '{prop.name}' has been {status_str}.", "success": True}

@router.get("/rooms")
def get_all_rooms(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin endpoint to list all rooms across properties."""
    rooms = db.query(Room).all()
    results = []
    for r in rooms:
        results.append({
            "id": r.id,
            "property_id": r.property_id,
            "property_name": r.property.name if r.property else "",
            "name": r.name,
            "room_type": r.room_type,
            "capacity": r.capacity,
            "quantity": r.quantity,
            "base_price": r.base_price,
            "is_active": r.is_active
        })
    return results

@router.get("/experiences")
def get_all_experiences(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin endpoint to list all experiences."""
    experiences = db.query(Experience).all()
    results = []
    for e in experiences:
        results.append({
            "id": e.id,
            "property_id": e.property_id,
            "property_name": e.property.name if e.property else "",
            "title": e.title,
            "experience_type": e.experience_type,
            "price": e.price,
            "pricing_model": e.pricing_model,
            "capacity": e.capacity,
            "duration": e.duration,
            "is_active": e.is_active
        })
    return results
