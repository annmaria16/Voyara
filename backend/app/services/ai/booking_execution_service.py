import time
import logging
import hmac
import hashlib
from datetime import date, datetime, timezone
from typing import Dict, Any, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.config import settings
from app.models.user import User
from app.models.ai_booking import (
    AIBookingSession,
    AIBookingSessionStatus,
    AIBookingPreview,
    AIBookingPreviewStatus,
    AIBookingMessage,
    AIAgentResearchLog
)
from app.models.booking import Booking, BookingStatus, BookingRoom, BookingAdventure, BookingExperience
from app.models.property import Property, PropertyVerificationStatus
from app.models.room import Room
from app.models.adventure import Adventure, Experience
from app.models.payment import Payment, PaymentStatus
from app.schemas.booking import BookingCreate
from app.schemas.payment import PaymentOrderResponse, PaymentFailureRequest
from app.schemas.ai_booking import (
    AIBookingCreatePaymentOrderRequest,
    AIBookingVerifyPaymentRequest,
    AIBookingConfirmRequest,
    AIBookingConfirmResponse
)
from app.services.bookings.booking_service import BookingService
from app.services.ai.booking_agent_tools import BookingAgentToolsService
from app.services.verinova.agent_booking_verification import AgentBookingVerificationService
from app.services.verinova.verification_service import VeriNovaService
from app.services.payment.razorpay_service import get_razorpay_client, generate_booking_number

logger = logging.getLogger("voyara.ai.booking_execution")

class BookingExecutionService:

    @classmethod
    def create_payment_order(
        cls,
        db: Session,
        traveler_id: int,
        request: AIBookingCreatePaymentOrderRequest
    ) -> PaymentOrderResponse:
        """
        Creates a server-side validated Razorpay Order for an AI booking preview.
        Locks inventory and authoritative price, generates a pending Booking and Payment record,
        and initializes Razorpay Checkout Order ID.
        """
        # 1. Retrieve & Validate Preview
        preview = db.query(AIBookingPreview).filter(
            AIBookingPreview.id == request.preview_id,
            AIBookingPreview.traveler_id == traveler_id
        ).first()

        if not preview:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking preview not found or access denied."
            )

        now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
        if preview.expires_at < now_utc:
            preview.status = AIBookingPreviewStatus.EXPIRED
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This booking preview has expired. Please ask Voyara AI to generate an updated reservation summary."
            )

        # 2. Live Revalidation against current system state
        revalidation_error = cls._revalidate_live_system_state(db, preview)
        if revalidation_error:
            preview.status = AIBookingPreviewStatus.INVALIDATED
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Booking conditions changed: {revalidation_error}. Please review updated stay details."
            )

        # 3. Fetch User, Property, and Room
        traveler = db.query(User).filter(User.id == traveler_id).first()
        prop = db.query(Property).filter(Property.id == preview.property_id).first()
        room = db.query(Room).filter(Room.id == preview.room_id).first()

        nights = (preview.check_out - preview.check_in).days
        if nights <= 0:
            nights = 1

        requested_qty = max(1, preview.room_quantity or 1)
        requested_guests = max(1, (preview.adults + preview.children) or 1)
        room_total = round(preview.room_nightly_price * nights * requested_qty, 2)
        adv_total = round(preview.adventure_total or 0.0, 2)
        total_amount = round(room_total + adv_total, 2)
        amount_paise = int(round(total_amount * 100))

        # 4. Generate unique booking number
        booking_number = generate_booking_number()
        while db.query(Booking).filter(Booking.booking_number == booking_number).first():
            booking_number = generate_booking_number()

        receipt_id = f"rcpt_{booking_number}_{int(time.time())}"

        # 5. Create Razorpay Order via SDK
        try:
            client = get_razorpay_client()
            razorpay_order = client.order.create({
                "amount": amount_paise,
                "currency": "INR",
                "receipt": receipt_id,
                "payment_capture": 1,
                "notes": {
                    "booking_number": booking_number,
                    "preview_id": preview.id,
                    "traveler_id": str(traveler_id),
                    "property_id": str(prop.id if prop else preview.property_id),
                    "property_name": prop.name if prop else "Stay",
                    "room_name": room.name if room else "Room",
                    "booking_source": "ai"
                }
            })
            order_id = razorpay_order["id"]
        except Exception as e:
            logger.error(f"Razorpay order initialization failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Razorpay payment gateway order initialization failed: {str(e)}"
            )

        # 6. Create Pending Booking
        booking = Booking(
            booking_number=booking_number,
            user_id=traveler_id,
            property_id=preview.property_id,
            check_in=preview.check_in,
            check_out=preview.check_out,
            total_nights=nights,
            total_guests=requested_guests,
            room_total=room_total,
            adventure_total=adv_total,
            total_amount=total_amount,
            status=BookingStatus.PENDING,
            booking_source="ai",
            customer_notes=request.customer_notes
        )
        db.add(booking)
        db.flush()

        # Add BookingRoom
        b_room = BookingRoom(
            booking_id=booking.id,
            room_id=preview.room_id,
            room_name=room.name if room else "Room",
            nightly_price=preview.room_nightly_price,
            nights=nights,
            quantity=requested_qty,
            guests=requested_guests,
            subtotal=room_total
        )
        db.add(b_room)

        # Add BookingAdventure if selected
        adv_id = getattr(preview, 'adventure_id', None) or getattr(preview, 'experience_id', None)
        if adv_id:
            adv_record = db.query(Adventure).filter(Adventure.id == adv_id).first()
            if adv_record:
                b_adv = BookingAdventure(
                    booking_id=booking.id,
                    adventure_id=adv_record.id,
                    adventure_title=adv_record.title,
                    price=adv_record.price,
                    pricing_model=adv_record.pricing_model,
                    participants=getattr(preview, 'adventure_participants', 1) or 1,
                    subtotal=adv_total,
                    scheduled_date=getattr(preview, 'adventure_date', None) or preview.check_in
                )
                db.add(b_adv)

        # 7. Create Payment tracking record
        payment = Payment(
            booking_id=booking.id,
            user_id=traveler_id,
            razorpay_order_id=order_id,
            amount=total_amount,
            currency="INR",
            status=PaymentStatus.CREATED,
            receipt=receipt_id
        )
        db.add(payment)

        # Update Session
        session = db.query(AIBookingSession).filter(AIBookingSession.id == preview.session_id).first()
        if session:
            session.booking_id = booking.id
            if request.idempotency_key:
                session.idempotency_key = request.idempotency_key
            session.status = AIBookingSessionStatus.AWAITING_CONFIRMATION

        db.commit()

        return PaymentOrderResponse(
            order_id=order_id,
            amount=total_amount,
            amount_paise=amount_paise,
            currency="INR",
            key_id=settings.RAZORPAY_KEY_ID,
            booking_id=booking.id,
            booking_number=booking.booking_number,
            property_name=prop.name if prop else "Stay",
            room_name=room.name if room else "Room",
            nights=nights,
            customer_name=traveler.name if traveler else None,
            customer_email=traveler.email if traveler else None,
            customer_phone=traveler.phone if traveler else None
        )

    @classmethod
    def verify_and_confirm_payment(
        cls,
        db: Session,
        traveler_id: int,
        request: AIBookingVerifyPaymentRequest
    ) -> AIBookingConfirmResponse:
        """
        Verifies the cryptographic HMAC-SHA256 signature returned by Razorpay Checkout.
        Only upon valid signature verification, marks payment as PAID, updates booking status to CONFIRMED,
        updates AI session, and triggers VeriNova verification.
        """
        exec_start_time = time.time()

        # 1. Fetch booking and payment record
        booking = db.query(Booking).filter(
            Booking.id == request.booking_id,
            Booking.user_id == traveler_id
        ).first()

        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking reservation not found."
            )

        payment = db.query(Payment).filter(
            Payment.booking_id == booking.id,
            Payment.razorpay_order_id == request.razorpay_order_id
        ).first()

        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment record not found for this order."
            )

        preview = db.query(AIBookingPreview).filter(
            AIBookingPreview.id == request.preview_id,
            AIBookingPreview.traveler_id == traveler_id
        ).first()

        # If already paid and verified
        if payment.status == PaymentStatus.PAID and booking.status in [BookingStatus.CONFIRMED, BookingStatus.VERIFIED]:
            ver_report = AgentBookingVerificationService.verify_booking_outcome(
                db=db,
                booking_id=booking.id,
                expected_preview=preview,
                traveler_id=traveler_id
            )
            return AIBookingConfirmResponse(
                success=ver_report.status == "VERIFIED",
                status=ver_report.status,
                message=cls._format_final_verified_message(booking, ver_report),
                booking=cls._serialize_booking_summary(booking),
                verification=ver_report.model_dump()
            )

        # 2. Cryptographic HMAC SHA256 Signature Verification
        msg_payload = f"{request.razorpay_order_id}|{request.razorpay_payment_id}"
        generated_signature = hmac.new(
            key=settings.RAZORPAY_KEY_SECRET.encode("utf-8"),
            msg=msg_payload.encode("utf-8"),
            digestmod=hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(generated_signature, request.razorpay_signature):
            payment.status = PaymentStatus.FAILED
            payment.error_code = "SIGNATURE_VERIFICATION_FAILED"
            payment.error_description = "Cryptographic signature mismatch."
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Razorpay payment signature. Payment verification failed."
            )

        # 3. Determine Payment Method
        payment_method = request.payment_method or "razorpay"
        try:
            client = get_razorpay_client()
            rp_payment = client.payment.fetch(request.razorpay_payment_id)
            if rp_payment and "method" in rp_payment:
                payment_method = rp_payment["method"]
        except Exception:
            pass

        # 4. Mark Payment PAID and Booking CONFIRMED
        payment.razorpay_payment_id = request.razorpay_payment_id
        payment.razorpay_signature = request.razorpay_signature
        payment.payment_method = payment_method
        payment.status = PaymentStatus.PAID
        payment.updated_at = datetime.utcnow()

        booking.status = BookingStatus.CONFIRMED
        if preview:
            preview.status = AIBookingPreviewStatus.CONFIRMED

        session = None
        if preview:
            session = db.query(AIBookingSession).filter(AIBookingSession.id == preview.session_id).first()
        elif booking.user_id:
            session = db.query(AIBookingSession).filter(
                AIBookingSession.booking_id == booking.id,
                AIBookingSession.traveler_id == traveler_id
            ).first()

        if session:
            session.booking_id = booking.id
            session.status = AIBookingSessionStatus.COMPLETED

        db.flush()

        # 5. Run VeriNova Transaction Verification
        VeriNovaService.verify_booking_transaction(db, booking)
        db.commit()
        db.refresh(booking)

        # 6. Run Independent VeriNova Outcome Verification
        ver_start_time = time.time()
        ver_report = AgentBookingVerificationService.verify_booking_outcome(
            db=db,
            booking_id=booking.id,
            expected_preview=preview,
            traveler_id=traveler_id
        )
        ver_latency_ms = int((time.time() - ver_start_time) * 1000)
        exec_latency_ms = int((time.time() - exec_start_time) * 1000)

        final_message = cls._format_final_verified_message(booking, ver_report)

        # 7. Record Research Audit Log
        try:
            res_log = AIAgentResearchLog(
                session_id=session.id if session else None,
                traveler_id=traveler_id,
                task_type="AUTONOMOUS_BOOKING_PAYMENT_VERIFIED",
                user_prompt=f"Verified payment for preview {request.preview_id}",
                tool_calls_json=[{
                    "tool": "verify_payment",
                    "preview_id": request.preview_id,
                    "booking_id": booking.id,
                    "razorpay_order_id": request.razorpay_order_id,
                    "razorpay_payment_id": request.razorpay_payment_id
                }],
                booking_id=booking.id,
                agent_claimed_outcome="SUCCESS",
                actual_outcome="SUCCESS" if ver_report.status == "VERIFIED" else ("MISMATCH" if ver_report.status == "MISMATCH" else "FAILED"),
                verification_outcome=ver_report.status,
                verification_failures=ver_report.failure_reasons,
                execution_latency_ms=exec_latency_ms,
                verification_latency_ms=ver_latency_ms,
                is_simulation=False
            )
            db.add(res_log)
            db.commit()
        except Exception as log_err:
            logger.warning(f"Could not save research audit log: {log_err}")

        return AIBookingConfirmResponse(
            success=ver_report.status == "VERIFIED",
            status=ver_report.status,
            message=final_message,
            booking=cls._serialize_booking_summary(booking),
            verification=ver_report.model_dump()
        )

    @classmethod
    def record_payment_failure(
        cls,
        db: Session,
        traveler_id: int,
        request: PaymentFailureRequest
    ) -> Dict[str, Any]:
        """
        Records a Razorpay checkout dismissal/failure.
        Marks payment record as FAILED and ensures booking is NOT confirmed.
        """
        payment = db.query(Payment).filter(
            Payment.booking_id == request.booking_id,
            Payment.razorpay_order_id == request.razorpay_order_id,
            Payment.user_id == traveler_id
        ).first()

        if payment:
            payment.status = PaymentStatus.FAILED
            payment.error_code = request.error_code or "PAYMENT_FAILED"
            payment.error_description = request.error_description or "Payment was dismissed or failed."
            payment.updated_at = datetime.utcnow()

            booking = db.query(Booking).filter(Booking.id == request.booking_id).first()
            if booking and booking.status == BookingStatus.PENDING:
                booking.status = BookingStatus.FAILED

            db.commit()
            return {"success": True, "message": "Payment failure recorded."}

        return {"success": False, "message": "Payment record not found."}

    @classmethod
    def confirm_and_execute_booking(
        cls,
        db: Session,
        traveler_id: int,
        request: AIBookingConfirmRequest
    ) -> AIBookingConfirmResponse:
        """
        Authoritatively revalidates a booking preview, enforces idempotency,
        executes the booking transaction with PostgreSQL row-level locks,
        and triggers independent VeriNova outcome verification.
        """
        # If payment verification details are provided, verify payment directly
        if request.razorpay_order_id and request.razorpay_payment_id and request.razorpay_signature:
            payment_record = db.query(Payment).filter(
                Payment.razorpay_order_id == request.razorpay_order_id
            ).first()
            if payment_record:
                return cls.verify_and_confirm_payment(
                    db=db,
                    traveler_id=traveler_id,
                    request=AIBookingVerifyPaymentRequest(
                        preview_id=request.preview_id,
                        booking_id=payment_record.booking_id,
                        razorpay_order_id=request.razorpay_order_id,
                        razorpay_payment_id=request.razorpay_payment_id,
                        razorpay_signature=request.razorpay_signature,
                        payment_method=request.payment_method,
                        idempotency_key=request.idempotency_key
                    )
                )

        exec_start_time = time.time()

        # 1. Idempotency Check
        if request.idempotency_key:
            existing_session = db.query(AIBookingSession).filter(
                AIBookingSession.idempotency_key == request.idempotency_key,
                AIBookingSession.traveler_id == traveler_id
            ).first()

            if existing_session and existing_session.booking_id:
                existing_booking = db.query(Booking).filter(Booking.id == existing_session.booking_id).first()
                if existing_booking:
                    # Run VeriNova check to ensure current DB state
                    ver_report = AgentBookingVerificationService.verify_booking_outcome(
                        db=db,
                        booking_id=existing_booking.id,
                        expected_preview=None,
                        traveler_id=traveler_id
                    )
                    return AIBookingConfirmResponse(
                        success=True,
                        status="VERIFIED" if ver_report.status == "VERIFIED" else ver_report.status,
                        message="Booking was previously confirmed and independently verified.",
                        booking=cls._serialize_booking_summary(existing_booking),
                        verification=ver_report.model_dump()
                    )

        # 2. Retrieve & Validate Preview
        preview = db.query(AIBookingPreview).filter(
            AIBookingPreview.id == request.preview_id,
            AIBookingPreview.traveler_id == traveler_id
        ).first()

        if not preview:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking preview not found or access denied."
            )

        now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
        if preview.expires_at < now_utc:
            preview.status = AIBookingPreviewStatus.EXPIRED
            db.commit()
            return AIBookingConfirmResponse(
                success=False,
                status="BOOKING_REVALIDATION_REQUIRED",
                message="This booking preview has expired. Please ask Voyara AI to generate an updated reservation summary.",
                revalidation_error="PREVIEW_EXPIRED"
            )

        if preview.status == AIBookingPreviewStatus.CONFIRMED:
            # Already confirmed preview
            session = db.query(AIBookingSession).filter(AIBookingSession.id == preview.session_id).first()
            if session and session.booking_id:
                b = db.query(Booking).filter(Booking.id == session.booking_id).first()
                if b:
                    ver_report = AgentBookingVerificationService.verify_booking_outcome(
                        db=db,
                        booking_id=b.id,
                        expected_preview=preview,
                        traveler_id=traveler_id
                    )
                    return AIBookingConfirmResponse(
                        success=True,
                        status=ver_report.status,
                        message="Your booking is confirmed and verified.",
                        booking=cls._serialize_booking_summary(b),
                        verification=ver_report.model_dump()
                    )

        # 3. Authoritative Live Revalidation against current PostgreSQL state
        revalidation_error = cls._revalidate_live_system_state(db, preview)
        if revalidation_error:
            preview.status = AIBookingPreviewStatus.INVALIDATED
            db.commit()
            return AIBookingConfirmResponse(
                success=False,
                status="BOOKING_REVALIDATION_REQUIRED",
                message=f"Booking conditions changed: {revalidation_error}. Please review updated stay details.",
                revalidation_error=revalidation_error
            )

        # 4. Prepare Booking Creation Payload
        booking_data = BookingCreate(
            property_id=preview.property_id,
            room_id=preview.room_id,
            check_in=preview.check_in,
            check_out=preview.check_out,
            total_guests=preview.adults + preview.children,
            adults=preview.adults,
            children=preview.children,
            child_ages=preview.child_ages or [],
            cot_count=preview.cot_count,
            extra_bed_count=preview.extra_bed_count,
            room_quantity=preview.room_quantity,
            adventure_id=getattr(preview, 'adventure_id', None) or getattr(preview, 'experience_id', None),
            adventure_participants=getattr(preview, 'adventure_participants', 0) or getattr(preview, 'experience_participants', 0),
            adventure_date=getattr(preview, 'adventure_date', None) or getattr(preview, 'experience_date', None),
            rules_accepted=True,
            booking_source="ai",
            customer_notes=request.customer_notes
        )

        session = db.query(AIBookingSession).filter(AIBookingSession.id == preview.session_id).first()
        if session and request.idempotency_key:
            session.idempotency_key = request.idempotency_key

        # 5. Execute Booking via Existing Booking Service in Database Transaction
        try:
            created_booking = BookingService.create_booking(
                db=db,
                user_id=traveler_id,
                data=booking_data
            )
            preview.status = AIBookingPreviewStatus.CONFIRMED
            if session:
                session.booking_id = created_booking.id
                session.status = AIBookingSessionStatus.COMPLETED
            db.commit()
            db.refresh(created_booking)

        except Exception as e:
            db.rollback()
            logger.error(f"Booking creation transaction failure: {e}")
            if session:
                session.status = AIBookingSessionStatus.FAILED
                db.commit()
            return AIBookingConfirmResponse(
                success=False,
                status="FAILED",
                message=f"The booking could not be completed: {str(e)}",
                revalidation_error=str(e)
            )

        exec_latency_ms = int((time.time() - exec_start_time) * 1000)

        # 6. Run Independent VeriNova Outcome Verification
        ver_start_time = time.time()
        ver_report = AgentBookingVerificationService.verify_booking_outcome(
            db=db,
            booking_id=created_booking.id,
            expected_preview=preview,
            traveler_id=traveler_id
        )
        ver_latency_ms = int((time.time() - ver_start_time) * 1000)

        # 7. Determine Final AI Statement strictly based on VeriNova
        final_message = cls._format_final_verified_message(created_booking, ver_report)

        # 8. Record Research Audit Log
        try:
            res_log = AIAgentResearchLog(
                session_id=session.id if session else None,
                traveler_id=traveler_id,
                task_type="AUTONOMOUS_BOOKING_EXECUTION",
                user_prompt=f"Confirm preview {preview.id}",
                tool_calls_json=[{
                    "tool": "create_booking",
                    "preview_id": preview.id,
                    "booking_id": created_booking.id
                }],
                booking_id=created_booking.id,
                agent_claimed_outcome="SUCCESS",
                actual_outcome="SUCCESS" if ver_report.status == "VERIFIED" else ("MISMATCH" if ver_report.status == "MISMATCH" else "FAILED"),
                verification_outcome=ver_report.status,
                verification_failures=ver_report.failure_reasons,
                execution_latency_ms=exec_latency_ms,
                verification_latency_ms=ver_latency_ms,
                is_simulation=False
            )
            db.add(res_log)
            db.commit()
        except Exception as log_err:
            logger.warning(f"Could not save research audit log: {log_err}")

        return AIBookingConfirmResponse(
            success=ver_report.status == "VERIFIED",
            status=ver_report.status,
            message=final_message,
            booking=cls._serialize_booking_summary(created_booking),
            verification=ver_report.model_dump()
        )

    @classmethod
    def _revalidate_live_system_state(cls, db: Session, preview: AIBookingPreview) -> Optional[str]:
        """
        Revalidates live availability, pricing, capacity, and status before booking transaction using VeriNova.
        """
        from app.services.verinova.verinova_verification_service import VeriNovaVerificationService
        from app.models.property import Property
        
        prop = preview.property or db.query(Property).filter(Property.id == preview.property_id).first()
        destination = prop.city if prop else "Destination"

        pre_report = VeriNovaVerificationService.verify_pre_booking(
            db=db,
            requirements={
                "destination": destination,
                "check_in": preview.check_in.isoformat(),
                "check_out": preview.check_out.isoformat(),
                "adults": preview.adults,
                "children": preview.children,
                "child_ages": preview.child_ages or [],
                "room_quantity": preview.room_quantity
            },
            property_id=preview.property_id,
            room_id=preview.room_id,
            check_in=preview.check_in,
            check_out=preview.check_out,
            adults=preview.adults,
            children=preview.children,
            child_ages=preview.child_ages or [],
            room_quantity=preview.room_quantity,
            adventure_id=getattr(preview, 'adventure_id', None) or getattr(preview, 'experience_id', None),
            adventure_participants=getattr(preview, 'adventure_participants', 0) or getattr(preview, 'experience_participants', 0),
            ai_quoted_price=preview.total_price,
            ai_quoted_nights=preview.total_nights,
            session_id=preview.session_id,
            traveler_id=preview.traveler_id
        )

        if pre_report.status == "FAILED":
            return pre_report.failure_reasons or "VeriNova pre-booking verification detected an inconsistency."

        return None

    @classmethod
    def _format_final_verified_message(cls, booking: Booking, ver_report: Any) -> str:
        """
        Constructs the final AI statement strictly conforming to VeriNova outcome rules (Section 25).
        """
        prop_name = booking.property.name if booking.property else "your property"
        b_num = booking.booking_number

        if ver_report.status == "VERIFIED":
            return f"Your booking ({b_num}) at **{prop_name}** is confirmed and verified by VeriNova."
        elif ver_report.status == "MISMATCH" or ver_report.status == "FALSE_SUCCESS_DETECTED":
            return f"The booking was not verified because the final booking details did not match your requested parameters ({ver_report.failure_reasons or 'Discrepancy detected'}). Please check your booking details."
        elif ver_report.status == "REQUIRES_REVIEW":
            return f"Your booking ({b_num}) requires administrative verification before it can be fully confirmed. Please wait while we check the booking status."
        else:
            return "The booking could not be completed successfully. Please try again or book directly."

    @classmethod
    def _serialize_booking_summary(cls, booking: Booking) -> Dict[str, Any]:
        rooms_data = []
        if getattr(booking, 'booking_rooms', None):
            for br in booking.booking_rooms:
                rooms_data.append({
                    "room_id": br.room_id,
                    "room_name": br.room_name,
                    "quantity": br.quantity,
                    "nightly_price": float(br.nightly_price),
                    "subtotal": float(br.subtotal)
                })
        return {
            "id": booking.id,
            "booking_number": booking.booking_number,
            "property_id": booking.property_id,
            "property_name": booking.property.name if booking.property else "",
            "rooms": rooms_data,
            "check_in": booking.check_in.isoformat() if booking.check_in else "",
            "check_out": booking.check_out.isoformat() if booking.check_out else "",
            "total_nights": booking.total_nights,
            "total_guests": booking.total_guests,
            "total_amount": booking.total_amount,
            "status": booking.status.value,
            "verinova_verification_id": booking.verinova_verification_id,
            "verinova_status": booking.verinova_status,
            "verinova_score": booking.verinova_score
        }
