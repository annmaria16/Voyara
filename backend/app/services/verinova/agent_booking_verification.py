from typing import Optional
from sqlalchemy.orm import Session

from app.models.ai_booking import AIBookingPreview
from app.schemas.ai_booking import VeriNovaVerificationReport
from app.services.verinova.verinova_verification_service import VeriNovaVerificationService

class AgentBookingVerificationService:
    """
    Independently audits PostgreSQL database state after an autonomous booking attempt.
    Never relies on the AI agent's claim of completion.
    Delegates to VeriNovaVerificationService.
    """

    @classmethod
    def verify_booking_outcome(
        cls,
        db: Session,
        booking_id: int,
        expected_preview: Optional[AIBookingPreview] = None,
        traveler_id: Optional[int] = None
    ) -> VeriNovaVerificationReport:
        return VeriNovaVerificationService.verify_post_booking(
            db=db,
            booking_id=booking_id,
            expected_preview=expected_preview,
            traveler_id=traveler_id
        )
