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
from app.services.ai.stayguide_service import StayGuideService

def generate_booking_number() -> str:
    random_digits = "".join(random.choices(string.digits, k=4))
    return f"VOY-{random_digits}"

def generate_refund_reference() -> str:
    random_chars = "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
    return f"VN-REF-{random_chars}"

class BookingService:
    @staticmethod
    def create_booking(db: Session, user_id: int, data: BookingCreate) -> Booking:
        # 0. Rule Acceptance Check
        if not getattr(data, 'rules_accepted', False):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please read and agree to the property and room home rules before confirming your booking."
            )

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
        adults = max(1, getattr(data, 'adults', 1) or 1)
        children = max(0, getattr(data, 'children', 0) or 0)
        child_ages = getattr(data, 'child_ages', []) or []
        cot_count = max(0, getattr(data, 'cot_count', 0) or 0)
        extra_bed_count = max(0, getattr(data, 'extra_bed_count', 0) or 0)
        requested_guests = adults + children

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

        # Mandatory Property Rules Acceptance Validation
        if not getattr(data, 'rules_accepted', False):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You must accept and agree to the Property Home Rules before confirming your booking.",
            )

        # Validate Guest Capacity for the requested room count
        prop_rules = getattr(prop, 'home_rules', None)
        room_rules = getattr(room, 'rules', None)
        room_cap = (room_rules.maximum_total_guests if room_rules and room_rules.maximum_total_guests else room.capacity)
        max_allowed_guests = room_cap * requested_quantity

        if requested_guests > max_allowed_guests:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Total requested guests ({requested_guests}) exceeds maximum room capacity ({max_allowed_guests}).",
            )

        # Validate Adult Capacity
        if room_rules and room_rules.maximum_adults:
            if adults > room_rules.maximum_adults * requested_quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Selected adults ({adults}) exceeds maximum allowed adults ({room_rules.maximum_adults * requested_quantity}) for this room.",
                )

        # Validate Children Policy
        if children > 0:
            if (prop_rules and prop_rules.children_allowed == "No") or (room_rules and room_rules.children_allowed == "No"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Children are not permitted in this room or property.",
                )

            # Check max allowed children allowance (either room max_children or additional_children_allowed)
            max_child_limit = (
                room_rules.maximum_children if (room_rules and room_rules.maximum_children is not None)
                else (getattr(room_rules, 'additional_children_allowed', 0) if room_rules else 0)
            )
            if max_child_limit is not None and children > max_child_limit * requested_quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Selected children ({children}) exceeds maximum allowed children ({max_child_limit * requested_quantity}) for this room.",
                )

            # Minimum child age validation
            min_age = (room_rules.minimum_child_age if room_rules and room_rules.minimum_child_age is not None else (prop_rules.minimum_child_age if prop_rules and prop_rules.minimum_child_age is not None else None))
            if min_age is not None:
                for age in child_ages:
                    if age < min_age:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"This property cannot accommodate children under {min_age} years of age. Entered child age ({age}) does not meet this requirement.",
                        )

            # Maximum child age validation (Child Age Limit)
            max_age_limit = (
                getattr(room_rules, 'max_child_age', None) if room_rules and getattr(room_rules, 'max_child_age', None) is not None
                else (getattr(prop_rules, 'max_child_age', None) if prop_rules and getattr(prop_rules, 'max_child_age', None) is not None else None)
            )
            if max_age_limit is not None:
                for age in child_ages:
                    if age > max_age_limit:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"This room permits additional children up to {max_age_limit} years of age. Entered child age ({age}) exceeds this limit.",
                        )

        # Validate Baby Cots
        if cot_count > 0:
            cot_avail = getattr(room_rules, 'cot_available', None) if room_rules else (getattr(prop_rules, 'cot_available', None) if prop_rules else None)
            cot_pol = (room_rules.cot_policy if room_rules else (prop_rules.cot_policy if prop_rules else None))
            max_cots = (room_rules.cot_quantity if room_rules and room_rules.cot_quantity is not None else (prop_rules.cot_quantity if prop_rules and prop_rules.cot_quantity is not None else 0)) or 0
            
            is_cot_allowed = (
                str(cot_avail).lower() in ["yes", "true", "1"] or
                (cot_pol in ["Yes", "Upon Request"]) or
                (max_cots > 0 and cot_pol != "No")
            )
            if not is_cot_allowed or (cot_avail == "No" and cot_pol == "No" and max_cots == 0):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Baby cots are not available for this room.",
                )
            if max_cots > 0 and cot_count > max_cots * requested_quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Requested cots ({cot_count}) exceeds available units ({max_cots * requested_quantity}).",
                )

        # Validate Extra Beds
        if extra_bed_count > 0:
            extra_bed_avail = getattr(room_rules, 'extra_bed_available', None) if room_rules else (getattr(prop_rules, 'extra_bed_available', None) if prop_rules else None)
            extra_bed_pol = (room_rules.extra_bed_policy if room_rules else None)
            max_extra_beds = (room_rules.maximum_extra_beds if room_rules and room_rules.maximum_extra_beds is not None else 0) or 0
            
            is_extra_bed_allowed = (
                str(extra_bed_avail).lower() in ["yes", "true", "1"] or
                (extra_bed_pol in ["Yes", "Upon Request"]) or
                (max_extra_beds > 0 and extra_bed_pol != "No")
            )
            if not is_extra_bed_allowed or (extra_bed_avail == "No" and extra_bed_pol == "No" and max_extra_beds == 0):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Extra beds are not available for this room.",
                )
            if max_extra_beds > 0 and extra_bed_count > max_extra_beds * requested_quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Requested extra beds ({extra_bed_count}) exceed the maximum allowed ({max_extra_beds * requested_quantity}).",
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

        # Calculate Room Base Total Authoritatively on Backend
        room_nightly_price = room.base_price
        room_total = round(room_nightly_price * nights * requested_quantity, 2)

        # Calculate Authoritative Supplements: Extra Bed, Cot, Child Charge
        extra_bed_unit = getattr(room_rules, 'extra_bed_charge_unit', 'Per night') if room_rules else 'Per night'
        extra_bed_price = (room_rules.extra_bed_price if room_rules and room_rules.extra_bed_price is not None else 0.0) or 0.0
        extra_bed_total = round(extra_bed_price * (nights if extra_bed_unit == "Per night" else 1) * extra_bed_count, 2)

        cot_unit = (getattr(room_rules, 'cot_charge_unit', None) if room_rules else None) or (getattr(prop_rules, 'cot_charge_unit', None) if prop_rules else 'Free') or 'Free'
        cot_price = (room_rules.cot_price if room_rules and hasattr(room_rules, 'cot_price') and room_rules.cot_price is not None else (getattr(prop_rules, 'cot_price', 0.0) if prop_rules else 0.0)) or 0.0
        cot_total = round(cot_price * (nights if cot_unit == "Per night" else 1) * cot_count, 2) if cot_unit != "Free" else 0.0

        child_charge_enabled = (getattr(room_rules, 'child_charge_enabled', False) if room_rules else False) or (getattr(prop_rules, 'child_charge_enabled', False) if prop_rules else False)
        child_charge_amt = (
            getattr(room_rules, 'child_charge_amount', 0.0) if (room_rules and getattr(room_rules, 'child_charge_amount', None) is not None)
            else (getattr(prop_rules, 'child_charge_amount', 0.0) if (prop_rules and getattr(prop_rules, 'child_charge_amount', None) is not None) else 0.0)
        ) or 0.0
        child_charge_unit = (getattr(room_rules, 'child_charge_unit', None) if room_rules else None) or (getattr(prop_rules, 'child_charge_unit', None) if prop_rules else 'Per night') or 'Per night'
        free_children_allowance = (
            getattr(room_rules, 'free_additional_children', 0) if (room_rules and getattr(room_rules, 'free_additional_children', None) is not None)
            else (getattr(prop_rules, 'free_additional_children', 0) if (prop_rules and getattr(prop_rules, 'free_additional_children', None) is not None) else 0)
        ) or 0

        chargeable_children = max(0, children - (free_children_allowance * requested_quantity)) if child_charge_enabled else 0
        child_supplement_total = round(child_charge_amt * (nights if child_charge_unit == "Per night" else 1) * chargeable_children, 2) if (child_charge_enabled and child_charge_amt > 0) else 0.0

        supplements_total = round(extra_bed_total + cot_total + child_supplement_total, 2)

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
        total_amount = round(room_total + experience_total + supplements_total, 2)

        # Generate unique booking number
        booking_number = generate_booking_number()
        while db.query(Booking).filter(Booking.booking_number == booking_number).first():
            booking_number = generate_booking_number()

        # Cancellation Policy Snapshot
        host_refund_pct = float(getattr(prop, 'cancellation_refund_percentage', 50) or 50)
        policy_snapshot = f"100% refund up to 2 days before check-in. {int(host_refund_pct)}% refund within 2 days of check-in. Cancellation permitted until 6:00 AM on check-in date."

        # Create Booking with complete authoritative financial snapshot
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
            original_total_amount=total_amount,
            commission_percentage_snapshot=10.0,
            cancellation_refund_percentage_snapshot=host_refund_pct,
            refund_amount=0.0,
            retained_amount=0.0,
            commission_amount=0.0,
            provider_settlement_amount=0.0,
            commission_status="NOT_FINALIZED",
            refund_status="NOT_APPLICABLE",
            payout_status="NOT_READY",
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

        # Create Historical Booking Rule Snapshot
        StayGuideService.create_booking_rule_snapshot(
            db=db,
            booking_id=booking.id,
            prop=prop,
            room=room,
            adults=adults,
            children=children,
            child_ages=child_ages,
            cot_count=cot_count,
            extra_bed_count=extra_bed_count,
            accepted_by_customer=True
        )

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
                link="/customer/bookings",
                booking_id=booking.id
            )

            if booking.guest_information_message_snapshot:
                NotificationService.create_notification(
                    db=db,
                    user_id=user_id,
                    title="Important information from your host",
                    message=f"Your host has shared important safety, property and check-in information for your stay at {prop.name}.",
                    type="HOST_MESSAGE",
                    link="/customer/bookings",
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
    def enrich_booking(b: Booking) -> Booking:
        try:
            from zoneinfo import ZoneInfo
            tz = ZoneInfo("Asia/Kolkata")
        except Exception:
            tz = timezone(timedelta(hours=5, minutes=30))
        now = datetime.now(tz)
        deadline_dt = datetime.combine(b.check_in, time(6, 0, 0), tzinfo=tz)
        b.cancellation_deadline_str = deadline_dt.strftime('%d %b %Y at 06:00 AM IST')
        if b.status in [BookingStatus.CONFIRMED, BookingStatus.VERIFIED, BookingStatus.PENDING]:
            b.is_cancellable = bool(now < deadline_dt)
        else:
            b.is_cancellable = False
        return b

    @staticmethod
    def get_customer_bookings(db: Session, user_id: int) -> List[Booking]:
        BookingService.auto_complete_past_bookings(db)
        bookings = db.query(Booking).filter(Booking.user_id == user_id).order_by(Booking.created_at.desc()).all()
        return [BookingService.enrich_booking(b) for b in bookings]

    @staticmethod
    def get_provider_bookings(db: Session, provider_id: int) -> List[Booking]:
        BookingService.auto_complete_past_bookings(db)
        bookings = db.query(Booking).join(Property).filter(
            Property.provider_id == provider_id
        ).order_by(Booking.created_at.desc()).all()
        return [BookingService.enrich_booking(b) for b in bookings]

    @staticmethod
    def get_all_bookings(db: Session) -> List[Booking]:
        BookingService.auto_complete_past_bookings(db)
        bookings = db.query(Booking).order_by(Booking.created_at.desc()).all()
        return [BookingService.enrich_booking(b) for b in bookings]

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
        return BookingService.enrich_booking(booking)

    @staticmethod
    def calculate_cancellation_refund(booking: Booking, check_datetime: Optional[datetime] = None) -> dict:
        """
        Calculates refund amount, refund percentage, retained amount, Voyara commission, and Stay Partner settlement.
        Strict Rules:
          - Cancellation allowed ONLY BEFORE 6:00:00 AM on the check-in date in Asia/Kolkata timezone.
          - >= 2 days before check-in date: 100% refund, 0 retained, 0 commission, 0 provider settlement.
          - Within final 2 days (until 6:00 AM check-in day): property's snapshot refund %.
            Retained amount = Original amount - Refund.
            Voyara commission = 10% of retained amount.
            Stay Partner settlement = 90% of retained amount (retained - commission).
        """
        try:
            from zoneinfo import ZoneInfo
            tz = ZoneInfo("Asia/Kolkata")
        except Exception:
            tz = timezone(timedelta(hours=5, minutes=30))

        now = check_datetime or datetime.now(tz)
        if now.tzinfo is None:
            now = now.replace(tzinfo=tz)

        check_in_date = booking.check_in
        # Strict cancellation cutoff: 6:00:00 AM on check-in date (Asia/Kolkata)
        cancellation_deadline_dt = datetime.combine(check_in_date, time(6, 0, 0), tzinfo=tz)
        cancellation_deadline_str = cancellation_deadline_dt.strftime('%d %b %Y at 06:00 AM IST')

        # Free cancellation threshold: 2 calendar days before check-in date
        free_cancellation_deadline_dt = datetime.combine(check_in_date - timedelta(days=2), time(23, 59, 59), tzinfo=tz)
        free_cancellation_deadline_str = (check_in_date - timedelta(days=2)).strftime('%d %B %Y (End of day)')

        original_amount = getattr(booking, 'original_total_amount', None) or booking.total_amount
        snap_host_pct = getattr(booking, 'cancellation_refund_percentage_snapshot', None)
        if snap_host_pct is None:
            snap_host_pct = getattr(booking, 'refund_percentage_snapshot', None)
        if snap_host_pct is None:
            snap_host_pct = float(getattr(booking.property, 'cancellation_refund_percentage', 50) or 50)
        snap_host_pct = float(snap_host_pct)

        comm_pct = getattr(booking, 'commission_percentage_snapshot', 10.0) or 10.0

        # Check deadline compliance
        if now >= cancellation_deadline_dt:
            can_cancel = False
            reason = "Cancellation is no longer available because the cancellation deadline has passed."
            is_free_cancellation = False
            refund_percentage = 0.0
            refund_amount = 0.0
            retained_amount = original_amount
            cancellation_fee = original_amount
            commission_amount = 0.0
            provider_settlement_amount = 0.0
        else:
            can_cancel = True
            reason = None
            if now <= free_cancellation_deadline_dt:
                # Early cancellation: 100% refund
                is_free_cancellation = True
                refund_percentage = 100.0
                refund_amount = round(original_amount, 2)
                retained_amount = 0.0
                cancellation_fee = 0.0
                commission_amount = 0.0
                provider_settlement_amount = 0.0
            else:
                # Late cancellation within final 2 days but before 6:00 AM check-in day
                is_free_cancellation = False
                refund_percentage = snap_host_pct
                refund_amount = round(original_amount * (refund_percentage / 100.0), 2)
                retained_amount = round(original_amount - refund_amount, 2)
                cancellation_fee = retained_amount
                commission_amount = round(retained_amount * (comm_pct / 100.0), 2)
                provider_settlement_amount = round(retained_amount - commission_amount, 2)

        policy_desc = (
            f"Full refund up to 2 days before check-in ({free_cancellation_deadline_str}). "
            f"Within the final 2 days, {int(snap_host_pct)}% of the booking amount is refundable. "
            f"Cancellation is not permitted after 6:00 AM on the check-in date ({cancellation_deadline_str})."
        )

        return {
            "cancellation_deadline_dt": cancellation_deadline_dt,
            "cancellation_deadline_str": cancellation_deadline_str,
            "free_cancellation_deadline": free_cancellation_deadline_str,
            "is_free_cancellation": is_free_cancellation,
            "original_total_amount": original_amount,
            "booking_amount": original_amount,
            "refund_percentage": refund_percentage,
            "refund_amount": refund_amount,
            "retained_amount": retained_amount,
            "cancellation_fee": cancellation_fee,
            "commission_percentage": comm_pct,
            "commission_amount": commission_amount,
            "provider_settlement_amount": provider_settlement_amount,
            "policy_description": policy_desc,
            "can_cancel": can_cancel,
            "reason": reason
        }

    @staticmethod
    def get_cancellation_preview(db: Session, booking_id: int, user_id: int) -> dict:
        """Fetch server-side cancellation & refund preview for a customer booking."""
        booking = BookingService.get_booking_by_id(db, booking_id, user_id=user_id)

        if booking.status in [BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT, BookingStatus.COMPLETED]:
            return {
                "booking_id": booking.id,
                "booking_number": booking.booking_number,
                "property_id": booking.property_id,
                "property_name": booking.property.name if booking.property else "Sanctuary",
                "check_in": booking.check_in,
                "check_in_time": booking.property.check_in_time if booking.property else "14:00",
                "booking_amount": booking.original_total_amount or booking.total_amount,
                "original_total_amount": booking.original_total_amount or booking.total_amount,
                "free_cancellation_deadline": "N/A",
                "cancellation_deadline_str": "Passed",
                "is_free_cancellation": False,
                "refund_percentage": 0.0,
                "refund_amount": 0.0,
                "cancellation_fee": 0.0,
                "retained_amount": 0.0,
                "commission_percentage": 10.0,
                "commission_amount": 0.0,
                "provider_settlement_amount": 0.0,
                "policy_description": "Stays that are currently checked-in or completed cannot be cancelled.",
                "can_cancel": False,
                "reason": "Stays that are currently checked-in or completed cannot be cancelled."
            }

        if booking.status == BookingStatus.CANCELLED:
            return {
                "booking_id": booking.id,
                "booking_number": booking.booking_number,
                "property_id": booking.property_id,
                "property_name": booking.property.name if booking.property else "Sanctuary",
                "check_in": booking.check_in,
                "check_in_time": booking.property.check_in_time if booking.property else "14:00",
                "booking_amount": booking.original_total_amount or booking.total_amount,
                "original_total_amount": booking.original_total_amount or booking.total_amount,
                "free_cancellation_deadline": "N/A",
                "cancellation_deadline_str": "N/A",
                "is_free_cancellation": False,
                "refund_percentage": booking.refund_amount / (booking.original_total_amount or booking.total_amount) * 100 if (booking.original_total_amount or booking.total_amount) > 0 else 0,
                "refund_amount": booking.refund_amount,
                "cancellation_fee": booking.retained_amount,
                "retained_amount": booking.retained_amount,
                "commission_percentage": 10.0,
                "commission_amount": booking.commission_amount,
                "provider_settlement_amount": booking.provider_settlement_amount,
                "policy_description": "This booking has already been cancelled.",
                "can_cancel": False,
                "reason": "This reservation has already been cancelled."
            }

        calc = BookingService.calculate_cancellation_refund(booking)

        return {
            "booking_id": booking.id,
            "booking_number": booking.booking_number,
            "property_id": booking.property_id,
            "property_name": booking.property.name if booking.property else "Sanctuary",
            "check_in": booking.check_in,
            "check_in_time": booking.property.check_in_time if booking.property else "14:00",
            "booking_amount": calc["booking_amount"],
            "original_total_amount": calc["original_total_amount"],
            "free_cancellation_deadline": calc["free_cancellation_deadline"],
            "cancellation_deadline_str": calc["cancellation_deadline_str"],
            "is_free_cancellation": calc["is_free_cancellation"],
            "refund_percentage": calc["refund_percentage"],
            "refund_amount": calc["refund_amount"],
            "cancellation_fee": calc["cancellation_fee"],
            "retained_amount": calc["retained_amount"],
            "commission_percentage": calc["commission_percentage"],
            "commission_amount": calc["commission_amount"],
            "provider_settlement_amount": calc["provider_settlement_amount"],
            "policy_description": calc["policy_description"],
            "can_cancel": calc["can_cancel"],
            "reason": calc["reason"]
        }

    @staticmethod
    def cancel_booking(db: Session, booking_id: int, user_id: int, reason: Optional[str] = None) -> Booking:
        """
        Executes atomic booking cancellation with VeriNova verification,
        calculates refund, retained amount, Voyara commission, and Stay Partner settlement,
        releases room units, and dispatches notifications.
        """
        # Lock booking row for atomic update
        booking = db.query(Booking).filter(Booking.id == booking_id).with_for_update().first()

        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found."
            )

        if booking.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to cancel another customer's booking."
            )

        if booking.status == BookingStatus.CANCELLED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Booking is already cancelled. Duplicate cancellation is not permitted."
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

        # Calculate refund server-side and validate 6:00 AM check-in deadline
        calc = BookingService.calculate_cancellation_refund(booking)
        if not calc["can_cancel"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=calc["reason"] or "Cancellation is no longer available because the cancellation deadline has passed."
            )

        refund_amount = calc["refund_amount"]
        refund_percentage = calc["refund_percentage"]
        cancellation_fee = calc["cancellation_fee"]
        retained_amount = calc["retained_amount"]
        commission_amount = calc["commission_amount"]
        provider_settlement_amount = calc["provider_settlement_amount"]

        # Run VeriNova Cancellation Integrity Verification
        VeriNovaService.verify_cancellation_transaction(
            db=db,
            booking=booking,
            refund_amount=refund_amount,
            refund_percentage=refund_percentage,
            retained_amount=retained_amount,
            commission_amount=commission_amount,
            provider_settlement_amount=provider_settlement_amount,
            actor_id=user_id,
            actor_role="CUSTOMER"
        )

        # Update Booking Status & Financial Split
        booking.status = BookingStatus.CANCELLED
        booking.cancelled_at = datetime.utcnow()
        booking.cancellation_processed_at = datetime.utcnow()
        booking.cancellation_reason = (reason or "Traveler requested cancellation").strip()
        booking.refund_amount = refund_amount
        booking.retained_amount = retained_amount
        booking.commission_amount = commission_amount
        booking.provider_settlement_amount = provider_settlement_amount
        booking.commission_status = "FINALIZED" if retained_amount > 0 else "NOT_APPLICABLE"
        booking.refund_status = "REFUNDED"
        booking.payout_status = "READY" if provider_settlement_amount > 0 else "NOT_APPLICABLE"

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
                retained_amount=retained_amount,
                commission_amount=commission_amount,
                provider_settlement_amount=provider_settlement_amount,
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
            refund_record.retained_amount = retained_amount
            refund_record.commission_amount = commission_amount
            refund_record.provider_settlement_amount = provider_settlement_amount
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
                link="/customer/bookings",
                booking_id=booking.id
            )

            # 2. Customer Notification: Refund Completed
            NotificationService.create_notification(
                db=db,
                user_id=user_id,
                title="Refund Processed",
                message=f"Your internal refund of ₹{refund_amount:,.2f} ({int(refund_percentage)}%) has been processed with Reference #{refund_record.refund_reference}.",
                type="REFUND_COMPLETED",
                link="/customer/bookings",
                booking_id=booking.id
            )

            # 3. Host Notification: Booking Cancelled & Settlement Recorded
            if booking.property:
                provider_profile = db.query(ProviderProfile).filter(ProviderProfile.id == booking.property.provider_id).first()
                host_user_id = provider_profile.user_id if provider_profile else booking.property.provider_id
                settle_msg = f" ₹{provider_settlement_amount:,.2f} has been recorded as your settlement for this cancelled booking." if provider_settlement_amount > 0 else ""
                NotificationService.create_notification(
                    db=db,
                    user_id=host_user_id,
                    title="Booking Cancelled",
                    message=f"A Traveler cancelled booking #{booking.booking_number} at {prop_name}. {room_qty} room unit(s) have been restored to your available inventory.{settle_msg}",
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
        Enforces provider ownership, check-in date eligibility in Asia/Kolkata,
        and finalizes normal Voyara 10% commission & Stay Partner 90% settlement.
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

        today_date = date.today()
        try:
            from zoneinfo import ZoneInfo
            today_date = datetime.now(ZoneInfo("Asia/Kolkata")).date()
        except Exception:
            today_date = date.today()

        if today_date < booking.check_in:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Check-in is only permitted on or after the scheduled check-in date ({booking.check_in.strftime('%d %b %Y')})."
            )

        original_amount = getattr(booking, 'original_total_amount', None) or booking.total_amount
        comm_pct = getattr(booking, 'commission_percentage_snapshot', 10.0) or 10.0
        final_commission = round(original_amount * (comm_pct / 100.0), 2)
        provider_settlement = round(original_amount - final_commission, 2)

        booking.status = BookingStatus.CHECKED_IN
        booking.checked_in_at = datetime.utcnow()
        booking.commission_status = "FINALIZED"
        booking.commission_amount = final_commission
        booking.provider_settlement_amount = provider_settlement
        booking.payout_status = "READY"
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
                link="/customer/bookings",
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
                link="/customer/bookings",
                booking_id=booking.id
            )

            # Notification 2: Review Eligible
            NotificationService.create_notification(
                db=db,
                user_id=booking.user_id,
                title="How was your stay?",
                message=f"Your stay at {prop_name} is complete. Share your verified experience with other travelers!",
                type="REVIEW_ELIGIBLE",
                link="/customer/bookings",
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

