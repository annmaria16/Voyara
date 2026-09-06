from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel

class ExperienceScheduleSchema(BaseModel):
    id: Optional[int] = None
    day_of_week: str
    start_time: str
    end_time: str
    is_active: bool = True

    class Config:
        from_attributes = True

class ExperienceCreate(BaseModel):
    title: str
    experience_type: str  # Campfire, Guided Trek, Sightseeing, Local Food Experience, Outdoor Activity, Cultural Experience, Adventure, Event
    description: str
    price: float
    pricing_model: str = "per_person"  # "per_person" or "fixed"
    capacity: int = 15
    duration: str = "3 Hours"
    schedule_type: str = "one-time"  # "one-time" or "recurring"
    event_date: Optional[date] = None
    start_time: str = "09:00"
    end_time: str = "12:00"
    image_url: Optional[str] = None
    schedules: Optional[List[dict]] = None

class ExperienceUpdate(BaseModel):
    title: Optional[str] = None
    experience_type: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    pricing_model: Optional[str] = None
    capacity: Optional[int] = None
    duration: Optional[str] = None
    schedule_type: Optional[str] = None
    event_date: Optional[date] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None

class ExperienceResponse(BaseModel):
    id: int
    property_id: int
    title: str
    experience_type: str
    description: str
    price: float
    pricing_model: str
    capacity: int
    duration: str
    schedule_type: str
    event_date: Optional[date] = None
    start_time: str
    end_time: str
    image_url: Optional[str] = None
    is_active: bool
    created_at: datetime
    remaining_capacity: Optional[int] = None
    schedules: List[ExperienceScheduleSchema] = []

    class Config:
        from_attributes = True
