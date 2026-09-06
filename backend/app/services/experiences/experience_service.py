from datetime import date
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from app.models.experience import Experience, ExperienceSchedule, ExperienceAvailability
from app.models.property import Property
from app.models.booking import Booking, BookingExperience, BookingStatus
from app.schemas.experience import ExperienceCreate, ExperienceUpdate

class ExperienceService:
    @staticmethod
    def create_experience(db: Session, property_id: int, provider_id: int, data: ExperienceCreate) -> Experience:
        prop = db.query(Property).filter(Property.id == property_id, Property.provider_id == provider_id).first()
        if not prop:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found or access denied.")

        exp = Experience(
            property_id=property_id,
            title=data.title.strip(),
            experience_type=data.experience_type.strip(),
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
        db.add(exp)
        db.commit()
        db.refresh(exp)

        # Handle recurring schedules if provided
        if data.schedules and data.schedule_type == "recurring":
            for sch in data.schedules:
                db.add(ExperienceSchedule(
                    experience_id=exp.id,
                    day_of_week=sch.get("day_of_week", "Friday"),
                    start_time=sch.get("start_time", exp.start_time),
                    end_time=sch.get("end_time", exp.end_time),
                    is_active=True
                ))
            db.commit()
            db.refresh(exp)

        return exp

    @staticmethod
    def get_property_experiences(db: Session, property_id: int, provider_id: Optional[int] = None) -> List[Experience]:
        if provider_id is not None:
            prop = db.query(Property).filter(Property.id == property_id, Property.provider_id == provider_id).first()
            if not prop:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found or access denied.")
        return db.query(Experience).filter(Experience.property_id == property_id).all()

    @staticmethod
    def get_experience_by_id(db: Session, experience_id: int, target_date: Optional[date] = None) -> dict:
        exp = db.query(Experience).filter(Experience.id == experience_id).first()
        if not exp:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Experience not found.")
        
        remaining = exp.capacity
        check_date = target_date or exp.event_date or date.today()
        if check_date:
            booked_count = db.query(func.coalesce(func.sum(BookingExperience.participants), 0)).join(Booking).filter(
                BookingExperience.experience_id == exp.id,
                BookingExperience.scheduled_date == check_date,
                Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.VERIFIED])
            ).scalar()
            remaining = max(0, exp.capacity - booked_count)

        return {
            "id": exp.id,
            "property_id": exp.property_id,
            "title": exp.title,
            "experience_type": exp.experience_type,
            "description": exp.description,
            "price": exp.price,
            "pricing_model": exp.pricing_model,
            "capacity": exp.capacity,
            "duration": exp.duration,
            "schedule_type": exp.schedule_type,
            "event_date": exp.event_date,
            "start_time": exp.start_time,
            "end_time": exp.end_time,
            "image_url": exp.image_url,
            "is_active": exp.is_active,
            "created_at": exp.created_at,
            "remaining_capacity": remaining,
            "property_name": exp.property.name if exp.property else "",
            "property_city": exp.property.city if exp.property else "",
            "schedules": [{"id": s.id, "day_of_week": s.day_of_week, "start_time": s.start_time, "end_time": s.end_time} for s in exp.schedules if s.is_active]
        }

    @staticmethod
    def update_experience(db: Session, experience_id: int, provider_id: int, data: ExperienceUpdate) -> Experience:
        exp = db.query(Experience).filter(Experience.id == experience_id).first()
        if not exp:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Experience not found.")
        
        prop = db.query(Property).filter(Property.id == exp.property_id, Property.provider_id == provider_id).first()
        if not prop:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this experience.")

        update_dict = data.model_dump(exclude_unset=True)
        for key, val in update_dict.items():
            setattr(exp, key, val)

        db.commit()
        db.refresh(exp)
        return exp

    @staticmethod
    def delete_experience(db: Session, experience_id: int, provider_id: int) -> dict:
        exp = db.query(Experience).filter(Experience.id == experience_id).first()
        if not exp:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Experience not found.")
        
        prop = db.query(Property).filter(Property.id == exp.property_id, Property.provider_id == provider_id).first()
        if not prop:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

        db.delete(exp)
        db.commit()
        return {"message": "Experience deleted successfully", "success": True}

    @staticmethod
    def list_all_experiences(
        db: Session,
        experience_type: Optional[str] = None,
        destination: Optional[str] = None
    ) -> List[dict]:
        query = db.query(Experience).filter(Experience.is_active == True)
        if experience_type and experience_type.lower() != "all":
            query = query.filter(Experience.experience_type.ilike(f"%{experience_type}%"))
        
        if destination and destination.strip():
            query = query.join(Property).filter(
                or_(
                    Property.city.ilike(f"%{destination}%"),
                    Property.state.ilike(f"%{destination}%"),
                    Property.name.ilike(f"%{destination}%")
                )
            )

        experiences = query.all()
        return [ExperienceService.get_experience_by_id(db, e.id) for e in experiences]
