from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_admin
from app.models.user import User, UserRole
from app.models.provider import ProviderProfile
from app.models.property import Property
from app.models.room import Room
from app.models.experience import Experience
from app.models.booking import Booking, BookingStatus
from app.models.verification import VerificationResult, VerificationStatus
from app.routers.admin.users import router as users_router
from app.routers.admin.properties import router as properties_router
from app.routers.admin.bookings import router as bookings_router
from app.routers.admin.verification import router as verification_router

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/dashboard")
def get_admin_dashboard(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Get live system-wide statistics for the Admin Dashboard.
    100% computed from real database records.
    """
    total_customers = db.query(User).filter(User.role == UserRole.CUSTOMER).count()
    total_providers = db.query(ProviderProfile).count()
    total_properties = db.query(Property).count()
    active_properties = db.query(Property).filter(Property.is_active == True).count()
    total_rooms = db.query(Room).count()
    total_experiences = db.query(Experience).count()
    total_bookings = db.query(Booking).count()
    
    # Verification stats
    verified_bookings = db.query(VerificationResult).filter(VerificationResult.status == VerificationStatus.VERIFIED).count()
    needs_review_bookings = db.query(VerificationResult).filter(VerificationResult.status == VerificationStatus.NEEDS_REVIEW).count()
    failed_verifications = db.query(VerificationResult).filter(VerificationResult.status == VerificationStatus.FAILED).count()

    total_revenue = sum(b.total_amount for b in db.query(Booking).filter(Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.VERIFIED])).all())

    return {
        "admin": {
            "name": admin.name,
            "email": admin.email
        },
        "stats": {
            "total_customers": total_customers,
            "total_providers": total_providers,
            "total_properties": total_properties,
            "active_properties": active_properties,
            "total_rooms": total_rooms,
            "total_experiences": total_experiences,
            "total_bookings": total_bookings,
            "verified_bookings": verified_bookings,
            "needs_review_bookings": needs_review_bookings,
            "failed_verifications": failed_verifications,
            "total_revenue": round(total_revenue, 2),
            "verification_rate": round((verified_bookings / total_bookings * 100), 1) if total_bookings > 0 else 100.0
        }
    }

router.include_router(users_router)
router.include_router(properties_router)
router.include_router(bookings_router)
router.include_router(verification_router)
