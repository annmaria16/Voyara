from collections import defaultdict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
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
from app.routers.admin.verinova import router as verinova_router
from app.routers.admin.legal_documents import router as legal_documents_router
from app.services.search.admin_search_service import AdminSearchService
from fastapi import Query

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/search")
def search_admin_data(
    q: str = Query("", description="Search term across users, properties, and bookings"),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Search platform management data for the Voyara Control Center.
    """
    return AdminSearchService.search(db=db, query=q)


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
    
    # Bookings & Revenue Analysis
    all_bookings = db.query(Booking).order_by(Booking.created_at.desc()).all()
    total_bookings = len(all_bookings)
    confirmed_bookings = sum(1 for b in all_bookings if b.status in [BookingStatus.CONFIRMED, BookingStatus.VERIFIED, BookingStatus.PENDING])
    checked_in_bookings = sum(1 for b in all_bookings if b.status == BookingStatus.CHECKED_IN)
    completed_bookings = sum(1 for b in all_bookings if b.status == BookingStatus.COMPLETED)
    cancelled_bookings = sum(1 for b in all_bookings if b.status == BookingStatus.CANCELLED)

    total_gross_volume = sum((b.original_total_amount or b.total_amount) for b in all_bookings if b.status != BookingStatus.FAILED)
    
    # Financial metrics from PostgreSQL
    finalized_commission = sum(b.commission_amount for b in all_bookings if b.commission_status == "FINALIZED")
    pending_commission = sum(
        round((b.original_total_amount or b.total_amount) * 0.10, 2)
        for b in all_bookings
        if b.status in [BookingStatus.CONFIRMED, BookingStatus.VERIFIED, BookingStatus.PENDING] and b.commission_status != "FINALIZED"
    )
    total_refunds_amount = sum(b.refund_amount for b in all_bookings if b.status == BookingStatus.CANCELLED)
    total_provider_settlements = sum(b.provider_settlement_amount for b in all_bookings if b.payout_status == "READY" or b.commission_status == "FINALIZED")

    # Verification stats
    verified_bookings = db.query(VerificationResult).filter(VerificationResult.status == VerificationStatus.VERIFIED).count()
    needs_review_bookings = db.query(VerificationResult).filter(VerificationResult.status == VerificationStatus.NEEDS_REVIEW).count()
    failed_verifications = db.query(VerificationResult).filter(VerificationResult.status == VerificationStatus.FAILED).count()

    # Dynamic Top Locations from Properties Table
    location_rows = db.query(Property.city, func.count(Property.id)).filter(Property.city != None).group_by(Property.city).order_by(func.count(Property.id).desc()).all()
    total_props_with_city = sum(c[1] for c in location_rows) or 1
    
    palette = ['#F97360', '#10B981', '#F59E0B', '#14B8A6', '#8B5CF6', '#EC4899', '#64748B']
    top_locations = []
    for idx, (city_name, count) in enumerate(location_rows[:5]):
        pct = round((count / total_props_with_city) * 100)
        top_locations.append({
            "label": city_name or "Other",
            "percentage": pct,
            "count": count,
            "color": palette[idx % len(palette)]
        })
    
    if len(location_rows) > 5:
        other_count = sum(c[1] for c in location_rows[5:])
        top_locations.append({
            "label": "Others",
            "percentage": round((other_count / total_props_with_city) * 100),
            "count": other_count,
            "color": '#64748B'
        })
    
    if not top_locations:
        top_locations = [
            {"label": "Active Sanctuaries", "percentage": 100, "count": total_properties, "color": "#10B981"}
        ]

    # Dynamic Real Booking Activity Trends (Grouped by creation date)
    daily_booking_counts = defaultdict(int)
    daily_revenue_totals = defaultdict(float)

    for b in reversed(all_bookings[:30]):
        date_str = b.created_at.strftime('%d %b') if b.created_at else "Today"
        daily_booking_counts[date_str] += 1
        if b.status in [BookingStatus.CONFIRMED, BookingStatus.VERIFIED, BookingStatus.CHECKED_IN, BookingStatus.COMPLETED]:
            daily_revenue_totals[date_str] += (b.original_total_amount or b.total_amount)

    bookings_chart = [
        {"label": k, "value": v}
        for k, v in daily_booking_counts.items()
    ]
    if not bookings_chart:
        bookings_chart = [
            {"label": "Live System", "value": total_bookings}
        ]

    revenue_chart = [
        {"label": k, "value": round(v, 2)}
        for k, v in daily_revenue_totals.items()
    ]
    if not revenue_chart:
        revenue_chart = [
            {"label": "Live System", "value": round(total_gross_volume, 2)}
        ]

    return {
        "admin": {
            "name": admin.name,
            "email": admin.email
        },
        "stats": {
            "total_customers": total_customers,
            "total_providers": total_providers,
            "total_users": total_customers + total_providers,
            "total_properties": total_properties,
            "active_properties": active_properties,
            "total_rooms": total_rooms,
            "total_experiences": total_experiences,
            "total_bookings": total_bookings,
            "confirmed_bookings": confirmed_bookings,
            "checked_in_bookings": checked_in_bookings,
            "completed_bookings": completed_bookings,
            "cancelled_bookings": cancelled_bookings,
            "verified_bookings": verified_bookings,
            "needs_review_bookings": needs_review_bookings,
            "failed_verifications": failed_verifications,
            "total_revenue": round(total_gross_volume, 2),
            "finalized_commission": round(finalized_commission, 2),
            "pending_commission": round(pending_commission, 2),
            "total_refunds_amount": round(total_refunds_amount, 2),
            "total_provider_settlements": round(total_provider_settlements, 2),
            "verification_rate": round((verified_bookings / total_bookings * 100), 1) if total_bookings > 0 else 100.0
        },
        "top_locations": top_locations,
        "bookings_chart": bookings_chart,
        "revenue_chart": revenue_chart
    }

router.include_router(users_router)
router.include_router(properties_router)
router.include_router(bookings_router)
router.include_router(verification_router)
router.include_router(verinova_router)
router.include_router(legal_documents_router)

