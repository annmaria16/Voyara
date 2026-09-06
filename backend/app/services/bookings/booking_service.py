import random
import string
from datetime import datetime, date
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
from app.schemas.booking import BookingCreate
from app.services.verinova.verification_service import VeriNovaService

def generate_booking_number() -> str:
    random_digits = "".join(random.choices(string.digits, k=4))
    return f"VOY-{random_digits}"

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

        # Calculate live booked quantity for overlapping dates
        booked_qty = db.query(
            func.coalesce(func.sum(BookingRoom.quantity), 0)
        ).join(Booking).filter(
            BookingRoom.room_id == room.id,
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.VERIFIED]),
            Booking.check_in < data.check_out,
            Booking.check_out > data.check_in
        ).scalar() or 0

        available_qty = max(0, room.quantity - booked_qty)
        if requested_quantity > available_qty:
            if available_qty == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Sorry, this room is no longer available for the selected dates.",
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
                Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.VERIFIED])
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
            customer_notes=data.customer_notes
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
        db.commit()
        db.refresh(booking)

        return booking

    @staticmethod
    def get_customer_bookings(db: Session, user_id: int) -> List[Booking]:
        return db.query(Booking).filter(Booking.user_id == user_id).order_by(Booking.created_at.desc()).all()

    @staticmethod
    def get_provider_bookings(db: Session, provider_id: int) -> List[Booking]:
        return db.query(Booking).join(Property).filter(
            Property.provider_id == provider_id
        ).order_by(Booking.created_at.desc()).all()

    @staticmethod
    def get_all_bookings(db: Session) -> List[Booking]:
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
    def cancel_booking(db: Session, booking_id: int, user_id: Optional[int] = None) -> dict:
        booking = BookingService.get_booking_by_id(db, booking_id, user_id=user_id)
        if booking.status == BookingStatus.CANCELLED:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Booking is already cancelled.")
        
        booking.status = BookingStatus.CANCELLED
        db.commit()
        return {"message": f"Booking {booking.booking_number} cancelled successfully.", "success": True}
