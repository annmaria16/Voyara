# Backward compatibility re-export
from app.services.adventures.adventure_service import AdventureService, ExperienceService

__all__ = ["AdventureService", "ExperienceService"]
