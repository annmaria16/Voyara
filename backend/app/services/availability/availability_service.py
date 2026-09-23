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
    def get_property_calendar(db: Session, property_id: int, provider_id: Optional[int] = None) -> dict:
        if provider_id is not None:
            prop = db.query(Property).filter(Property.id == property_id, Property.provider_id == provider_id).first()
            if not prop:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found or access denied.")

        closures = db.query(PropertyAvailability).filter(PropertyAvailability.property_id == property_id).all()
        room_ids = [r.id for r in db.query(Room.id).filter(Room.property_id == property_id).all()]
        room_blocks = db.query(RoomAvailability).filter(RoomAvailability.room_id.in_(room_ids)).all() if room_ids else []
        
        # Also fetch active bookings for display in calendar
        bookings = db.query(Booking).filter(
            Booking.property_id == property_id,
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.VERIFIED, BookingStatus.CHECKED_IN, BookingStatus.PENDING])
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
    def get_property_month_calendar(
        db: Session,
        property_id: int,
        provider_id: int,
        year: Optional[int] = None,
        month: Optional[int] = None
    ) -> dict:
        """
        Calculates authoritative single-property PostgreSQL monthly calendar availability,
        including day-by-day occupied nights, all active bookings, room-by-room inventory breakdown,
        and blackout/closure schedule.
        """
        import calendar

        # Enforce Property Ownership
        prop = db.query(Property).filter(Property.id == property_id, Property.provider_id == provider_id).first()
        if not prop:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Property not found or access denied."
            )

        today = date.today()
        year = int(year) if year else today.year
        month = int(month) if month else today.month

        if month < 1 or month > 12:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Month must be between 1 and 12.")

        num_days = calendar.monthrange(year, month)[1]
        month_start = date(year, month, 1)
        month_end = date(year, month, num_days)
        month_name = calendar.month_name[month]

        # Active rooms belonging strictly to this property
        rooms = db.query(Room).filter(Room.property_id == property_id, Room.is_active == True).all()
        room_ids = [r.id for r in rooms]
        total_units = sum(r.quantity for r in rooms)

        # Active Property Closures
        closures = db.query(PropertyAvailability).filter(
            PropertyAvailability.property_id == property_id,
            PropertyAvailability.is_closed == True,
            PropertyAvailability.start_date <= month_end,
            PropertyAvailability.end_date >= month_start
        ).all()

        # Active Room Blocks
        room_blocks = db.query(RoomAvailability).filter(
            RoomAvailability.room_id.in_(room_ids),
            RoomAvailability.is_blocked == True,
            RoomAvailability.start_date <= month_end,
            RoomAvailability.end_date >= month_start
        ).all() if room_ids else []

        # Active Bookings (CONFIRMED, VERIFIED, CHECKED_IN, PENDING, COMPLETED, CHECKED_OUT)
        # Strictly EXCLUDE CANCELLED and FAILED
        active_statuses = [
            BookingStatus.CONFIRMED,
            BookingStatus.VERIFIED,
            BookingStatus.CHECKED_IN,
            BookingStatus.PENDING,
            BookingStatus.COMPLETED,
            BookingStatus.CHECKED_OUT,
        ]

        bookings = db.query(Booking).filter(
            Booking.property_id == property_id,
            Booking.status.in_(active_statuses),
            Booking.check_in <= month_end,
            Booking.check_out > month_start
        ).all()

        days = []
        booked_days_set = set()
        blocked_days_set = set()

        for d in range(1, num_days + 1):
            day_date = date(year, month, d)
            day_date_str = day_date.strftime("%Y-%m-%d")
            # JavaScript standard: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
            js_day_of_week = (day_date.weekday() + 1) % 7

            # Property closures on day_date
            day_closures = [c for c in closures if c.start_date <= day_date <= c.end_date]
            is_property_closed = len(day_closures) > 0

            # Room blocks on day_date
            day_blocks = [b for b in room_blocks if b.start_date <= day_date <= b.end_date]
            blocked_room_ids = set(b.room_id for b in day_blocks)

            # Active bookings occupying night of day_date: check_in <= day_date < check_out
            day_bookings = [b for b in bookings if b.check_in <= day_date < b.check_out]

            room_inventory = []
            total_booked_units_on_day = 0
            total_blocked_units_on_day = 0

            for r in rooms:
                r_is_blocked = is_property_closed or (r.id in blocked_room_ids)
                r_blocked_qty = r.quantity if r_is_blocked else 0

                # Count booked units specifically for this room
                r_booked_qty = 0
                for b in day_bookings:
                    for br in b.booking_rooms:
                        if br.room_id == r.id:
                            r_booked_qty += br.quantity

                r_available_qty = 0 if r_is_blocked else max(0, r.quantity - r_booked_qty)
                total_booked_units_on_day += r_booked_qty
                total_blocked_units_on_day += r_blocked_qty

                room_inventory.append({
                    "room_id": r.id,
                    "room_name": r.name,
                    "room_type": r.room_type,
                    "total_units": r.quantity,
                    "booked_units": r_booked_qty,
                    "blocked_units": r_blocked_qty,
                    "available_units": r_available_qty,
                    "price_per_night": r.base_price,
                    "is_available": r_available_qty > 0
                })

            total_avail_units_on_day = sum(ri["available_units"] for ri in room_inventory)

            # Detailed bookings list for date drawer
            booking_details = []
            for b in day_bookings:
                b_rooms = [br for br in b.booking_rooms if br.room_id in room_ids]
                if not b_rooms:
                    b_rooms = b.booking_rooms
                for br in b_rooms:
                    booking_details.append({
                        "booking_id": b.id,
                        "booking_number": b.booking_number,
                        "customer_name": b.user.name if b.user else "Guest",
                        "customer_email": b.user.email if b.user else None,
                        "customer_phone": b.user.phone if b.user else None,
                        "room_id": br.room_id,
                        "room_name": br.room_name,
                        "quantity": br.quantity,
                        "check_in": b.check_in,
                        "check_out": b.check_out,
                        "status": b.status.value
                    })

            # Authoritative Status calculation
            if total_units == 0:
                status_val = "AVAILABLE"
            elif is_property_closed or total_blocked_units_on_day >= total_units:
                status_val = "BLOCKED"
            elif total_booked_units_on_day >= total_units:
                status_val = "BOOKED"
            elif total_booked_units_on_day > 0 and total_avail_units_on_day > 0:
                status_val = "PARTIALLY_BOOKED"
            elif total_blocked_units_on_day > 0 and total_avail_units_on_day > 0:
                status_val = "PARTIALLY_BLOCKED"
            else:
                status_val = "AVAILABLE"

            if total_booked_units_on_day > 0:
                booked_days_set.add(d)
            if is_property_closed or (total_blocked_units_on_day > 0 and total_booked_units_on_day == 0):
                blocked_days_set.add(d)

            days.append({
                "date": day_date_str,
                "day": d,
                "day_of_week": js_day_of_week,
                "status": status_val,
                "booking_count": len(day_bookings),
                "booked_units": total_booked_units_on_day,
                "blocked_units": total_blocked_units_on_day,
                "total_units": total_units,
                "available_units": total_avail_units_on_day,
                "is_available": total_avail_units_on_day > 0,
                "is_blocked": is_property_closed or total_blocked_units_on_day >= total_units,
                "is_fully_booked": total_booked_units_on_day >= total_units and total_units > 0,
                "bookings": booking_details,
                "room_inventory": room_inventory,
                "closures": [
                    {
                        "id": c.id,
                        "property_id": c.property_id,
                        "start_date": c.start_date,
                        "end_date": c.end_date,
                        "reason": c.reason or "Property seasonal closure"
                    }
                    for c in day_closures
                ],
                "room_blocks": [
                    {
                        "id": b.id,
                        "room_id": b.room_id,
                        "room_name": b.room.name if b.room else "",
                        "start_date": b.start_date,
                        "end_date": b.end_date,
                        "reason": b.reason or "Room maintenance"
                    }
                    for b in day_blocks
                ]
            })

        booked_dates_list = sorted(list(booked_days_set))
        blocked_dates_list = sorted(list(blocked_days_set))
        available_days_count = sum(1 for d in days if d["status"] == "AVAILABLE")

        return {
            "property_id": property_id,
            "property_name": prop.name,
            "year": year,
            "month": month,
            "month_name": month_name,
            "days": days,
            "booked_dates": booked_dates_list,
            "blocked_dates": blocked_dates_list,
            "summary": {
                "total_days": num_days,
                "available_days": available_days_count,
                "booked_days_count": len(booked_dates_list),
                "blocked_days_count": len(blocked_dates_list),
                "total_units": total_units,
                "total_rooms": len(rooms)
            }
        }

    @staticmethod
    def get_property_date_detail(
        db: Session,
        property_id: int,
        provider_id: int,
        target_date: date
    ) -> dict:
        """Get complete booking, room inventory, and blackout details for a single date."""
        month_data = AvailabilityService.get_property_month_calendar(
            db=db,
            property_id=property_id,
            provider_id=provider_id,
            year=target_date.year,
            month=target_date.month
        )
        day_str = target_date.strftime("%Y-%m-%d")
        for day in month_data.get("days", []):
            if day["date"] == day_str:
                return {
                    "property_id": property_id,
                    "property_name": month_data["property_name"],
                    **day
                }
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Date not found in calendar.")

    @staticmethod
    def get_provider_overview_calendar(
        db: Session,
        provider_id: int,
        property_id: Optional[int] = None,
        year: Optional[int] = None,
        month: Optional[int] = None
    ) -> dict:
        """
        If property_id is given, returns property month calendar.
        If property_id is None, aggregates across all properties owned by this provider.
        """
        if property_id is not None:
            return AvailabilityService.get_property_month_calendar(
                db=db,
                property_id=property_id,
                provider_id=provider_id,
                year=year,
                month=month
            )

        import calendar

        today = date.today()
        year = int(year) if year else today.year
        month = int(month) if month else today.month

        if month < 1 or month > 12:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Month must be between 1 and 12.")

        num_days = calendar.monthrange(year, month)[1]
        month_start = date(year, month, 1)
        month_end = date(year, month, num_days)
        month_name = calendar.month_name[month]

        properties = db.query(Property).filter(Property.provider_id == provider_id).all()
        if not properties:
            days = [
                {
                    "date": date(year, month, d).strftime("%Y-%m-%d"),
                    "day": d,
                    "day_of_week": (date(year, month, d).weekday() + 1) % 7,
                    "status": "AVAILABLE",
                    "booking_count": 0,
                    "booked_units": 0,
                    "blocked_units": 0,
                    "total_units": 0,
                    "available_units": 0,
                    "is_available": True,
                    "is_blocked": False,
                    "is_fully_booked": False,
                    "bookings": [],
                    "room_inventory": [],
                    "closures": [],
                    "room_blocks": []
                }
                for d in range(1, num_days + 1)
            ]
            return {
                "property_id": None,
                "property_name": "All Properties Overview",
                "year": year,
                "month": month,
                "month_name": month_name,
                "days": days,
                "booked_dates": [],
                "blocked_dates": [],
                "summary": {
                    "total_days": num_days,
                    "available_days": num_days,
                    "booked_days_count": 0,
                    "blocked_days_count": 0,
                    "total_units": 0,
                    "total_rooms": 0
                }
            }

        # Aggregate across all owned properties
        prop_calendars = [
            AvailabilityService.get_property_month_calendar(
                db=db,
                property_id=p.id,
                provider_id=provider_id,
                year=year,
                month=month
            )
            for p in properties
        ]

        total_units = sum(pc["summary"]["total_units"] for pc in prop_calendars)
        total_rooms = sum(pc["summary"]["total_rooms"] for pc in prop_calendars)

        days = []
        booked_days_set = set()
        blocked_days_set = set()

        for d_idx in range(num_days):
            day_date_str = prop_calendars[0]["days"][d_idx]["date"]
            day_num = prop_calendars[0]["days"][d_idx]["day"]
            day_dow = prop_calendars[0]["days"][d_idx]["day_of_week"]

            day_booked_units = sum(pc["days"][d_idx]["booked_units"] for pc in prop_calendars)
            day_blocked_units = sum(pc["days"][d_idx]["blocked_units"] for pc in prop_calendars)
            day_avail_units = sum(pc["days"][d_idx]["available_units"] for pc in prop_calendars)
            day_booking_count = sum(pc["days"][d_idx]["booking_count"] for pc in prop_calendars)

            day_bookings = []
            day_room_inv = []
            day_closures = []
            day_blocks = []

            for pc in prop_calendars:
                p_day = pc["days"][d_idx]
                day_bookings.extend(p_day["bookings"])
                day_room_inv.extend(p_day["room_inventory"])
                day_closures.extend(p_day["closures"])
                day_blocks.extend(p_day["room_blocks"])

            if total_units == 0:
                status_val = "AVAILABLE"
            elif day_blocked_units >= total_units:
                status_val = "BLOCKED"
            elif day_booked_units >= total_units:
                status_val = "BOOKED"
            elif day_booked_units > 0 and day_avail_units > 0:
                status_val = "PARTIALLY_BOOKED"
            elif day_blocked_units > 0 and day_avail_units > 0:
                status_val = "PARTIALLY_BLOCKED"
            else:
                status_val = "AVAILABLE"

            if day_booked_units > 0:
                booked_days_set.add(day_num)
            if day_blocked_units > 0 and day_booked_units == 0:
                blocked_days_set.add(day_num)

            days.append({
                "date": day_date_str,
                "day": day_num,
                "day_of_week": day_dow,
                "status": status_val,
                "booking_count": day_booking_count,
                "booked_units": day_booked_units,
                "blocked_units": day_blocked_units,
                "total_units": total_units,
                "available_units": day_avail_units,
                "is_available": day_avail_units > 0,
                "is_blocked": day_blocked_units >= total_units and total_units > 0,
                "is_fully_booked": day_booked_units >= total_units and total_units > 0,
                "bookings": day_bookings,
                "room_inventory": day_room_inv,
                "closures": day_closures,
                "room_blocks": day_blocks
            })

        booked_dates_list = sorted(list(booked_days_set))
        blocked_dates_list = sorted(list(blocked_days_set))
        available_days_count = sum(1 for d in days if d["status"] == "AVAILABLE")

        return {
            "property_id": None,
            "property_name": "All Properties Overview",
            "year": year,
            "month": month,
            "month_name": month_name,
            "days": days,
            "booked_dates": booked_dates_list,
            "blocked_dates": blocked_dates_list,
            "summary": {
                "total_days": num_days,
                "available_days": available_days_count,
                "booked_days_count": len(booked_dates_list),
                "blocked_days_count": len(blocked_dates_list),
                "total_units": total_units,
                "total_rooms": total_rooms
            }
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

        # 3. Sum Confirmed/Verified/Checked-In Overlapping Booked Quantities
        booked_qty = db.query(
            func.coalesce(func.sum(BookingRoom.quantity), 0)
        ).join(Booking).filter(
            BookingRoom.room_id == room.id,
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.VERIFIED, BookingStatus.CHECKED_IN]),
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
