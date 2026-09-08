from datetime import date, datetime
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.review import Review
from app.models.booking import Booking, BookingStatus
from app.models.property import Property
from app.schemas.review import ReviewCreate

class ReviewService:
    @staticmethod
    def create_review(db: Session, user_id: int, data: ReviewCreate) -> Review:
        """Submit a rating and review for a completed customer booking reservation."""
        # 1. Fetch and validate booking
        booking = db.query(Booking).filter(
            Booking.id == data.booking_id,
            Booking.user_id == user_id
        ).first()

        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found or access denied."
            )

        target_property_id = data.property_id or booking.property_id

        if target_property_id != booking.property_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Booking reservation is not associated with this property."
            )

        if booking.status == BookingStatus.CANCELLED or booking.status == BookingStatus.FAILED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cancelled or failed bookings cannot be reviewed."
            )

        today = date.today()
        is_checkout_passed = booking.check_out <= today
        is_completed = booking.status == BookingStatus.COMPLETED or is_checkout_passed

        if not is_completed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Reviews can only be submitted after checkout is completed (Checkout Date: {booking.check_out.strftime('%d %b %Y')})."
            )

        # 2. Check for existing review
        existing = db.query(Review).filter(Review.booking_id == booking.id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You have already submitted a review for this booking stay."
            )

        # 3. Create Review
        review = Review(
            property_id=target_property_id,
            booking_id=data.booking_id,
            user_id=user_id,
            rating=round(float(data.rating), 1),
            cleanliness_rating=round(float(data.cleanliness_rating), 1) if data.cleanliness_rating else None,
            staff_rating=round(float(data.staff_rating), 1) if data.staff_rating else None,
            location_rating=round(float(data.location_rating), 1) if data.location_rating else None,
            value_rating=round(float(data.value_rating), 1) if data.value_rating else None,
            comment=data.comment.strip(),
        )
        db.add(review)

        # Update booking status to COMPLETED if not already
        if booking.status != BookingStatus.COMPLETED:
            booking.status = BookingStatus.COMPLETED

        db.flush()

        # 4. Authoritatively Recalculate Property Average Rating & Review Count
        avg_rating, total_reviews = db.query(
            func.avg(Review.rating),
            func.count(Review.id)
        ).filter(Review.property_id == target_property_id).first()

        prop = db.query(Property).filter(Property.id == target_property_id).first()
        if prop:
            prop.rating = round(float(avg_rating or data.rating), 1)
            prop.review_count = int(total_reviews or 1)

        db.commit()
        db.refresh(review)
        return review

    @staticmethod
    def get_property_reviews(db: Session, property_id: int) -> dict:
        """Fetch all public verified reviews and rating breakdown for a property."""
        reviews = db.query(Review).filter(
            Review.property_id == property_id
        ).order_by(Review.created_at.desc()).all()

        if not reviews:
            return {
                "property_id": property_id,
                "average_rating": 4.8,
                "review_count": 0,
                "rating_breakdown": {
                    "cleanliness": 4.9,
                    "staff": 4.8,
                    "location": 4.9,
                    "value": 4.7
                },
                "reviews": []
            }

        avg_rating = sum(r.rating for r in reviews) / len(reviews)
        
        cleanliness_scores = [r.cleanliness_rating for r in reviews if r.cleanliness_rating is not None]
        staff_scores = [r.staff_rating for r in reviews if r.staff_rating is not None]
        location_scores = [r.location_rating for r in reviews if r.location_rating is not None]
        value_scores = [r.value_rating for r in reviews if r.value_rating is not None]

        return {
            "property_id": property_id,
            "average_rating": round(avg_rating, 1),
            "review_count": len(reviews),
            "total_reviews": len(reviews),
            "rating_breakdown": {
                "cleanliness": round(sum(cleanliness_scores) / len(cleanliness_scores), 1) if cleanliness_scores else round(avg_rating, 1),
                "staff": round(sum(staff_scores) / len(staff_scores), 1) if staff_scores else round(avg_rating, 1),
                "location": round(sum(location_scores) / len(location_scores), 1) if location_scores else round(avg_rating, 1),
                "value": round(sum(value_scores) / len(value_scores), 1) if value_scores else round(avg_rating, 1),
            },
            "reviews": reviews
        }

    @staticmethod
    def get_eligible_bookings_for_review(db: Session, user_id: int) -> List[dict]:
        """Fetch customer bookings eligible for review (checkout passed, not cancelled, no review yet)."""
        today = date.today()
        
        # Subquery of already reviewed booking IDs
        reviewed_booking_ids = [r.booking_id for r in db.query(Review.booking_id).filter(Review.user_id == user_id).all()]

        query = db.query(Booking).filter(
            Booking.user_id == user_id,
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.VERIFIED, BookingStatus.COMPLETED]),
            Booking.check_out <= today
        )

        if reviewed_booking_ids:
            query = query.filter(~Booking.id.in_(reviewed_booking_ids))

        eligible_bookings = query.order_by(Booking.check_out.desc()).all()
        
        return [
            {
                "id": b.id,
                "booking_id": b.id,
                "booking_number": b.booking_number,
                "property_id": b.property_id,
                "property_name": b.property.name if b.property else "Sanctuary",
                "check_in": b.check_in,
                "check_out": b.check_out,
                "total_nights": b.total_nights,
                "room_name": b.booking_rooms[0].room_name if b.booking_rooms else "Room Unit",
                "property_image": b.property.images[0].image_url if b.property and b.property.images else None
            }
            for b in eligible_bookings
        ]
