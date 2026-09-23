import os
import sys
import uuid
from datetime import date, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException

# Ensure backend root is on python path
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal, engine, Base
from app.models.user import User, UserRole
from app.models.provider import ProviderProfile
from app.models.property import Property, PropertyType
from app.models.room import Room
from app.models.booking import Booking, BookingStatus
from app.models.review import Review
from app.schemas.review import ReviewCreate
from app.services.reviews.review_service import ReviewService
from app.services.bookings.booking_service import BookingService

def run_e2e_verification():
    db: Session = SessionLocal()
    print("[E2E] Starting Authentic Review System Verification Tests...")

    try:
        # 1. Clean up old test data
        old_test_bookings = db.query(Booking).filter(Booking.booking_number.like("VOY-E2E-%")).all()
        for b in old_test_bookings:
            db.delete(b)
        db.commit()

        # 2. Verify Providers
        provider_a = db.query(ProviderProfile).first()
        assert provider_a is not None, "Provider A must exist in DB."

        # Fetch or create a second distinct provider for isolation testing
        provider_b_user = db.query(User).filter(User.email == "test_isolated_provider@voyara.com").first()
        if not provider_b_user:
            provider_b_user = User(
                email="test_isolated_provider@voyara.com",
                hashed_password="hashedpassword",
                name="Isolated Provider Host",
                role=UserRole.PROVIDER,
                is_active=True
            )
            db.add(provider_b_user)
            db.commit()
            db.refresh(provider_b_user)

        provider_b = db.query(ProviderProfile).filter(ProviderProfile.user_id == provider_b_user.id).first()
        if not provider_b:
            provider_b = ProviderProfile(
                user_id=provider_b_user.id,
                business_name="Isolated Host Stays",
                contact_phone="+919876543299",
                contact_email="test_isolated_provider@voyara.com",
                verification_status="VERIFIED"
            )
            db.add(provider_b)
            db.commit()
            db.refresh(provider_b)

        print(f"[OK] Provider A ID: {provider_a.id} ({provider_a.business_name})")
        print(f"[OK] Provider B ID: {provider_b.id} ({provider_b.business_name})")

        # 3. Create a test property for Provider A
        prop_a = Property(
            provider_id=provider_a.id,
            name="E2E Test Highland Sanctuary",
            property_type="Resort",
            description="Scenic mountain eco-sanctuary.",
            address="Devikulam Road",
            city="Munnar",
            state="Kerala",
            country="India",
            contact_phone="+919847012345",
            contact_email="reservations@e2etest.in",
            rating=0.0,
            review_count=0,
            is_active=True
        )
        db.add(prop_a)
        db.commit()
        db.refresh(prop_a)
        print(f"[OK] Created Property A: ID {prop_a.id} (Rating {prop_a.rating}, Reviews {prop_a.review_count})")

        # Verify unreviewed property returns 0.0 rating and empty reviews
        public_reviews = ReviewService.get_property_reviews(db, prop_a.id)
        assert public_reviews["average_rating"] == 0.0, f"Expected 0.0, got {public_reviews['average_rating']}"
        assert public_reviews["review_count"] == 0
        assert len(public_reviews["reviews"]) == 0
        print("[OK] Public property reviews for unreviewed stay correctly returns 0.0 rating and 0 reviews (NO fake fallbacks).")

        # 4. Fetch or create Traveler (Customer)
        traveler = db.query(User).filter(User.role == UserRole.CUSTOMER).first()
        assert traveler is not None, "Traveler user must exist."
        print(f"[OK] Traveler User: ID {traveler.id} ({traveler.name})")

        # 5. Create upcoming booking -> Must NOT be review eligible
        uid1 = uuid.uuid4().hex[:6].upper()
        upcoming_b = Booking(
            booking_number=f"VOY-E2E-{uid1}",
            user_id=traveler.id,
            property_id=prop_a.id,
            check_in=date.today() + timedelta(days=3),
            check_out=date.today() + timedelta(days=5),
            total_nights=2,
            total_guests=2,
            total_amount=7000.0,
            status=BookingStatus.CONFIRMED,
        )
        db.add(upcoming_b)
        db.commit()
        db.refresh(upcoming_b)

        eligibility_upcoming = ReviewService.get_booking_review_eligibility(db, upcoming_b.id, traveler.id)
        assert eligibility_upcoming["eligible"] is False
        print(f"[OK] Upcoming booking review eligibility blocked: {eligibility_upcoming['reason']}")

        # 6. Create completed checkout booking
        uid2 = uuid.uuid4().hex[:6].upper()
        completed_b = Booking(
            booking_number=f"VOY-E2E-{uid2}",
            user_id=traveler.id,
            property_id=prop_a.id,
            check_in=date.today() - timedelta(days=4),
            check_out=date.today() - timedelta(days=1),
            total_nights=3,
            total_guests=2,
            total_amount=10500.0,
            status=BookingStatus.COMPLETED,
        )
        db.add(completed_b)
        db.commit()
        db.refresh(completed_b)

        eligibility_completed = ReviewService.get_booking_review_eligibility(db, completed_b.id, traveler.id)
        assert eligibility_completed["eligible"] is True
        print("[OK] Completed checkout booking is eligible for review.")

        # 7. Traveler submits rating and review
        review_input = ReviewCreate(
            booking_id=completed_b.id,
            property_id=prop_a.id,
            rating=5.0,
            cleanliness_rating=5.0,
            staff_rating=5.0,
            location_rating=5.0,
            value_rating=4.8,
            comment="An unforgettable stay surrounded by mist and birdsong. Exceptional host hospitality!"
        )
        submitted_rev = ReviewService.create_review(db=db, user_id=traveler.id, data=review_input)
        assert submitted_rev.id is not None
        print(f"[OK] Review successfully stored in PostgreSQL: ID {submitted_rev.id}, Rating {submitted_rev.rating}")

        # 8. Verify property rating and review count updated in DB
        db.refresh(prop_a)
        assert prop_a.rating == 5.0, f"Expected 5.0, got {prop_a.rating}"
        assert prop_a.review_count == 1, f"Expected 1, got {prop_a.review_count}"
        print(f"[OK] Property table dynamically updated in PostgreSQL: Rating {prop_a.rating}, Review Count {prop_a.review_count}")

        # 9. Verify Public Property Review endpoint returns the new review
        public_revs_after = ReviewService.get_property_reviews(db, prop_a.id)
        assert public_revs_after["average_rating"] == 5.0
        assert public_revs_after["review_count"] == 1
        assert len(public_revs_after["reviews"]) == 1
        assert public_revs_after["reviews"][0].comment == review_input.comment
        assert public_revs_after["reviews"][0].user.name == traveler.name
        print(f"[OK] Public property review section returns review with author '{traveler.name}', rating 5.0, and comment.")

        # 10. Verify Duplicate review is blocked
        try:
            ReviewService.create_review(db=db, user_id=traveler.id, data=review_input)
            assert False, "Duplicate review should have been blocked!"
        except HTTPException as e:
            print(f"[OK] Duplicate review submission rejected: {e.detail}")

        # 11. Verify Stay Partner A dashboard / reviews endpoint includes this review
        provider_a_reviews = ReviewService.get_provider_reviews(db, provider_a.id)
        assert provider_a_reviews["summary"]["total_reviews"] >= 1
        found_in_a = any(r["id"] == submitted_rev.id for r in provider_a_reviews["reviews"])
        assert found_in_a is True, "Submitted review must be visible to Property Owner (Provider A)!"
        print(f"[OK] Stay Partner A (Owner) sees the review: Total {provider_a_reviews['summary']['total_reviews']} review(s), Avg {provider_a_reviews['summary']['average_rating']}")

        # 12. Verify Stay Partner B (who does not own this property) CANNOT see this review (Ownership isolation)
        provider_b_reviews = ReviewService.get_provider_reviews(db, provider_b.id)
        found_in_b = any(r["id"] == submitted_rev.id for r in provider_b_reviews["reviews"])
        assert found_in_b is False, "Stay Partner B must NOT see reviews for properties they do not own!"
        print("[OK] Strict Partner Isolation verified: Stay Partner B cannot see reviews belonging to Stay Partner A's properties.")

        # 13. Clean up test records
        db.delete(submitted_rev)
        db.delete(upcoming_b)
        db.delete(completed_b)
        db.delete(prop_a)
        db.commit()
        print("[OK] Cleaned up temporary test entities.")

        print("\nALL AUTHENTIC REVIEW SYSTEM E2E TESTS PASSED SUCCESSFULLY!")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Test failed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run_e2e_verification()
