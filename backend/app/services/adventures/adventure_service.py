from datetime import date
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from app.models.adventure import Adventure, AdventureSchedule, AdventureAvailability
from app.models.property import Property
from app.models.booking import Booking, BookingAdventure, BookingStatus
from app.schemas.adventure import AdventureCreate, AdventureUpdate

class AdventureService:
    @staticmethod
    def create_adventure(db: Session, property_id: int, provider_id: int, data: AdventureCreate) -> Adventure:
        prop = db.query(Property).filter(Property.id == property_id, Property.provider_id == provider_id).first()
        if not prop:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found or access denied.")

        adv_type = data.adventure_type or getattr(data, "experience_type", "Adventure")
        adv = Adventure(
            property_id=property_id,
            title=data.title.strip(),
            adventure_type=adv_type.strip(),
            description=data.description.strip(),
            price=data.price,
            pricing_model=data.pricing_model,
            capacity=data.capacity,
            duration=data.duration,
            schedule_type=data.schedule_type,
            event_date=data.event_date,
            start_time=data.start_time,
            end_time=data.end_time,
            image_url=data.image_url,
            is_active=True
        )
        db.add(adv)
        db.commit()
        db.refresh(adv)

        # Handle recurring schedules if provided
        if data.schedules and data.schedule_type == "recurring":
            for sch in data.schedules:
                db.add(AdventureSchedule(
                    adventure_id=adv.id,
                    day_of_week=sch.get("day_of_week", "Friday"),
                    start_time=sch.get("start_time", adv.start_time),
                    end_time=sch.get("end_time", adv.end_time),
                    is_active=True
                ))
            db.commit()
            db.refresh(adv)

        return adv

    create_experience = create_adventure

    @staticmethod
    def get_property_adventures(db: Session, property_id: int, provider_id: Optional[int] = None) -> List[Adventure]:
        if provider_id is not None:
            prop = db.query(Property).filter(Property.id == property_id, Property.provider_id == provider_id).first()
            if not prop:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found or access denied.")
        return db.query(Adventure).filter(Adventure.property_id == property_id).all()

    get_property_experiences = get_property_adventures

    @staticmethod
    def get_adventure_by_id(db: Session, adventure_id: int, target_date: Optional[date] = None) -> dict:
        adv = db.query(Adventure).filter(Adventure.id == adventure_id).first()
        if not adv:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Adventure not found.")
        
        remaining = adv.capacity
        check_date = target_date or adv.event_date or date.today()
        if check_date:
            booked_count = db.query(func.coalesce(func.sum(BookingAdventure.participants), 0)).join(Booking).filter(
                BookingAdventure.adventure_id == adv.id,
                BookingAdventure.scheduled_date == check_date,
                Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.VERIFIED])
            ).scalar()
            remaining = max(0, adv.capacity - booked_count)

        return {
            "id": adv.id,
            "property_id": adv.property_id,
            "title": adv.title,
            "adventure_type": adv.adventure_type,
            "experience_type": adv.adventure_type,  # Compatibility alias
            "description": adv.description,
            "price": adv.price,
            "pricing_model": adv.pricing_model,
            "capacity": adv.capacity,
            "duration": adv.duration,
            "schedule_type": adv.schedule_type,
            "event_date": adv.event_date,
            "start_time": adv.start_time,
            "end_time": adv.end_time,
            "image_url": adv.image_url,
            "is_active": adv.is_active,
            "created_at": adv.created_at,
            "remaining_capacity": remaining,
            "property_name": adv.property.name if adv.property else "",
            "property_city": adv.property.city if adv.property else "",
            "schedules": [{"id": s.id, "day_of_week": s.day_of_week, "start_time": s.start_time, "end_time": s.end_time} for s in adv.schedules if s.is_active]
        }

    get_experience_by_id = get_adventure_by_id

    @staticmethod
    def update_adventure(db: Session, adventure_id: int, provider_id: int, data: AdventureUpdate) -> Adventure:
        adv = db.query(Adventure).filter(Adventure.id == adventure_id).first()
        if not adv:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Adventure not found.")
        
        prop = db.query(Property).filter(Property.id == adv.property_id, Property.provider_id == provider_id).first()
        if not prop:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this adventure.")

        update_dict = data.model_dump(exclude_unset=True)
        if "experience_type" in update_dict and "adventure_type" not in update_dict:
            update_dict["adventure_type"] = update_dict.pop("experience_type")

        for key, val in update_dict.items():
            if hasattr(adv, key):
                setattr(adv, key, val)

        db.commit()
        db.refresh(adv)
        return adv

    update_experience = update_adventure

    @staticmethod
    def delete_adventure(db: Session, adventure_id: int, provider_id: int) -> dict:
        adv = db.query(Adventure).filter(Adventure.id == adventure_id).first()
        if not adv:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Adventure not found.")
        
        prop = db.query(Property).filter(Property.id == adv.property_id, Property.provider_id == provider_id).first()
        if not prop:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

        db.delete(adv)
        db.commit()
        return {"message": "Adventure deleted successfully", "success": True}

    delete_experience = delete_adventure

    @staticmethod
    def list_all_adventures(
        db: Session,
        adventure_type: Optional[str] = None,
        destination: Optional[str] = None
    ) -> List[dict]:
        query = db.query(Adventure).filter(Adventure.is_active == True)
        if adventure_type and adventure_type.lower() != "all":
            query = query.filter(Adventure.adventure_type.ilike(f"%{adventure_type}%"))
        
        if destination and destination.strip():
            query = query.join(Property).filter(
                or_(
                    Property.city.ilike(f"%{destination}%"),
                    Property.state.ilike(f"%{destination}%"),
                    Property.name.ilike(f"%{destination}%")
                )
            )

        adventures = query.all()
        return [AdventureService.get_adventure_by_id(db, a.id) for a in adventures]

    list_all_experiences = list_all_adventures

# Compatibility alias
ExperienceService = AdventureService
