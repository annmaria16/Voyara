# Backward compatibility module - redirects to app.schemas.adventure
from app.schemas.adventure import (
    AdventureScheduleSchema,
    AdventureCreate,
    AdventureUpdate,
    AdventureResponse,
    ExperienceScheduleSchema,
    ExperienceCreate,
    ExperienceUpdate,
    ExperienceResponse,
)

__all__ = [
    "AdventureScheduleSchema",
    "AdventureCreate",
    "AdventureUpdate",
    "AdventureResponse",
    "ExperienceScheduleSchema",
    "ExperienceCreate",
    "ExperienceUpdate",
    "ExperienceResponse",
]
