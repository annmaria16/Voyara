# Backward compatibility module - redirects to app.models.adventure
from app.models.adventure import (
    Adventure,
    AdventureSchedule,
    AdventureAvailability,
    Experience,
    ExperienceSchedule,
    ExperienceAvailability,
)

__all__ = [
    "Adventure",
    "AdventureSchedule",
    "AdventureAvailability",
    "Experience",
    "ExperienceSchedule",
    "ExperienceAvailability",
]
