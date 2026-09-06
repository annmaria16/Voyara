from datetime import date
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.availability import PropertyAvailability, RoomAvailability
from app.models.property import Property
from app.models.room import Room
from app.models.booking import Booking, BookingStatus, BookingRoom
from app.schemas.availability import PropertyClosureCreate, RoomBlockCreate

class AvailabilityService:
    @staticmethod
    def block_property_dates(db: Session, property_id: int, provider_id: int, data: PropertyClosureCreate) -> PropertyAvailability:
        prop = db.query(Property).filter(Property.id == property_id, Property.provider_id == provider_id).first()
        if not prop:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found or access denied.")
        
        if data.end_date < data.start_date:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="End date cannot be before start date.")

        closure = PropertyAvailability(
            property_id=property_id,
            start_date=data.start_date,
            end_date=data.end_date,
            is_closed=True,
            reason=data.reason or "Property closure"
        )
        db.add(closure)
        db.commit()
        db.refresh(closure)
        return closure

    @staticmethod
    def remove_property_closure(db: Session, closure_id: int, provider_id: int) -> dict:
        closure = db.query(PropertyAvailability).filter(PropertyAvailability.id == closure_id).first()
        if not closure:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Closure record not found.")
        
        prop = db.query(Property).filter(Property.id == closure.property_id, Property.provider_id == provider_id).first()
        if not prop:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

        db.delete(closure)
        db.commit()
        return {"message": "Property closure removed successfully", "success": True}

    @staticmethod
    def block_room_dates(db: Session, provider_id: int, data: RoomBlockCreate) -> RoomAvailability:
        room = db.query(Room).filter(Room.id == data.room_id).first()
        if not room:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found.")
        
        prop = db.query(Property).filter(Property.id == room.property_id, Property.provider_id == provider_id).first()
        if not prop:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this room's property.")

        if data.end_date < data.start_date:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="End date cannot be before start date.")

        block = RoomAvailability(
            room_id=data.room_id,
            start_date=data.start_date,
            end_date=data.end_date,
            is_blocked=True,
            reason=data.reason or "Room blocked"
        )
        db.add(block)
        db.commit()
        db.refresh(block)
        return block

    @staticmethod
    def remove_room_block(db: Session, block_id: int, provider_id: int) -> dict:
        block = db.query(RoomAvailability).filter(RoomAvailability.id == block_id).first()
        if not block:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room block record not found.")
        
        room = db.query(Room).filter(Room.id == block.room_id).first()
        if not room:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found.")
            
        prop = db.query(Property).filter(Property.id == room.property_id, Property.provider_id == provider_id).first()
        if not prop:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

        db.delete(block)
        db.commit()
        return {"message": "Room block removed successfully", "success": True}

    @staticmethod
    def get_property_calendar(db: Session, property_id: int) -> dict:
        closures = db.query(PropertyAvailability).filter(PropertyAvailability.property_id == property_id).all()
        room_ids = [r.id for r in db.query(Room.id).filter(Room.property_id == property_id).all()]
        room_blocks = db.query(RoomAvailability).filter(RoomAvailability.room_id.in_(room_ids)).all() if room_ids else []
        
        # Also fetch confirmed bookings for display in calendar
        bookings = db.query(Booking).filter(
            Booking.property_id == property_id,
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.VERIFIED])
        ).all()

        return {
            "property_id": property_id,
            "closures": closures,
            "room_blocks": room_blocks,
            "bookings": [
                {
                    "booking_number": b.booking_number,
                    "check_in": b.check_in,
                    "check_out": b.check_out,
                    "status": b.status.value,
                    "rooms": [br.room_name for br in b.booking_rooms]
                }
                for b in bookings
            ]
        }

    @staticmethod
    def check_room_availability(
        db: Session,
        room_id: int,
        check_in: Optional[date] = None,
        check_out: Optional[date] = None
    ) -> dict:
        """
        Dynamically calculates PostgreSQL real-time room availability, considering total units,
        confirmed/verified overlapping bookings, provider room date blocks, and property closures.
        """
        from sqlalchemy import func

        room = db.query(Room).filter(Room.id == room_id).first()
        if not room:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room unit not found.")

        # Baseline response without dates
        if not check_in or not check_out:
            return {
                "room_id": room.id,
                "property_id": room.property_id,
                "room_name": room.name,
                "total_quantity": room.quantity,
                "booked_quantity": 0,
                "blocked_quantity": 0,
                "available_quantity": room.quantity if room.is_active else 0,
                "max_guests": room.capacity,
                "price_per_night": room.base_price,
                "is_available": room.is_active and room.quantity > 0,
                "is_property_closed": False,
                "is_room_blocked": False,
                "message": None if room.is_active else "Room is inactive."
            }

        # Date validation
        today = date.today()
        if check_in < today:
            return {
                "room_id": room.id,
                "property_id": room.property_id,
                "room_name": room.name,
                "total_quantity": room.quantity,
                "booked_quantity": 0,
                "blocked_quantity": 0,
                "available_quantity": 0,
                "max_guests": room.capacity,
                "price_per_night": room.base_price,
                "is_available": False,
                "is_property_closed": False,
                "is_room_blocked": False,
                "message": "Check-in date cannot be in the past."
            }

        if check_out <= check_in:
            return {
                "room_id": room.id,
                "property_id": room.property_id,
                "room_name": room.name,
                "total_quantity": room.quantity,
                "booked_quantity": 0,
                "blocked_quantity": 0,
                "available_quantity": 0,
                "max_guests": room.capacity,
                "price_per_night": room.base_price,
                "is_available": False,
                "is_property_closed": False,
                "is_room_blocked": False,
                "message": "Check-out date must be strictly after Check-in date."
            }

        # 1. Check Property Closures
        closure = db.query(PropertyAvailability).filter(
            PropertyAvailability.property_id == room.property_id,
            PropertyAvailability.is_closed == True,
            PropertyAvailability.start_date <= check_out,
            PropertyAvailability.end_date >= check_in
        ).first()

        # 2. Check Room Date Blocks
        room_block = db.query(RoomAvailability).filter(
            RoomAvailability.room_id == room.id,
            RoomAvailability.is_blocked == True,
            RoomAvailability.start_date <= check_out,
            RoomAvailability.end_date >= check_in
        ).first()

        # 3. Sum Confirmed/Verified Overlapping Booked Quantities
        booked_qty = db.query(
            func.coalesce(func.sum(BookingRoom.quantity), 0)
        ).join(Booking).filter(
            BookingRoom.room_id == room.id,
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.VERIFIED]),
            Booking.check_in < check_out,
            Booking.check_out > check_in
        ).scalar() or 0

        # Determine Availability
        is_closed = bool(closure)
        is_blocked = bool(room_block)
        blocked_qty = room.quantity if is_blocked else 0

        if not room.is_active:
            available_qty = 0
            is_avail = False
            msg = "Room is currently inactive."
        elif is_closed:
            available_qty = 0
            is_avail = False
            msg = f"Property is closed for the selected dates ({closure.reason})."
        elif is_blocked:
            available_qty = 0
            is_avail = False
            msg = f"Room is blocked for the selected dates ({room_block.reason})."
        else:
            available_qty = max(0, room.quantity - booked_qty)
            is_avail = available_qty > 0
            msg = None if is_avail else "Sold out for these dates."

        return {
            "room_id": room.id,
            "property_id": room.property_id,
            "room_name": room.name,
            "total_quantity": room.quantity,
            "booked_quantity": int(booked_qty),
            "blocked_quantity": int(blocked_qty),
            "available_quantity": int(available_qty),
            "max_guests": room.capacity,
            "price_per_night": room.base_price,
            "is_available": is_avail,
            "is_property_closed": is_closed,
            "is_room_blocked": is_blocked,
            "message": msg
        }
