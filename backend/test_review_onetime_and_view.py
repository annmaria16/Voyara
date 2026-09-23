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
from app.models.property import Property, PropertyType
from app.models.room import Room
from app.models.booking import Booking, BookingStatus
from app.models.review import Review
from app.schemas.review import ReviewCreate
from app.schemas.booking import BookingResponse
from app.services.reviews.review_service import ReviewService
from app.services.bookings.booking_service import BookingService

def run_tests():
    db: Session = SessionLocal()
    print("[TEST] Starting Review One-Time & View Verification Tests...")

    try:
        # Clean up any leftover test bookings from previous runs
        old_test_bookings = db.query(Booking).filter(Booking.booking_number.like("VOY-TEST-%")).all()
        for ob in old_test_bookings:
            db.delete(ob)
        db.commit()

        # 1. Fetch or create a test customer
        customer = db.query(User).filter(User.role == UserRole.CUSTOMER).first()
        if not customer:
            customer = User(
                email="testreviewcustomer@example.com",
                hashed_password="hashedpassword",
                name="Review Test Customer",
                role=UserRole.CUSTOMER,
                is_active=True
            )
            db.add(customer)
            db.commit()
            db.refresh(customer)
        print(f"[OK] Customer: ID {customer.id} ({customer.name})")

        # 2. Fetch a property
        prop = db.query(Property).first()
        assert prop is not None, "At least one property must exist in database."
        print(f"[OK] Property: ID {prop.id} ({prop.name})")

        uid1 = uuid.uuid4().hex[:6].upper()
        uid2 = uuid.uuid4().hex[:6].upper()

        # 3. Create a test upcoming booking (check-in in future)
        upcoming_booking = Booking(
            booking_number=f"VOY-TEST-{uid1}",
            user_id=customer.id,
            property_id=prop.id,
            check_in=date.today() + timedelta(days=2),
            check_out=date.today() + timedelta(days=4),
            total_nights=2,
            total_guests=2,
            total_amount=5000.0,
            status=BookingStatus.CONFIRMED,
        )
        db.add(upcoming_booking)
        db.commit()
        db.refresh(upcoming_booking)
        print(f"[OK] Created upcoming booking: ID {upcoming_booking.id}, status {upcoming_booking.status}")

        # Verify upcoming booking review rejection
        try:
            ReviewService.create_review(
                db=db,
                user_id=customer.id,
                data=ReviewCreate(
                    booking_id=upcoming_booking.id,
                    property_id=prop.id,
                    rating=5.0,
                    comment="Great upcoming stay!"
                )
            )
            assert False, "Upcoming booking should not be reviewable!"
        except HTTPException as e:
            print(f"[OK] Upcoming booking review correctly rejected: {e.detail}")

        # 4. Create a completed/checked-out booking (checkout was yesterday)
        completed_booking = Booking(
            booking_number=f"VOY-TEST-{uid2}",
            user_id=customer.id,
            property_id=prop.id,
            check_in=date.today() - timedelta(days=3),
            check_out=date.today() - timedelta(days=1),
            total_nights=2,
            total_guests=2,
            total_amount=6000.0,
            status=BookingStatus.COMPLETED,
        )
        db.add(completed_booking)
        db.commit()
        db.refresh(completed_booking)
        print(f"[OK] Created completed booking: ID {completed_booking.id}, status {completed_booking.status}")

        # Check eligibility before review
        eligibility = ReviewService.get_booking_review_eligibility(db, completed_booking.id, customer.id)
        assert eligibility["eligible"] is True, f"Expected eligible=True, got {eligibility}"
        assert eligibility["already_reviewed"] is False
        print("[OK] Review eligibility before submission: Eligible = True")

        # 5. Submit review for the completed booking
        review_data = ReviewCreate(
            booking_id=completed_booking.id,
            property_id=prop.id,
            rating=4.8,
            cleanliness_rating=5.0,
            staff_rating=4.5,
            location_rating=5.0,
            value_rating=4.7,
            comment="Breathtaking views and impeccable hospitality! Highly recommended."
        )
        created_review = ReviewService.create_review(db=db, user_id=customer.id, data=review_data)
        assert created_review.id is not None
        assert created_review.rating == 4.8
        print(f"[OK] Successfully submitted review: ID {created_review.id}, Rating {created_review.rating}")

        # 6. Check eligibility after review submission
        eligibility_after = ReviewService.get_booking_review_eligibility(db, completed_booking.id, customer.id)
        assert eligibility_after["eligible"] is False, f"Expected eligible=False after review, got {eligibility_after}"
        assert eligibility_after["already_reviewed"] is True
        assert eligibility_after["existing_review"]["rating"] == 4.8
        assert eligibility_after["existing_review"]["cleanliness_rating"] == 5.0
        print(f"[OK] Review eligibility after submission: already_reviewed = True, reason: {eligibility_after['reason']}")

        # 7. Attempt to submit a duplicate review for the same booking -> MUST FAIL
        try:
            ReviewService.create_review(
                db=db,
                user_id=customer.id,
                data=ReviewCreate(
                    booking_id=completed_booking.id,
                    property_id=prop.id,
                    rating=1.0,
                    comment="Attempting second review on same booking"
                )
            )
            assert False, "Duplicate review on same booking must be rejected!"
        except HTTPException as e:
            print(f"[OK] Duplicate review correctly rejected: {e.detail}")

        # 8. Verify BookingResponse Pydantic serialization includes the review
        db_booking = BookingService.get_booking_by_id(db, completed_booking.id, user_id=customer.id)
        response_model = BookingResponse.model_validate(db_booking)
        assert response_model.review is not None, "BookingResponse must include the serialized review object!"
        assert response_model.review.rating == 4.8
        assert response_model.review.comment == "Breathtaking views and impeccable hospitality! Highly recommended."
        print(f"[OK] BookingResponse serialized review: Rating {response_model.review.rating}, Comment: '{response_model.review.comment}'")

        # Clean up test records
        db.delete(created_review)
        db.delete(upcoming_booking)
        db.delete(completed_booking)
        db.commit()
        print("[OK] Cleaned up test records.")

        print("\nALL ONE-TIME REVIEW & VIEW VERIFICATION TESTS PASSED SUCCESSFULLY!")

    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
