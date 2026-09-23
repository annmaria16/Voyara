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
                "average_rating": 0.0,
                "review_count": 0,
                "total_reviews": 0,
                "rating_breakdown": {
                    "cleanliness": 0.0,
                    "staff": 0.0,
                    "location": 0.0,
                    "value": 0.0
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
    def get_provider_reviews(db: Session, provider_id: int) -> dict:
        """Fetch all verified reviews grouped by property for a specific Stay Partner."""
        provider_props = db.query(Property).filter(Property.provider_id == provider_id).all()
        
        property_summaries = []
        all_reviews = []
        all_ratings = []
        all_cleanliness = []
        all_staff = []
        all_location = []
        all_value = []

        for prop in provider_props:
            prop_reviews = db.query(Review).filter(
                Review.property_id == prop.id
            ).order_by(Review.created_at.desc()).all()

            prop_cleanliness = [r.cleanliness_rating for r in prop_reviews if r.cleanliness_rating is not None]
            prop_staff = [r.staff_rating for r in prop_reviews if r.staff_rating is not None]
            prop_location = [r.location_rating for r in prop_reviews if r.location_rating is not None]
            prop_value = [r.value_rating for r in prop_reviews if r.value_rating is not None]

            prop_avg = round(sum(r.rating for r in prop_reviews) / len(prop_reviews), 1) if prop_reviews else 0.0

            # Rating distribution (counts of 5, 4, 3, 2, 1 stars)
            distribution = {
                "5": sum(1 for r in prop_reviews if round(r.rating) >= 5),
                "4": sum(1 for r in prop_reviews if round(r.rating) == 4),
                "3": sum(1 for r in prop_reviews if round(r.rating) == 3),
                "2": sum(1 for r in prop_reviews if round(r.rating) == 2),
                "1": sum(1 for r in prop_reviews if round(r.rating) <= 1),
            }

            formatted_prop_reviews = [
                {
                    "id": r.id,
                    "property_id": r.property_id,
                    "property_name": prop.name,
                    "booking_id": r.booking_id,
                    "booking_number": r.booking.booking_number if r.booking else f"VOY-{r.booking_id}",
                    "user_id": r.user_id,
                    "user_name": r.user.name if r.user else "Verified Traveler",
                    "user_avatar": r.user.avatar_url if r.user else None,
                    "rating": r.rating,
                    "cleanliness_rating": r.cleanliness_rating,
                    "staff_rating": r.staff_rating,
                    "location_rating": r.location_rating,
                    "value_rating": r.value_rating,
                    "comment": r.comment,
                    "created_at": r.created_at
                }
                for r in prop_reviews
            ]

            primary_img = None
            if prop.images and len(prop.images) > 0:
                primary_img = prop.images[0].image_url

            property_summaries.append({
                "property_id": prop.id,
                "property_name": prop.name,
                "property_type": prop.property_type,
                "city": prop.city,
                "state": prop.state,
                "country": prop.country,
                "image_url": primary_img,
                "average_rating": prop_avg,
                "review_count": len(prop_reviews),
                "rating_breakdown": {
                    "cleanliness": round(sum(prop_cleanliness) / len(prop_cleanliness), 1) if prop_cleanliness else prop_avg,
                    "staff": round(sum(prop_staff) / len(prop_staff), 1) if prop_staff else prop_avg,
                    "location": round(sum(prop_location) / len(prop_location), 1) if prop_location else prop_avg,
                    "value": round(sum(prop_value) / len(prop_value), 1) if prop_value else prop_avg,
                },
                "rating_distribution": distribution,
                "reviews": formatted_prop_reviews
            })

            all_reviews.extend(formatted_prop_reviews)
            all_ratings.extend([r.rating for r in prop_reviews])
            all_cleanliness.extend(prop_cleanliness)
            all_staff.extend(prop_staff)
            all_location.extend(prop_location)
            all_value.extend(prop_value)

        overall_avg = round(sum(all_ratings) / len(all_ratings), 1) if all_ratings else 0.0

        return {
            "properties": property_summaries,
            "summary": {
                "total_properties": len(provider_props),
                "total_reviews": len(all_reviews),
                "average_rating": overall_avg,
                "rating_breakdown": {
                    "cleanliness": round(sum(all_cleanliness) / len(all_cleanliness), 1) if all_cleanliness else overall_avg,
                    "staff": round(sum(all_staff) / len(all_staff), 1) if all_staff else overall_avg,
                    "location": round(sum(all_location) / len(all_location), 1) if all_location else overall_avg,
                    "value": round(sum(all_value) / len(all_value), 1) if all_value else overall_avg,
                }
            },
            "reviews": all_reviews
        }

    @staticmethod
    def get_provider_property_reviews(db: Session, provider_id: int, property_id: int) -> dict:
        """Fetch all verified reviews for a specific property owned by a Stay Partner."""
        prop = db.query(Property).filter(
            Property.id == property_id,
            Property.provider_id == provider_id
        ).first()

        if not prop:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Property not found or access denied for this Stay Partner."
            )

        reviews = db.query(Review).filter(
            Review.property_id == prop.id
        ).order_by(Review.created_at.desc()).all()

        cleanliness_scores = [r.cleanliness_rating for r in reviews if r.cleanliness_rating is not None]
        staff_scores = [r.staff_rating for r in reviews if r.staff_rating is not None]
        location_scores = [r.location_rating for r in reviews if r.location_rating is not None]
        value_scores = [r.value_rating for r in reviews if r.value_rating is not None]

        avg_rating = round(sum(r.rating for r in reviews) / len(reviews), 1) if reviews else 0.0

        distribution = {
            "5": sum(1 for r in reviews if round(r.rating) >= 5),
            "4": sum(1 for r in reviews if round(r.rating) == 4),
            "3": sum(1 for r in reviews if round(r.rating) == 3),
            "2": sum(1 for r in reviews if round(r.rating) == 2),
            "1": sum(1 for r in reviews if round(r.rating) <= 1),
        }

        review_list = [
            {
                "id": r.id,
                "property_id": r.property_id,
                "property_name": prop.name,
                "booking_id": r.booking_id,
                "booking_number": r.booking.booking_number if r.booking else f"VOY-{r.booking_id}",
                "user_id": r.user_id,
                "user_name": r.user.name if r.user else "Verified Traveler",
                "user_avatar": r.user.avatar_url if r.user else None,
                "rating": r.rating,
                "cleanliness_rating": r.cleanliness_rating,
                "staff_rating": r.staff_rating,
                "location_rating": r.location_rating,
                "value_rating": r.value_rating,
                "comment": r.comment,
                "created_at": r.created_at
            }
            for r in reviews
        ]

        primary_img = None
        if prop.images and len(prop.images) > 0:
            primary_img = prop.images[0].image_url

        return {
            "property_id": prop.id,
            "property_name": prop.name,
            "property_type": prop.property_type,
            "city": prop.city,
            "state": prop.state,
            "country": prop.country,
            "image_url": primary_img,
            "average_rating": avg_rating,
            "review_count": len(reviews),
            "rating_distribution": distribution,
            "rating_breakdown": {
                "cleanliness": round(sum(cleanliness_scores) / len(cleanliness_scores), 1) if cleanliness_scores else avg_rating,
                "staff": round(sum(staff_scores) / len(staff_scores), 1) if staff_scores else avg_rating,
                "location": round(sum(location_scores) / len(location_scores), 1) if location_scores else avg_rating,
                "value": round(sum(value_scores) / len(value_scores), 1) if value_scores else avg_rating,
            },
            "reviews": review_list
        }

    @staticmethod
    def get_booking_review_eligibility(db: Session, booking_id: int, user_id: int) -> dict:
        """Checks if a specific booking is eligible for a customer review."""
        booking = db.query(Booking).filter(
            Booking.id == booking_id,
            Booking.user_id == user_id
        ).first()

        if not booking:
            return {
                "eligible": False,
                "reason": "Booking reservation not found or access denied.",
                "existing_review": None
            }

        existing_review = db.query(Review).filter(Review.booking_id == booking.id).first()
        if existing_review:
            return {
                "eligible": False,
                "already_reviewed": True,
                "reason": "You have already submitted a review for this booking stay.",
                "existing_review": {
                    "id": existing_review.id,
                    "rating": existing_review.rating,
                    "cleanliness_rating": existing_review.cleanliness_rating,
                    "staff_rating": existing_review.staff_rating,
                    "location_rating": existing_review.location_rating,
                    "value_rating": existing_review.value_rating,
                    "comment": existing_review.comment,
                    "created_at": existing_review.created_at
                }
            }

        if booking.status in [BookingStatus.CANCELLED, BookingStatus.FAILED]:
            return {
                "eligible": False,
                "already_reviewed": False,
                "reason": "Cancelled or failed stays cannot be reviewed.",
                "existing_review": None
            }

        today = date.today()
        is_completed = (booking.status == BookingStatus.COMPLETED) or (booking.check_out <= today and booking.status in [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT])

        if not is_completed:
            return {
                "eligible": False,
                "already_reviewed": False,
                "reason": f"Reviews are permitted only after checkout is complete ({booking.check_out.strftime('%d %b %Y')}).",
                "existing_review": None
            }

        return {
            "eligible": True,
            "already_reviewed": False,
            "reason": "Eligible for review",
            "existing_review": None
        }

    @staticmethod
    def get_eligible_bookings_for_review(db: Session, user_id: int) -> List[dict]:
        """Fetch customer bookings eligible for review (checkout passed, not cancelled, no review yet)."""
        today = date.today()
        
        # Subquery of already reviewed booking IDs
        reviewed_booking_ids = [r.booking_id for r in db.query(Review.booking_id).filter(Review.user_id == user_id).all()]

        query = db.query(Booking).filter(
            Booking.user_id == user_id,
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.VERIFIED, BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT, BookingStatus.COMPLETED]),
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
