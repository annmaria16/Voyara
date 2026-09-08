import hmac
import hashlib
import random
import string
from datetime import datetime, date
from typing import Optional, Dict, Any
import razorpay
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.config import settings
from app.models.user import User
from app.models.booking import Booking, BookingStatus, BookingRoom, BookingExperience
from app.models.property import Property
from app.models.room import Room
from app.models.experience import Experience
from app.models.availability import PropertyAvailability, RoomAvailability
from app.models.payment import Payment, PaymentStatus
from app.schemas.payment import (
    PaymentOrderCreate,
    PaymentOrderResponse,
    PaymentVerifyRequest,
    PaymentFailureRequest
)
from app.services.verinova.verification_service import VeriNovaService

def generate_booking_number() -> str:
    random_digits = "".join(random.choices(string.digits, k=4))
    return f"VOY-{random_digits}"

def get_razorpay_client() -> razorpay.Client:
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

class RazorpayService:
    @staticmethod
    def create_payment_order(db: Session, user: User, data: PaymentOrderCreate) -> PaymentOrderResponse:
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

        requested_quantity = max(1, getattr(data, "room_quantity", 1) or 1)
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

        # 4. Validate Room with Row-Level Lock
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
                    detail="Sorry, this room is no longer available for the selected dates.",
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
                    detail=f"The selected experience has reached capacity (Requested: {exp_participants}, Remaining: {max(0, remaining_capacity)}).",
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

        # Convert to Paise for Razorpay (₹1 = 100 paise)
        amount_paise = int(round(total_amount * 100))
        receipt_id = f"rcpt_{booking_number}_{int(datetime.utcnow().timestamp())}"

        # Create Razorpay Order via SDK
        try:
            client = get_razorpay_client()
            razorpay_order = client.order.create({
                "amount": amount_paise,
                "currency": "INR",
                "receipt": receipt_id,
                "payment_capture": 1,
                "notes": {
                    "booking_number": booking_number,
                    "user_id": str(user.id),
                    "property_id": str(prop.id),
                    "property_name": prop.name,
                    "room_name": room.name,
                }
            })
            order_id = razorpay_order["id"]
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Razorpay order initialization failed: {str(e)}"
            )

        # Create Pending Booking record
        booking = Booking(
            booking_number=booking_number,
            user_id=user.id,
            property_id=prop.id,
            check_in=data.check_in,
            check_out=data.check_out,
            total_nights=nights,
            total_guests=requested_guests,
            room_total=room_total,
            experience_total=experience_total,
            total_amount=total_amount,
            status=BookingStatus.PENDING,
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

        # Create Payment tracking record
        payment = Payment(
            booking_id=booking.id,
            user_id=user.id,
            razorpay_order_id=order_id,
            amount=total_amount,
            currency="INR",
            status=PaymentStatus.CREATED,
            receipt=receipt_id
        )
        db.add(payment)
        db.commit()

        return PaymentOrderResponse(
            order_id=order_id,
            amount=total_amount,
            amount_paise=amount_paise,
            currency="INR",
            key_id=settings.RAZORPAY_KEY_ID,
            booking_id=booking.id,
            booking_number=booking.booking_number,
            property_name=prop.name,
            room_name=room.name,
            nights=nights,
            customer_name=user.name,
            customer_email=user.email,
            customer_phone=user.phone
        )

    @staticmethod
    def verify_payment(db: Session, user: User, data: PaymentVerifyRequest) -> Booking:
        # 1. Fetch booking and payment record
        booking = db.query(Booking).filter(
            Booking.id == data.booking_id,
            Booking.user_id == user.id
        ).first()

        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking reservation not found."
            )

        payment = db.query(Payment).filter(
            Payment.booking_id == booking.id,
            Payment.razorpay_order_id == data.razorpay_order_id
        ).first()

        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment record not found for this order."
            )

        if payment.status == PaymentStatus.PAID:
            # Already verified and confirmed
            return booking

        # 2. Cryptographic HMAC SHA256 Signature Verification
        msg_payload = f"{data.razorpay_order_id}|{data.razorpay_payment_id}"
        generated_signature = hmac.new(
            key=settings.RAZORPAY_KEY_SECRET.encode("utf-8"),
            msg=msg_payload.encode("utf-8"),
            digestmod=hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(generated_signature, data.razorpay_signature):
            payment.status = PaymentStatus.FAILED
            payment.error_code = "SIGNATURE_VERIFICATION_FAILED"
            payment.error_description = "Cryptographic signature mismatch."
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Razorpay payment signature. Payment verification failed."
            )

        # 3. Fetch payment details from Razorpay to get method
        payment_method = data.payment_method or "razorpay"
        try:
            client = get_razorpay_client()
            rp_payment = client.payment.fetch(data.razorpay_payment_id)
            if rp_payment and "method" in rp_payment:
                payment_method = rp_payment["method"]
        except Exception:
            pass

        # 4. Mark Payment as PAID and Booking as CONFIRMED
        payment.razorpay_payment_id = data.razorpay_payment_id
        payment.razorpay_signature = data.razorpay_signature
        payment.payment_method = payment_method
        payment.status = PaymentStatus.PAID
        payment.updated_at = datetime.utcnow()

        booking.status = BookingStatus.CONFIRMED
        db.flush()

        # 5. Run VeriNova Transaction Verification Layer
        VeriNovaService.verify_booking_transaction(db, booking)
        db.commit()
        db.refresh(booking)

        return booking

    @staticmethod
    def record_failure(db: Session, user: User, data: PaymentFailureRequest) -> Dict[str, Any]:
        payment = db.query(Payment).filter(
            Payment.booking_id == data.booking_id,
            Payment.razorpay_order_id == data.razorpay_order_id,
            Payment.user_id == user.id
        ).first()

        if payment:
            payment.status = PaymentStatus.FAILED
            payment.error_code = data.error_code or "PAYMENT_FAILED"
            payment.error_description = data.error_description or "Payment was dismissed or failed."
            payment.updated_at = datetime.utcnow()

            booking = db.query(Booking).filter(Booking.id == data.booking_id).first()
            if booking and booking.status == BookingStatus.PENDING:
                booking.status = BookingStatus.FAILED

            db.commit()
            return {"success": True, "message": "Payment failure recorded."}

        return {"success": False, "message": "Payment record not found."}

    @staticmethod
    def get_payment_details(db: Session, booking_id: int, user: User) -> Dict[str, Any]:
        booking = db.query(Booking).filter(
            Booking.id == booking_id,
            Booking.user_id == user.id
        ).first()

        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking reservation not found."
            )

        payment = db.query(Payment).filter(Payment.booking_id == booking.id).first()
        
        return {
            "booking_id": booking.id,
            "booking_number": booking.booking_number,
            "total_amount": booking.total_amount,
            "status": booking.status.value,
            "payment": {
                "id": payment.id if payment else None,
                "razorpay_order_id": payment.razorpay_order_id if payment else None,
                "razorpay_payment_id": payment.razorpay_payment_id if payment else None,
                "payment_method": payment.payment_method if payment else None,
                "status": payment.status.value if payment else "UNPAID",
                "receipt": payment.receipt if payment else None,
                "created_at": payment.created_at.isoformat() if payment else None
            } if payment else None
        }
