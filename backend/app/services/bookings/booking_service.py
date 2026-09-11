import random
import string
from datetime import datetime, date, time, timedelta, timezone
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.booking import Booking, BookingStatus, BookingRoom, BookingExperience
from app.models.property import Property
from app.models.room import Room
from app.models.experience import Experience
from app.models.availability import PropertyAvailability, RoomAvailability
from app.models.verification import VerificationResult
from app.models.refund import Refund, RefundStatus
from app.models.payment import Payment, PaymentStatus
from app.schemas.booking import BookingCreate, CancellationPreviewResponse
from app.services.verinova.verification_service import VeriNovaService

def generate_booking_number() -> str:
    random_digits = "".join(random.choices(string.digits, k=4))
    return f"VOY-{random_digits}"

def generate_refund_reference() -> str:
    random_chars = "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
    return f"VN-REF-{random_chars}"

class BookingService:
    @staticmethod
    def create_booking(db: Session, user_id: int, data: BookingCreate) -> Booking:
        # 1. Validate dates
        today = date.today()
        if data.check_in < today:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Check-in date cannot be in the past.",
            )

        if data.check_out <= data.check_in:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Check-out date must be strictly after Check-in date.",
            )
        
        nights = (data.check_out - data.check_in).days
        if nights <= 0:
            nights = 1

        requested_quantity = max(1, getattr(data, 'room_quantity', 1) or 1)
        requested_guests = max(1, data.total_guests or 1)

        # 2. Validate Property
        prop = db.query(Property).filter(Property.id == data.property_id).first()
        if not prop or not prop.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected property does not exist or is currently inactive.",
            )

        # 3. Check Property Closures
        closure = db.query(PropertyAvailability).filter(
            PropertyAvailability.property_id == prop.id,
            PropertyAvailability.is_closed == True,
            PropertyAvailability.start_date <= data.check_out,
            PropertyAvailability.end_date >= data.check_in
        ).first()
        if closure:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Property '{prop.name}' is closed for the selected dates. Reason: {closure.reason}",
            )

        # 4. Validate Room with Row-Level Lock for Double-Booking / Concurrency Safety
        room = db.query(Room).filter(Room.id == data.room_id).with_for_update().first()
        if not room or room.property_id != prop.id or not room.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected room unit does not exist, is inactive, or does not belong to this property.",
            )

        # Check Room Availability blocks
        room_block = db.query(RoomAvailability).filter(
            RoomAvailability.room_id == room.id,
            RoomAvailability.is_blocked == True,
            RoomAvailability.start_date <= data.check_out,
            RoomAvailability.end_date >= data.check_in
        ).first()
        if room_block:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Room '{room.name}' is unavailable/blocked for these dates. Reason: {room_block.reason}",
            )

        # Validate Guest Capacity for the requested room count
        max_allowed_guests = room.capacity * requested_quantity
        if requested_guests > max_allowed_guests:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"This room allows a maximum of {room.capacity} guests per room ({max_allowed_guests} guests for {requested_quantity} room(s)). You selected {requested_guests} guests.",
            )

        # Calculate live booked quantity for overlapping dates (CONFIRMED, CHECKED_IN, VERIFIED)
        booked_qty = db.query(
            func.coalesce(func.sum(BookingRoom.quantity), 0)
        ).join(Booking).filter(
            BookingRoom.room_id == room.id,
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.VERIFIED, BookingStatus.CHECKED_IN]),
            Booking.check_in < data.check_out,
            Booking.check_out > data.check_in
        ).scalar() or 0

        available_qty = max(0, room.quantity - booked_qty)
        if requested_quantity > available_qty:
            if available_qty == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Sorry, this room is fully booked for the selected dates.",
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Only {available_qty} room(s) available for these dates. You requested {requested_quantity}.",
                )

        # Calculate Room Total Authoritatively on Backend
        room_nightly_price = room.base_price
        room_total = round(room_nightly_price * nights * requested_quantity, 2)

        # 5. Validate Experience (if selected)
        experience_total = 0.0
        exp_record = None
        exp_date = data.experience_date or data.check_in
        exp_participants = data.experience_participants or 1

        if data.experience_id:
            exp_record = db.query(Experience).filter(Experience.id == data.experience_id).first()
            if not exp_record or exp_record.property_id != prop.id or not exp_record.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Selected experience does not exist or does not belong to this property.",
                )

            # Check Experience Capacity
            booked_exp_count = db.query(
                func.coalesce(func.sum(BookingExperience.participants), 0)
            ).join(Booking).filter(
                BookingExperience.experience_id == exp_record.id,
                BookingExperience.scheduled_date == exp_date,
                Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.VERIFIED, BookingStatus.CHECKED_IN])
            ).scalar() or 0

            remaining_capacity = exp_record.capacity - booked_exp_count
            if exp_participants > remaining_capacity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"The selected experience has reached its capacity (Requested: {exp_participants}, Remaining: {max(0, remaining_capacity)}).",
                )

            if exp_record.pricing_model == "per_person":
                experience_total = round(exp_record.price * exp_participants, 2)
            else:
                experience_total = round(exp_record.price, 2)

        # Calculate Total Amount strictly on backend
        total_amount = round(room_total + experience_total, 2)

        # Generate unique booking number
        booking_number = generate_booking_number()
        while db.query(Booking).filter(Booking.booking_number == booking_number).first():
            booking_number = generate_booking_number()

        # Cancellation Policy Snapshot
        host_refund_pct = float(getattr(prop, 'cancellation_refund_percentage', 50) or 50)
        policy_snapshot = f"100% refund up to 2 days before check-in. {int(host_refund_pct)}% refund within 2 days of check-in."

        # Create Booking
        booking = Booking(
            booking_number=booking_number,
            user_id=user_id,
            property_id=prop.id,
            check_in=data.check_in,
            check_out=data.check_out,
            total_nights=nights,
            total_guests=requested_guests,
            room_total=room_total,
            experience_total=experience_total,
            total_amount=total_amount,
            status=BookingStatus.CONFIRMED,
            customer_notes=data.customer_notes,
            guest_information_message_snapshot=prop.guest_information_message,
            cancellation_policy_snapshot=policy_snapshot,
            refund_percentage_snapshot=host_refund_pct,
            checkin_reminder_sent=False
        )
        db.add(booking)
        db.flush()

        # Create BookingRoom item
        booking_room = BookingRoom(
            booking_id=booking.id,
            room_id=room.id,
            room_name=room.name,
            nightly_price=room_nightly_price,
            nights=nights,
            quantity=requested_quantity,
            guests=requested_guests,
            subtotal=room_total
        )
        db.add(booking_room)

        # Create BookingExperience item if selected
        if exp_record:
            booking_exp = BookingExperience(
                booking_id=booking.id,
                experience_id=exp_record.id,
                experience_title=exp_record.title,
                price=exp_record.price,
                pricing_model=exp_record.pricing_model,
                participants=exp_participants,
                subtotal=experience_total,
                scheduled_date=exp_date
            )
            db.add(booking_exp)

        db.flush()

        # 6. Run VeriNova Transaction Verification
        VeriNovaService.verify_booking_transaction(db, booking)

        # 7. Customer In-App Notifications for Confirmed Booking & Host Message
        try:
            from app.services.notifications.notification_service import NotificationService
            NotificationService.create_notification(
                db=db,
                user_id=user_id,
                title="Booking Confirmed",
                message=f"Your booking at {prop.name} has been confirmed.",
                type="BOOKING_CONFIRMED",
                link="/my-bookings",
                booking_id=booking.id
            )

            if booking.guest_information_message_snapshot:
                NotificationService.create_notification(
                    db=db,
                    user_id=user_id,
                    title="Important information from your host",
                    message=f"Your host has shared important safety, property and check-in information for your stay at {prop.name}.",
                    type="HOST_MESSAGE",
                    link="/my-bookings",
                    booking_id=booking.id
                )
        except Exception as e:
            print("Error dispatching customer booking notifications:", e)

        # 8. Check if room is now fully booked for these dates, and send an in-app alert to the host
        try:
            remaining_after = max(0, available_qty - requested_quantity)
            if remaining_after == 0:
                from app.services.notifications.notification_service import NotificationService
                from app.models.provider import ProviderProfile
                provider_profile = db.query(ProviderProfile).filter(ProviderProfile.id == prop.provider_id).first()
                target_user_id = provider_profile.user_id if provider_profile else prop.provider_id
                formatted_check_in = data.check_in.strftime('%d %b %Y')
                formatted_check_out = data.check_out.strftime('%d %b %Y')
                NotificationService.create_notification(
                    db=db,
                    user_id=target_user_id,
                    title=f"Room Fully Booked: {room.name}",
                    message=f"All {room.quantity} unit(s) of '{room.name}' at '{prop.name}' are now fully booked for {formatted_check_in} – {formatted_check_out}.",
                    type="ROOM_FULLY_BOOKED",
                    link="/provider/availability"
                )
        except Exception as e:
            print("Error dispatching fully booked notification to host:", e)

        db.commit()
        db.refresh(booking)

        return booking

    @staticmethod
    def auto_complete_past_bookings(db: Session):
        """Automatically mark stays as COMPLETED once their checkout date has passed."""
        try:
            today = date.today()
            past_bookings = db.query(Booking).filter(
                Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.VERIFIED, BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT]),
                Booking.check_out < today
            ).all()
            if past_bookings:
                for b in past_bookings:
                    b.status = BookingStatus.COMPLETED
                    if not b.completed_at:
                        b.completed_at = datetime.utcnow()
                db.commit()
        except Exception as e:
            print("Error auto-completing past bookings:", e)

    @staticmethod
    def get_customer_bookings(db: Session, user_id: int) -> List[Booking]:
        BookingService.auto_complete_past_bookings(db)
        return db.query(Booking).filter(Booking.user_id == user_id).order_by(Booking.created_at.desc()).all()

    @staticmethod
    def get_provider_bookings(db: Session, provider_id: int) -> List[Booking]:
        BookingService.auto_complete_past_bookings(db)
        return db.query(Booking).join(Property).filter(
            Property.provider_id == provider_id
        ).order_by(Booking.created_at.desc()).all()

    @staticmethod
    def get_all_bookings(db: Session) -> List[Booking]:
        BookingService.auto_complete_past_bookings(db)
        return db.query(Booking).order_by(Booking.created_at.desc()).all()

    @staticmethod
    def get_booking_by_id(db: Session, booking_id: int, user_id: Optional[int] = None, provider_id: Optional[int] = None) -> Booking:
        query = db.query(Booking).filter(Booking.id == booking_id)
        if user_id is not None:
            query = query.filter(Booking.user_id == user_id)
        elif provider_id is not None:
            query = query.join(Property).filter(Property.provider_id == provider_id)
        
        booking = query.first()
        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking reservation not found or access denied.",
            )
        return booking

    @staticmethod
    def calculate_cancellation_refund(booking: Booking, check_datetime: Optional[datetime] = None) -> dict:
        """
        Calculates refund amount, refund percentage, and cancellation fee authoritatively.
        Rule:
          - >= 2 full days before check-in datetime: 100% refund (₹0 fee).
          - < 2 days before check-in datetime: host-configured refund percentage.
        """
        # Determine local timezone
        try:
            from zoneinfo import ZoneInfo
            tz = ZoneInfo("Asia/Kolkata")
        except Exception:
            tz = timezone(timedelta(hours=5, minutes=30))

        now = check_datetime or datetime.now(tz)
        if now.tzinfo is None:
            now = now.replace(tzinfo=tz)

        # Parse check-in time on property
        check_in_time_str = "14:00"
        if booking.property and booking.property.check_in_time:
            check_in_time_str = booking.property.check_in_time.strip()

        try:
            time_parts = [int(p) for p in check_in_time_str.split(":")[:2]]
            c_time = time(hour=time_parts[0], minute=time_parts[1])
        except Exception:
            c_time = time(hour=14, minute=0)

        check_in_datetime = datetime.combine(booking.check_in, c_time, tzinfo=tz)
        free_cancellation_deadline_dt = check_in_datetime - timedelta(days=2)
        free_cancellation_deadline_str = free_cancellation_deadline_dt.strftime('%d %B %Y at %I:%M %p')

        # Host-defined policy within 2 days
        host_pct = booking.refund_percentage_snapshot
        if host_pct is None:
            host_pct = float(getattr(booking.property, 'cancellation_refund_percentage', 50) or 50)

        policy_desc = (
            f"100% refund if cancelled by {free_cancellation_deadline_str}. "
            f"{int(host_pct)}% refund if cancelled within 2 days of check-in."
        )

        is_free_cancellation = (now <= free_cancellation_deadline_dt)

        if is_free_cancellation:
            refund_percentage = 100.0
            refund_amount = round(booking.total_amount, 2)
            cancellation_fee = 0.0
        else:
            refund_percentage = float(host_pct)
            refund_amount = round(booking.total_amount * (refund_percentage / 100.0), 2)
            cancellation_fee = round(booking.total_amount - refund_amount, 2)

        return {
            "check_in_datetime": check_in_datetime,
            "free_cancellation_deadline": free_cancellation_deadline_str,
            "is_free_cancellation": is_free_cancellation,
            "refund_percentage": refund_percentage,
            "refund_amount": refund_amount,
            "cancellation_fee": cancellation_fee,
            "policy_description": policy_desc
        }

    @staticmethod
    def get_cancellation_preview(db: Session, booking_id: int, user_id: int) -> dict:
        """Fetch server-side cancellation & refund preview for a customer booking."""
        booking = BookingService.get_booking_by_id(db, booking_id, user_id=user_id)

        can_cancel = True
        reason = None

        if booking.status in [BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT, BookingStatus.COMPLETED]:
            can_cancel = False
            reason = "Stays that are currently checked-in or completed cannot be cancelled."
        elif booking.status == BookingStatus.CANCELLED:
            can_cancel = False
            reason = "This reservation has already been cancelled."
        elif booking.status == BookingStatus.FAILED:
            can_cancel = False
            reason = "Failed reservations cannot be cancelled."

        calc = BookingService.calculate_cancellation_refund(booking)

        return {
            "booking_id": booking.id,
            "booking_number": booking.booking_number,
            "property_id": booking.property_id,
            "property_name": booking.property.name if booking.property else "Sanctuary",
            "check_in": booking.check_in,
            "check_in_time": booking.property.check_in_time if booking.property else "14:00",
            "booking_amount": booking.total_amount,
            "free_cancellation_deadline": calc["free_cancellation_deadline"],
            "is_free_cancellation": calc["is_free_cancellation"],
            "refund_percentage": calc["refund_percentage"],
            "refund_amount": calc["refund_amount"],
            "cancellation_fee": calc["cancellation_fee"],
            "policy_description": calc["policy_description"],
            "can_cancel": can_cancel,
            "reason": reason
        }

    @staticmethod
    def cancel_booking(db: Session, booking_id: int, user_id: int, reason: Optional[str] = None) -> Booking:
        """
        Executes atomic booking cancellation with VeriNova verification,
        creates authoritative Refund record, releases room units, and dispatches notifications.
        """
        # Lock booking row for atomic update
        booking = db.query(Booking).filter(
            Booking.id == booking_id,
            Booking.user_id == user_id
        ).with_for_update().first()

        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found or access denied."
            )

        if booking.status == BookingStatus.CANCELLED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Booking is already cancelled."
            )

        if booking.status in [BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT, BookingStatus.COMPLETED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Checked-in or completed stays cannot be cancelled."
            )

        if booking.status == BookingStatus.FAILED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed bookings cannot be cancelled."
            )

        # Calculate refund server-side
        calc = BookingService.calculate_cancellation_refund(booking)
        refund_amount = calc["refund_amount"]
        refund_percentage = calc["refund_percentage"]
        cancellation_fee = calc["cancellation_fee"]

        # Run VeriNova Cancellation Integrity Verification
        VeriNovaService.verify_cancellation_transaction(
            db=db,
            booking=booking,
            refund_amount=refund_amount,
            refund_percentage=refund_percentage,
            actor_id=user_id,
            actor_role="CUSTOMER"
        )

        # Update Booking Status
        booking.status = BookingStatus.CANCELLED
        booking.cancelled_at = datetime.utcnow()
        booking.cancellation_reason = (reason or "Customer requested cancellation").strip()

        # Create or update Refund Record
        refund_ref = generate_refund_reference()
        while db.query(Refund).filter(Refund.refund_reference == refund_ref).first():
            refund_ref = generate_refund_reference()

        refund_record = db.query(Refund).filter(Refund.booking_id == booking.id).first()
        if not refund_record:
            refund_record = Refund(
                booking_id=booking.id,
                user_id=user_id,
                refund_reference=refund_ref,
                refund_amount=refund_amount,
                refund_percentage=refund_percentage,
                cancellation_fee=cancellation_fee,
                refund_status="REFUNDED",
                refund_reason=booking.cancellation_reason,
                requested_at=datetime.utcnow(),
                processed_at=datetime.utcnow()
            )
            db.add(refund_record)
        else:
            refund_record.refund_amount = refund_amount
            refund_record.refund_percentage = refund_percentage
            refund_record.cancellation_fee = cancellation_fee
            refund_record.refund_status = "REFUNDED"
            refund_record.processed_at = datetime.utcnow()

        # Update payment status if exists
        if booking.payment:
            booking.payment.status = PaymentStatus.REFUNDED

        db.flush()

        # Dispatch Notifications
        try:
            from app.services.notifications.notification_service import NotificationService
            from app.models.provider import ProviderProfile
            
            prop_name = booking.property.name if booking.property else "Sanctuary"
            room_qty = booking.booking_rooms[0].quantity if booking.booking_rooms else 1

            # 1. Customer Notification: Booking Cancelled
            NotificationService.create_notification(
                db=db,
                user_id=user_id,
                title="Booking Cancelled",
                message=f"Your booking #{booking.booking_number} at {prop_name} has been cancelled.",
                type="BOOKING_CANCELLED",
                link="/my-bookings",
                booking_id=booking.id
            )

            # 2. Customer Notification: Refund Completed
            NotificationService.create_notification(
                db=db,
                user_id=user_id,
                title="Refund Processed",
                message=f"Your refund of ₹{refund_amount:,.2f} ({int(refund_percentage)}%) has been processed with Reference #{refund_record.refund_reference}.",
                type="REFUND_COMPLETED",
                link="/my-bookings",
                booking_id=booking.id
            )

            # 3. Host Notification: Booking Cancelled & Units Released
            if booking.property:
                provider_profile = db.query(ProviderProfile).filter(ProviderProfile.id == booking.property.provider_id).first()
                host_user_id = provider_profile.user_id if provider_profile else booking.property.provider_id
                NotificationService.create_notification(
                    db=db,
                    user_id=host_user_id,
                    title="Booking Cancelled",
                    message=f"Booking #{booking.booking_number} at {prop_name} was cancelled by the guest. {room_qty} room unit(s) have been restored to your available inventory.",
                    type="BOOKING_CANCELLED",
                    link="/provider/bookings",
                    booking_id=booking.id
                )
        except Exception as e:
            print("Error dispatching cancellation notifications:", e)

        db.commit()
        db.refresh(booking)
        return booking

    @staticmethod
    def check_in_booking(db: Session, booking_id: int, provider_id: int) -> Booking:
        """
        Transitions booking from CONFIRMED -> CHECKED_IN.
        Enforces provider ownership and validates state.
        """
        booking = db.query(Booking).join(Property).filter(
            Booking.id == booking_id,
            Property.provider_id == provider_id
        ).with_for_update().first()

        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found or you do not have permission to manage this booking."
            )

        if booking.status != BookingStatus.CONFIRMED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Only CONFIRMED bookings can be checked in. Current status: {booking.status.value}"
            )

        booking.status = BookingStatus.CHECKED_IN
        booking.checked_in_at = datetime.utcnow()
        db.flush()

        # Dispatch Customer Notification
        try:
            from app.services.notifications.notification_service import NotificationService
            prop_name = booking.property.name if booking.property else "your stay"
            NotificationService.create_notification(
                db=db,
                user_id=booking.user_id,
                title="Guest Checked In",
                message=f"You have been checked in at {prop_name}. Enjoy your stay!",
                type="GUEST_CHECKED_IN",
                link="/my-bookings",
                booking_id=booking.id
            )
        except Exception as e:
            print("Error dispatching check-in notification:", e)

        db.commit()
        db.refresh(booking)
        return booking

    @staticmethod
    def check_out_booking(db: Session, booking_id: int, provider_id: int) -> Booking:
        """
        Transitions booking from CHECKED_IN -> COMPLETED.
        Releases room units for future dates and marks stay eligible for review.
        """
        booking = db.query(Booking).join(Property).filter(
            Booking.id == booking_id,
            Property.provider_id == provider_id
        ).with_for_update().first()

        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found or you do not have permission to manage this booking."
            )

        if booking.status != BookingStatus.CHECKED_IN:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Only CHECKED_IN bookings can be checked out. Current status: {booking.status.value}"
            )

        booking.status = BookingStatus.COMPLETED
        booking.checked_out_at = datetime.utcnow()
        booking.completed_at = datetime.utcnow()
        db.flush()

        # Dispatch Customer Notifications
        try:
            from app.services.notifications.notification_service import NotificationService
            prop_name = booking.property.name if booking.property else "your stay"
            
            # Notification 1: Stay Completed
            NotificationService.create_notification(
                db=db,
                user_id=booking.user_id,
                title="Stay Completed",
                message=f"Your stay at {prop_name} is complete. We hope you had a wonderful journey!",
                type="GUEST_CHECKED_OUT",
                link="/my-bookings",
                booking_id=booking.id
            )

            # Notification 2: Review Eligible
            NotificationService.create_notification(
                db=db,
                user_id=booking.user_id,
                title="How was your stay?",
                message=f"Your stay at {prop_name} is complete. Share your verified experience with other travelers!",
                type="REVIEW_ELIGIBLE",
                link="/my-bookings",
                booking_id=booking.id
            )
        except Exception as e:
            print("Error dispatching check-out notifications:", e)

        db.commit()
        db.refresh(booking)
        return booking

    @staticmethod
    def get_booking_refund(db: Session, booking_id: int, user_id: Optional[int] = None) -> Refund:
        """Fetch the refund record for a cancelled booking."""
        query = db.query(Refund).join(Booking).filter(Refund.booking_id == booking_id)
        if user_id is not None:
            query = query.filter(Booking.user_id == user_id)
        
        refund = query.first()
        if not refund:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Refund record not found for this booking."
            )
        return refund

