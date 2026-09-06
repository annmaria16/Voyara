import uuid
from datetime import datetime, date, timezone
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.booking import Booking, BookingStatus, BookingRoom, BookingExperience
from app.models.property import Property
from app.models.room import Room
from app.models.experience import Experience
from app.models.availability import PropertyAvailability, RoomAvailability
from app.models.user import User
from app.models.verification import VerificationResult, VerificationCheck, VerificationStatus, CheckStatus

class VeriNovaService:
    @staticmethod
    def verify_booking_transaction(db: Session, booking: Booking) -> VerificationResult:
        """
        Executes comprehensive multi-point transaction consistency checks on a Voyara booking.
        Persists detailed Check items and overall verification result.
        """
        checks: List[Dict[str, Any]] = []
        is_failed = False
        needs_review = False
        failure_messages = []

        # ==========================================
        # 1. PROPERTY CHECKS
        # ==========================================
        prop = db.query(Property).filter(Property.id == booking.property_id).first()
        if not prop:
            checks.append({
                "category": "PROPERTY",
                "name": "Property Existence Check",
                "status": CheckStatus.FAIL,
                "message": f"Referenced Property ID #{booking.property_id} does not exist in database.",
                "details": "Target property record not found."
            })
            is_failed = True
            failure_messages.append("Property does not exist.")
        else:
            checks.append({
                "category": "PROPERTY",
                "name": "Property Existence Check",
                "status": CheckStatus.PASS,
                "message": f"Property verified: '{prop.name}' (Type: {prop.property_type}, City: {prop.city})",
                "details": f"Property ID: {prop.id}"
            })

            # Property Active Check
            if not prop.is_active:
                checks.append({
                    "category": "PROPERTY",
                    "name": "Property Operational Status",
                    "status": CheckStatus.FAIL,
                    "message": f"Property '{prop.name}' is currently flagged as inactive/suspended.",
                    "details": "Property status = inactive."
                })
                is_failed = True
                failure_messages.append("Property is inactive.")
            else:
                checks.append({
                    "category": "PROPERTY",
                    "name": "Property Operational Status",
                    "status": CheckStatus.PASS,
                    "message": f"Property '{prop.name}' is currently active and accepting reservations.",
                    "details": "Operational status = active."
                })

            # Property Closure Check
            closure = db.query(PropertyAvailability).filter(
                PropertyAvailability.property_id == prop.id,
                PropertyAvailability.is_closed == True,
                PropertyAvailability.start_date <= booking.check_out,
                PropertyAvailability.end_date >= booking.check_in
            ).first()

            if closure:
                checks.append({
                    "category": "PROPERTY",
                    "name": "Property Closure Schedule Check",
                    "status": CheckStatus.FAIL,
                    "message": f"Property has scheduled closure ({closure.start_date} to {closure.end_date}). Reason: {closure.reason}",
                    "details": f"Closure ID: {closure.id}"
                })
                is_failed = True
                failure_messages.append(f"Property is closed ({closure.reason}).")
            else:
                checks.append({
                    "category": "PROPERTY",
                    "name": "Property Closure Schedule Check",
                    "status": CheckStatus.PASS,
                    "message": f"Property has no conflicting closures between {booking.check_in} and {booking.check_out}.",
                    "details": "No scheduled property shutdowns."
                })

        # ==========================================
        # 2. ROOM & AVAILABILITY CHECKS
        # ==========================================
        booking_rooms = booking.booking_rooms
        if not booking_rooms:
            checks.append({
                "category": "ROOM",
                "name": "Room Inventory Selection",
                "status": CheckStatus.FAIL,
                "message": "No room unit assigned to this booking transaction.",
                "details": "Missing room item in booking."
            })
            is_failed = True
            failure_messages.append("No room assigned.")
        else:
            for br in booking_rooms:
                room = db.query(Room).filter(Room.id == br.room_id).first()
                if not room:
                    checks.append({
                        "category": "ROOM",
                        "name": f"Room #{br.room_id} Integrity Check",
                        "status": CheckStatus.FAIL,
                        "message": f"Room unit ID #{br.room_id} not found in database.",
                        "details": "Room record missing."
                    })
                    is_failed = True
                    failure_messages.append(f"Room #{br.room_id} not found.")
                    continue

                # Room belongs to property
                if room.property_id != booking.property_id:
                    checks.append({
                        "category": "ROOM",
                        "name": f"Room Belonging Verification: '{room.name}'",
                        "status": CheckStatus.FAIL,
                        "message": f"Room #{room.id} does not belong to Property #{booking.property_id}.",
                        "details": f"Room property ID ({room.property_id}) mismatch with booking property ID ({booking.property_id})."
                    })
                    is_failed = True
                    failure_messages.append("Room property mismatch.")
                else:
                    checks.append({
                        "category": "ROOM",
                        "name": f"Room Belonging Verification: '{room.name}'",
                        "status": CheckStatus.PASS,
                        "message": f"Room correctly maps to '{prop.name if prop else 'Property'}'.",
                        "details": f"Room Type: {room.room_type}, Max Capacity: {room.capacity} guests"
                    })

                # Room active
                if not room.is_active:
                    checks.append({
                        "category": "ROOM",
                        "name": f"Room Status: '{room.name}'",
                        "status": CheckStatus.FAIL,
                        "message": f"Room '{room.name}' is currently marked inactive.",
                        "details": "Room is inactive."
                    })
                    is_failed = True
                    failure_messages.append("Room is inactive.")

                # Room blocked dates
                room_block = db.query(RoomAvailability).filter(
                    RoomAvailability.room_id == room.id,
                    RoomAvailability.is_blocked == True,
                    RoomAvailability.start_date <= booking.check_out,
                    RoomAvailability.end_date >= booking.check_in
                ).first()

                if room_block:
                    checks.append({
                        "category": "ROOM",
                        "name": f"Room Blackout Dates Check: '{room.name}'",
                        "status": CheckStatus.FAIL,
                        "message": f"Room '{room.name}' is blocked by provider ({room_block.start_date} to {room_block.end_date}). Reason: {room_block.reason}",
                        "details": f"Block ID: {room_block.id}"
                    })
                    is_failed = True
                    failure_messages.append(f"Room blocked ({room_block.reason}).")
                else:
                    checks.append({
                        "category": "ROOM",
                        "name": f"Room Blackout Dates Check: '{room.name}'",
                        "status": CheckStatus.PASS,
                        "message": f"Room '{room.name}' has no provider date blocks during stay.",
                        "details": "No manual provider blackout."
                    })

                # Conflicting bookings & inventory overlap check
                booked_qty_other = db.query(
                    func.coalesce(func.sum(BookingRoom.quantity), 0)
                ).join(Booking).filter(
                    BookingRoom.room_id == room.id,
                    Booking.id != booking.id,
                    Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.VERIFIED]),
                    Booking.check_in < booking.check_out,
                    Booking.check_out > booking.check_in
                ).scalar() or 0

                br_qty = getattr(br, 'quantity', 1) or 1
                total_projected_rooms = booked_qty_other + br_qty

                if total_projected_rooms > room.quantity:
                    checks.append({
                        "category": "ROOM",
                        "name": f"Room Inventory Overlap & Double Booking Prevention",
                        "status": CheckStatus.FAIL,
                        "message": f"Inventory overflow for Room '{room.name}'! Requested {br_qty} units, but only {max(0, room.quantity - booked_qty_other)} available (Total: {room.quantity}, Already Booked: {booked_qty_other}).",
                        "details": f"Projected units {total_projected_rooms} > Total units {room.quantity}."
                    })
                    is_failed = True
                    failure_messages.append("Room inventory overflow detected.")
                else:
                    checks.append({
                        "category": "ROOM",
                        "name": f"Room Inventory Overlap & Double Booking Prevention",
                        "status": CheckStatus.PASS,
                        "message": f"Room inventory verified for '{room.name}'. {br_qty} of {room.quantity} units reserved ({room.quantity - total_projected_rooms} remaining).",
                        "details": "100% available in transactional inventory."
                    })

                # Room Capacity Check
                total_allowed_capacity = room.capacity * br_qty
                if booking.total_guests > total_allowed_capacity:
                    checks.append({
                        "category": "ROOM",
                        "name": f"Room Capacity Check",
                        "status": CheckStatus.FAIL,
                        "message": f"Guest count ({booking.total_guests}) exceeds allowed capacity ({total_allowed_capacity} max for {br_qty} room(s)).",
                        "details": f"Guests: {booking.total_guests} > Max Capacity: {total_allowed_capacity}."
                    })
                    is_failed = True
                    failure_messages.append("Guest count exceeds maximum room capacity.")
                else:
                    checks.append({
                        "category": "ROOM",
                        "name": f"Room Capacity Check",
                        "status": CheckStatus.PASS,
                        "message": f"Guest count ({booking.total_guests}) is within limit ({total_allowed_capacity} max for {br_qty} room(s)).",
                        "details": "Capacity verified."
                    })

        # ==========================================
        # 3. EXPERIENCE & CAPACITY CHECKS
        # ==========================================
        booking_experiences = booking.booking_experiences
        if booking_experiences:
            for be in booking_experiences:
                exp = db.query(Experience).filter(Experience.id == be.experience_id).first()
                if not exp:
                    checks.append({
                        "category": "EXPERIENCE",
                        "name": f"Experience #{be.experience_id} Integrity Check",
                        "status": CheckStatus.FAIL,
                        "message": f"Experience ID #{be.experience_id} not found in database.",
                        "details": "Experience record missing."
                    })
                    is_failed = True
                    failure_messages.append("Experience not found.")
                    continue

                # Experience belongs to property
                if exp.property_id != booking.property_id:
                    checks.append({
                        "category": "EXPERIENCE",
                        "name": f"Experience Property Link: '{exp.title}'",
                        "status": CheckStatus.FAIL,
                        "message": f"Experience '{exp.title}' does not belong to booked property.",
                        "details": "Mismatch between experience property and stay property."
                    })
                    is_failed = True
                    failure_messages.append("Experience property mismatch.")
                else:
                    checks.append({
                        "category": "EXPERIENCE",
                        "name": f"Experience Property Link: '{exp.title}'",
                        "status": CheckStatus.PASS,
                        "message": f"Experience correctly hosted at '{prop.name if prop else 'Property'}'.",
                        "details": f"Type: {exp.experience_type}, Duration: {exp.duration}"
                    })

                # Experience Active Check
                if not exp.is_active:
                    checks.append({
                        "category": "EXPERIENCE",
                        "name": f"Experience Active Status: '{exp.title}'",
                        "status": CheckStatus.FAIL,
                        "message": f"Experience '{exp.title}' is currently inactive.",
                        "details": "Experience inactive."
                    })
                    is_failed = True
                    failure_messages.append("Experience is inactive.")

                # Capacity Check
                check_date = be.scheduled_date or booking.check_in
                booked_participants = db.query(func.coalesce(func.sum(BookingExperience.participants), 0)).join(Booking).filter(
                    BookingExperience.experience_id == exp.id,
                    BookingExperience.scheduled_date == check_date,
                    Booking.id != booking.id,
                    Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.VERIFIED])
                ).scalar()

                total_projected = booked_participants + be.participants
                if total_projected > exp.capacity:
                    checks.append({
                        "category": "EXPERIENCE",
                        "name": f"Experience Capacity Check: '{exp.title}'",
                        "status": CheckStatus.FAIL,
                        "message": f"Capacity overflow! Requested {be.participants} seats, but only {max(0, exp.capacity - booked_participants)} remaining (Capacity: {exp.capacity}, Already Booked: {booked_participants}).",
                        "details": f"Projected {total_projected} > Max {exp.capacity}"
                    })
                    is_failed = True
                    failure_messages.append(f"Insufficient capacity for '{exp.title}'.")
                else:
                    checks.append({
                        "category": "EXPERIENCE",
                        "name": f"Experience Capacity Check: '{exp.title}'",
                        "status": CheckStatus.PASS,
                        "message": f"Capacity verified for {check_date}. {be.participants} seats reserved out of {exp.capacity} capacity ({max(0, exp.capacity - total_projected)} remaining).",
                        "details": "Capacity within limits."
                    })
        else:
            checks.append({
                "category": "EXPERIENCE",
                "name": "Experience Add-on Validation",
                "status": CheckStatus.PASS,
                "message": "Accommodation-only stay reservation (no optional experience added).",
                "details": "No add-on experiences."
            })

        # ==========================================
        # 4. PRICING & CALCULATION CHECKS
        # ==========================================
        nights = (booking.check_out - booking.check_in).days
        if nights <= 0:
            nights = 1

        expected_room_total = 0.0
        for br in booking_rooms:
            room = db.query(Room).filter(Room.id == br.room_id).first()
            if room:
                br_qty = getattr(br, 'quantity', 1) or 1
                expected_room_total += round(room.base_price * nights * br_qty, 2)
        
        expected_exp_total = 0.0
        for be in booking_experiences:
            exp = db.query(Experience).filter(Experience.id == be.experience_id).first()
            if exp:
                if exp.pricing_model == "per_person":
                    expected_exp_total += round(exp.price * be.participants, 2)
                else:
                    expected_exp_total += round(exp.price, 2)

        expected_total = round(expected_room_total + expected_exp_total, 2)
        actual_total = round(booking.total_amount, 2)

        price_diff = abs(actual_total - expected_total)
        if price_diff > 0.01:
            checks.append({
                "category": "PRICE",
                "name": "Server Price Calculation Verification",
                "status": CheckStatus.FAIL,
                "message": f"Price discrepancy detected. Computed server total: ₹{expected_total:,.2f} vs Booking recorded total: ₹{actual_total:,.2f}.",
                "details": f"Room Total: ₹{expected_room_total:,.2f}, Experience Total: ₹{expected_exp_total:,.2f}"
            })
            is_failed = True
            failure_messages.append("Price calculation mismatch.")
        else:
            checks.append({
                "category": "PRICE",
                "name": "Server Price Calculation Verification",
                "status": CheckStatus.PASS,
                "message": f"Total price ₹{actual_total:,.2f} verified precisely (Room: ₹{expected_room_total:,.2f} for {nights} night(s) + Experiences: ₹{expected_exp_total:,.2f}).",
                "details": "Zero discrepancy in pricing arithmetic."
            })

        # ==========================================
        # 5. BOOKING & CUSTOMER INTEGRITY CHECKS
        # ==========================================
        user = db.query(User).filter(User.id == booking.user_id).first()
        if not user or not user.is_active:
            checks.append({
                "category": "BOOKING",
                "name": "Customer Profile Status Check",
                "status": CheckStatus.FAIL,
                "message": "Customer account is invalid or deactivated.",
                "details": "Customer inactive."
            })
            is_failed = True
            failure_messages.append("Customer account invalid.")
        else:
            checks.append({
                "category": "BOOKING",
                "name": "Customer Profile Status Check",
                "status": CheckStatus.PASS,
                "message": f"Authenticated Customer verified: {user.name} ({user.email})",
                "details": f"Customer ID: {user.id}"
            })

        # Date consistency
        if booking.check_out <= booking.check_in:
            checks.append({
                "category": "BOOKING",
                "name": "Stay Dates Logical Consistency",
                "status": CheckStatus.FAIL,
                "message": f"Check-out date ({booking.check_out}) must be strictly after Check-in date ({booking.check_in}).",
                "details": "Invalid date range."
            })
            is_failed = True
            failure_messages.append("Invalid stay dates.")
        else:
            checks.append({
                "category": "BOOKING",
                "name": "Stay Dates Logical Consistency",
                "status": CheckStatus.PASS,
                "message": f"Valid stay period: {booking.check_in} to {booking.check_out} ({nights} nights).",
                "details": "Dates validated."
            })

        # ==========================================
        # FINAL VERIFICATION RESULT DETERMINATION
        # ==========================================
        if is_failed:
            final_status = VerificationStatus.FAILED
            summary = f"VeriNova Transaction Verification FAILED. Issues found: {'; '.join(failure_messages)}"
        elif needs_review:
            final_status = VerificationStatus.NEEDS_REVIEW
            summary = "VeriNova Transaction flagged for REVIEW. Minor warnings require provider or administrative confirmation."
        else:
            final_status = VerificationStatus.VERIFIED
            summary = "VeriNova Transaction VERIFIED. All 10+ transactional integrity, availability, capacity, and pricing checks passed with 100% database consistency."

        # Save or update VerificationResult in database
        existing_result = db.query(VerificationResult).filter(VerificationResult.booking_id == booking.id).first()
        if existing_result:
            existing_result.status = final_status
            existing_result.summary = summary
            existing_result.failure_reasons = "; ".join(failure_messages) if failure_messages else None
            existing_result.verified_at = datetime.now(timezone.utc).replace(tzinfo=None)
            db.query(VerificationCheck).filter(VerificationCheck.verification_id == existing_result.id).delete()
            res = existing_result
        else:
            res = VerificationResult(
                booking_id=booking.id,
                status=final_status,
                summary=summary,
                failure_reasons="; ".join(failure_messages) if failure_messages else None,
                verified_at=datetime.now(timezone.utc).replace(tzinfo=None)
            )
            db.add(res)
            db.flush()
            db.refresh(res)

        for chk in checks:
            db.add(VerificationCheck(
                verification_id=res.id,
                check_category=chk["category"],
                check_name=chk["name"],
                status=chk["status"],
                message=chk["message"],
                details=chk.get("details")
            ))

        # Update booking status based on verification
        if final_status == VerificationStatus.VERIFIED:
            booking.status = BookingStatus.VERIFIED
        elif final_status == VerificationStatus.FAILED:
            booking.status = BookingStatus.FAILED

        db.flush()
        return res

    @staticmethod
    def get_verification_details(db: Session, booking_id: int) -> dict:
        booking = db.query(Booking).filter(Booking.id == booking_id).first()
        if not booking:
            return None
        
        result = db.query(VerificationResult).filter(VerificationResult.booking_id == booking_id).first()
        if not result:
            # Run verification dynamically if missing
            result = VeriNovaService.verify_booking_transaction(db, booking)

        room_name = booking.booking_rooms[0].room_name if booking.booking_rooms else "N/A"
        exp_title = booking.booking_experiences[0].experience_title if booking.booking_experiences else None

        return {
            "booking_id": booking.id,
            "booking_number": booking.booking_number,
            "customer_name": booking.user.name if booking.user else "N/A",
            "customer_email": booking.user.email if booking.user else "N/A",
            "property_name": booking.property.name if booking.property else "N/A",
            "property_type": booking.property.property_type if booking.property else "N/A",
            "room_name": room_name,
            "check_in": str(booking.check_in),
            "check_out": str(booking.check_out),
            "experience_title": exp_title,
            "total_amount": booking.total_amount,
            "verification_status": result.status.value,
            "summary": result.summary,
            "verified_at": result.verified_at,
            "checks": [
                {
                    "id": c.id,
                    "check_category": c.check_category,
                    "check_name": c.check_name,
                    "status": c.status.value,
                    "message": c.message,
                    "details": c.details
                }
                for c in result.checks
            ]
        }
