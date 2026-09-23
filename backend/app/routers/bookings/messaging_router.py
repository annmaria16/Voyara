from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import desc, func
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User, UserRole
from app.models.booking import Booking, BookingStatus, BookingRoom, BookingExperience, BookingRuleSnapshot
from app.models.booking_message import BookingMessage
from app.models.property import Property, PropertyImage, PropertyRule
from app.models.room import Room, RoomRule
from app.models.provider import ProviderProfile
from app.services.notifications.notification_service import NotificationService

router = APIRouter(tags=["Booking Messages & Stay Information"])

class BookingMessageCreate(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="Message text")

class BookingMessageResponse(BaseModel):
    id: int
    booking_id: int
    sender_id: int
    sender_role: str
    sender_name: str
    message: str
    is_read: bool
    created_at: datetime

def get_authorized_booking(db: Session, booking_id: int, current_user: User) -> Booking:
    """
    Validates that the requested booking exists and belongs to the current user
    (either as the customer traveler, property stay partner, or platform admin).
    """
    booking = (
        db.query(Booking)
        .options(
            joinedload(Booking.property).joinedload(Property.provider).joinedload(ProviderProfile.user),
            joinedload(Booking.property).joinedload(Property.images),
            joinedload(Booking.property).joinedload(Property.home_rules),
            joinedload(Booking.booking_rooms).joinedload(BookingRoom.room).joinedload(Room.rules),
            joinedload(Booking.booking_rooms).joinedload(BookingRoom.room).joinedload(Room.amenities),
            joinedload(Booking.booking_experiences),
            joinedload(Booking.rule_snapshot),
            joinedload(Booking.user),
            joinedload(Booking.messages),
        )
        .filter(Booking.id == booking_id)
        .first()
    )
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Booking #{booking_id} not found."
        )

    is_admin = current_user.role == UserRole.ADMIN or (hasattr(current_user.role, "value") and current_user.role.value == "ADMIN")
    is_customer = booking.user_id == current_user.id
    
    is_provider = False
    if booking.property and booking.property.provider:
        if booking.property.provider.user_id == current_user.id:
            is_provider = True

    if not (is_admin or is_customer or is_provider):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to access messages or stay information for this booking."
        )

    return booking

def format_utc_iso(dt: Optional[datetime]) -> Optional[str]:
    if not dt:
        return None
    if isinstance(dt, datetime):
        if dt.tzinfo is None:
            return dt.isoformat() + "Z"
        return dt.isoformat()
    return str(dt)

def serialize_message(m: BookingMessage) -> Dict[str, Any]:
    return {
        "id": m.id,
        "booking_id": m.booking_id,
        "sender_id": m.sender_id,
        "sender_role": m.sender_role,
        "sender_name": m.sender_name,
        "message": m.message,
        "is_read": m.is_read,
        "created_at": format_utc_iso(m.created_at),
    }

def get_property_cover_image(prop: Optional[Property]) -> Optional[str]:
    """Retrieves real PostgreSQL property cover image."""
    if not prop or not prop.images:
        return None
    # Property.images is ordered with is_primary descending
    return prop.images[0].image_url if prop.images else None

def get_booking_status_string(booking: Booking) -> str:
    if hasattr(booking.status, "value"):
        return booking.status.value
    return str(booking.status)

def format_conversation_item(booking: Booking, current_user: User) -> Dict[str, Any]:
    prop = booking.property
    cover_image = get_property_cover_image(prop)
    status_str = get_booking_status_string(booking)
    
    partner_user = prop.provider.user if (prop and prop.provider) else None
    
    # Booking lifecycle flags
    is_active = status_str in ["CONFIRMED", "VERIFIED", "CHECKED_IN"]
    is_closed = status_str in ["CHECKED_OUT", "COMPLETED"]
    
    close_reason = None
    if is_closed:
        close_reason = "Stay completed — this conversation is now closed."
    elif status_str in ["CANCELLED", "FAILED", "PENDING", "PAYMENT_PENDING"]:
        close_reason = "This booking is no longer active for direct messaging."

    # Last message calculation
    messages = booking.messages or []
    last_msg = messages[-1] if messages else None
    
    # Unread counter: messages sent by counterparty that are unread
    unread_count = sum(1 for m in messages if m.sender_id != current_user.id and not m.is_read)
    
    room_title = booking.booking_rooms[0].room_name if booking.booking_rooms else "Sanctuary Stay"
    last_time = last_msg.created_at if last_msg else booking.created_at

    return {
        "booking_id": booking.id,
        "booking_number": booking.booking_number,
        "verinova_verification_id": booking.verinova_verification_id,
        "property_id": booking.property_id,
        "property_name": prop.name if prop else "Stay Sanctuary",
        "property_image": cover_image,
        "property_cover_image": cover_image,
        "property_city": prop.city if prop else "",
        "room_name": room_title,
        "check_in": str(booking.check_in),
        "check_out": str(booking.check_out),
        "stay_dates": f"{booking.check_in.strftime('%d %b %Y')} → {booking.check_out.strftime('%d %b %Y')}",
        "total_guests": booking.total_guests,
        "status": status_str,
        "is_messaging_allowed": is_active,
        "can_send_messages": is_active,
        "is_closed": is_closed,
        "close_reason": close_reason,
        "traveler_id": booking.user_id,
        "traveler_name": booking.user.name if booking.user else "Traveler",
        "stay_partner_id": partner_user.id if partner_user else None,
        "stay_partner_name": partner_user.name if partner_user else "Stay Partner",
        "last_message": last_msg.message if last_msg else "Booking confirmed. Direct messaging available.",
        "last_message_time": format_utc_iso(last_time),
        "last_message_sender_role": last_msg.sender_role if last_msg else None,
        "unread_count": unread_count,
        "messages_count": len(messages),
    }

# =========================================================================
# 1. CONVERSATION LIST (FOR TRAVELER & STAY PARTNER)
# =========================================================================

@router.get("/messages/conversations")
@router.get("/customer/messages/conversations")
@router.get("/provider/messages/conversations")
def get_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve all booking-linked conversations for the authenticated user.
    - Travelers see conversations for their bookings.
    - Stay Partners see conversations for bookings on properties they own/manage.
    - Returns real PostgreSQL property imagery, unread counts, and lifecycle statuses.
    """
    user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    
    query = (
        db.query(Booking)
        .options(
            joinedload(Booking.property).joinedload(Property.provider).joinedload(ProviderProfile.user),
            joinedload(Booking.property).joinedload(Property.images),
            joinedload(Booking.booking_rooms),
            joinedload(Booking.user),
            joinedload(Booking.messages),
        )
    )
    allowed_statuses = [
        BookingStatus.CONFIRMED,
        BookingStatus.VERIFIED,
        BookingStatus.CHECKED_IN,
        BookingStatus.CHECKED_OUT,
        BookingStatus.COMPLETED
    ]
    query = query.filter(Booking.status.in_(allowed_statuses))

    if user_role_str == "ADMIN":
        # Admin can view all
        bookings = query.order_by(desc(Booking.created_at)).all()
    elif user_role_str == "PROVIDER":
        # Provider sees bookings for properties they own
        provider_prof = db.query(ProviderProfile).filter(ProviderProfile.user_id == current_user.id).first()
        if not provider_prof:
            return []
        
        # Get provider's properties
        provider_prop_ids = [p.id for p in db.query(Property.id).filter(Property.provider_id == provider_prof.id).all()]
        if not provider_prop_ids:
            return []
            
        bookings = (
            query.filter(Booking.property_id.in_(provider_prop_ids))
            .order_by(desc(Booking.created_at))
            .all()
        )
    else:
        # Customer traveler sees their own bookings
        bookings = (
            query.filter(Booking.user_id == current_user.id)
            .order_by(desc(Booking.created_at))
            .all()
        )

    # Format list
    conversations = [format_conversation_item(b, current_user) for b in bookings]
    
    # Sort conversations by last message / update time descending
    conversations.sort(key=lambda x: x["last_message_time"], reverse=True)
    return conversations

# =========================================================================
# 2. CONVERSATION DETAIL & MESSAGES (TRAVELER <-> STAY PARTNER)
# =========================================================================

@router.get("/messages/conversations/{booking_id}")
@router.get("/bookings/{booking_id}/messages")
@router.get("/provider/bookings/{booking_id}/messages")
@router.get("/customer/bookings/{booking_id}/messages")
def get_booking_messages(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve full conversation history for a specific booking.
    Strictly authorized to the booking Traveler, property Stay Partner, or Admin.
    Automatically marks incoming unread messages as read.
    """
    booking = get_authorized_booking(db, booking_id, current_user)
    
    messages = (
        db.query(BookingMessage)
        .filter(BookingMessage.booking_id == booking.id)
        .order_by(BookingMessage.created_at.asc())
        .all()
    )

    # Automatically mark counterparty messages as read
    updated = False
    for m in messages:
        if m.sender_id != current_user.id and not m.is_read:
            m.is_read = True
            updated = True
    if updated:
        db.commit()

    prop = booking.property
    cover_image = get_property_cover_image(prop)
    partner_user = prop.provider.user if (prop and prop.provider) else None
    status_str = get_booking_status_string(booking)

    is_active = status_str in ["CONFIRMED", "VERIFIED", "CHECKED_IN"]
    is_closed = status_str in ["CHECKED_OUT", "COMPLETED"]

    close_reason = None
    if is_closed:
        close_reason = "Stay completed — this conversation is now closed."
    elif status_str in ["CANCELLED", "FAILED", "PENDING", "PAYMENT_PENDING"]:
        close_reason = "This booking is no longer active for direct messaging."

    room_title = booking.booking_rooms[0].room_name if booking.booking_rooms else "Sanctuary Stay"

    return {
        "booking_id": booking.id,
        "booking_number": booking.booking_number,
        "verinova_verification_id": booking.verinova_verification_id,
        "property_id": booking.property_id,
        "property_name": prop.name if prop else "Stay Sanctuary",
        "property_image": cover_image,
        "property_city": prop.city if prop else "",
        "property_address": prop.address if prop else "",
        "room_name": room_title,
        "stay_dates": f"{booking.check_in.strftime('%d %b %Y')} → {booking.check_out.strftime('%d %b %Y')}",
        "check_in": str(booking.check_in),
        "check_out": str(booking.check_out),
        "total_guests": booking.total_guests,
        "status": status_str,
        "is_messaging_allowed": is_active,
        "is_closed": is_closed,
        "close_reason": close_reason,
        "traveler_id": booking.user_id,
        "traveler_name": booking.user.name if booking.user else "Traveler",
        "stay_partner_id": partner_user.id if partner_user else None,
        "stay_partner_name": partner_user.name if partner_user else "Stay Partner",
        "messages": [serialize_message(m) for m in messages]
    }

# =========================================================================
# 3. SEND MESSAGE (WITH LIFECYCLE ENFORCEMENT & NOTIFICATIONS)
# =========================================================================

@router.post("/messages/conversations/{booking_id}/messages")
@router.post("/bookings/{booking_id}/messages")
@router.post("/provider/bookings/{booking_id}/messages")
@router.post("/customer/bookings/{booking_id}/messages")
def post_booking_message(
    booking_id: int,
    payload: BookingMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Send a message within an authorized booking conversation.
    Enforces strict booking lifecycle availability:
    - CONFIRMED, CHECKED_IN: Allowed.
    - CHECKED_OUT, COMPLETED: Blocked (Conversation closed).
    - CANCELLED, FAILED, PENDING: Blocked (Booking not in active messaging state).
    Dispatches in-app notification to counterparty.
    """
    booking = get_authorized_booking(db, booking_id, current_user)
    status_str = get_booking_status_string(booking)

    # 1. Lifecycle enforcement
    if status_str in ["CHECKED_OUT", "COMPLETED"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stay completed — this conversation is now closed."
        )

    if status_str in ["CANCELLED", "FAILED", "PENDING", "PAYMENT_PENDING"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This booking is no longer active for direct messaging."
        )

    if status_str not in ["CONFIRMED", "VERIFIED", "CHECKED_IN"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Messaging is not enabled for booking with status '{status_str}'."
        )

    # 2. Validate message text
    msg_text = payload.message.strip() if payload.message else ""
    if not msg_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message text cannot be empty."
        )

    user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    sender_role = "ADMIN" if user_role_str == "ADMIN" else ("PROVIDER" if booking.property and booking.property.provider and booking.property.provider.user_id == current_user.id else "CUSTOMER")

    # 3. Create message in PostgreSQL
    new_msg = BookingMessage(
        booking_id=booking.id,
        sender_id=current_user.id,
        sender_role=sender_role,
        sender_name=current_user.name or "Voyara Member",
        message=msg_text,
        is_read=False,
        created_at=datetime.utcnow()
    )
    db.add(new_msg)
    db.flush()

    # 4. Dispatch in-app notification to counterparty
    partner_user = booking.property.provider.user if (booking.property and booking.property.provider) else None
    
    if sender_role == "CUSTOMER":
        # Notify Stay Partner
        if partner_user:
            try:
                preview = (msg_text[:90] + "...") if len(msg_text) > 90 else msg_text
                NotificationService.create_notification(
                    db=db,
                    user_id=partner_user.id,
                    title="New message from a Traveler",
                    message=f"{current_user.name}: \"{preview}\" ({booking.property.name}, Booking {booking.booking_number})",
                    type="BOOKING_MESSAGE",
                    link=f"/provider/messages?booking_id={booking.id}",
                    booking_id=booking.id
                )
            except Exception as e:
                print("Error dispatching booking message notification to host:", e)
    elif sender_role in ["PROVIDER", "ADMIN"]:
        # Notify Traveler
        try:
            preview = (msg_text[:90] + "...") if len(msg_text) > 90 else msg_text
            NotificationService.create_notification(
                db=db,
                user_id=booking.user_id,
                title="New message from your Stay Partner",
                message=f"{current_user.name}: \"{preview}\" ({booking.property.name}, Booking {booking.booking_number})",
                type="BOOKING_MESSAGE",
                link=f"/customer/messages?booking_id={booking.id}",
                booking_id=booking.id
            )
        except Exception as e:
            print("Error dispatching booking message notification to traveler:", e)

    db.commit()
    db.refresh(new_msg)
    return serialize_message(new_msg)

# =========================================================================
# 4. MARK CONVERSATION AS READ
# =========================================================================

@router.post("/messages/conversations/{booking_id}/read")
@router.post("/bookings/{booking_id}/messages/read")
def mark_conversation_read(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Explicitly mark all counterparty messages in this booking conversation as read.
    """
    booking = get_authorized_booking(db, booking_id, current_user)
    
    updated_count = (
        db.query(BookingMessage)
        .filter(
            BookingMessage.booking_id == booking.id,
            BookingMessage.sender_id != current_user.id,
            BookingMessage.is_read.is_(False)
        )
        .update({"is_read": True}, synchronize_session=False)
    )
    db.commit()
    return {"success": True, "read_count": updated_count, "marked_read": updated_count}

# =========================================================================
# 5. OVERALL UNREAD MESSAGES COUNT
# =========================================================================

@router.get("/messages/unread-count")
@router.get("/customer/messages/unread-count")
@router.get("/provider/messages/unread-count")
def get_total_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get total count of unread booking messages for the current user.
    """
    user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    
    if user_role_str == "PROVIDER":
        provider_prof = db.query(ProviderProfile).filter(ProviderProfile.user_id == current_user.id).first()
        if not provider_prof:
            return {"unread_count": 0}
            
        provider_prop_ids = [p.id for p in db.query(Property.id).filter(Property.provider_id == provider_prof.id).all()]
        if not provider_prop_ids:
            return {"unread_count": 0}
            
        count = (
            db.query(func.count(BookingMessage.id))
            .join(Booking, Booking.id == BookingMessage.booking_id)
            .filter(
                Booking.property_id.in_(provider_prop_ids),
                BookingMessage.sender_id != current_user.id,
                BookingMessage.is_read == False
            )
            .scalar() or 0
        )
    elif user_role_str == "CUSTOMER":
        count = (
            db.query(func.count(BookingMessage.id))
            .join(Booking, Booking.id == BookingMessage.booking_id)
            .filter(
                Booking.user_id == current_user.id,
                BookingMessage.sender_id != current_user.id,
                BookingMessage.is_read == False
            )
            .scalar() or 0
        )
    else:
        count = 0

    return {"unread_count": count}

# =========================================================================
# 6. AUTOMATIC BOOKING STAY INFORMATION DELIVERY
# =========================================================================

@router.get("/bookings/{booking_id}/stay-information")
@router.get("/customer/bookings/{booking_id}/stay-information")
def get_stay_information(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve full, immutable Stay Information snapshot for a confirmed booking.
    Contains real PostgreSQL property coordinates, address, rules snapshot, room specs, child policy, and host messages.
    """
    booking = get_authorized_booking(db, booking_id, current_user)
    prop = booking.property

    # Extract Home Rules from Snapshot (or fallback to live property rules if not yet snapshotted)
    rules_snapshot = {}
    if booking.rule_snapshot and booking.rule_snapshot.property_rules_snapshot:
        rules_snapshot = booking.rule_snapshot.property_rules_snapshot
    elif prop and prop.home_rules:
        from app.services.ai.stayguide_service import StayGuideService
        rules_snapshot = StayGuideService.serialize_property_rules(prop.home_rules)

    # Extract Room Details
    booked_room_item = booking.booking_rooms[0] if booking.booking_rooms else None
    room_record = booked_room_item.room if booked_room_item else None
    
    room_rules_snap = {}
    if booking.rule_snapshot and booking.rule_snapshot.room_rules_snapshot:
        room_rules_snap = booking.rule_snapshot.room_rules_snapshot
    elif room_record and room_record.rules:
        from app.services.ai.stayguide_service import StayGuideService
        room_rules_snap = StayGuideService.serialize_room_rules(room_record.rules, room_record)

    room_amenities = []
    if room_record and room_record.amenities:
        room_amenities = [a.amenity_name for a in room_record.amenities]

    # Extract Experience details if booked
    exp_details = None
    if booking.booking_experiences:
        exp_item = booking.booking_experiences[0]
        exp_details = {
            "title": exp_item.experience_title,
            "scheduled_date": str(exp_item.scheduled_date),
            "participants": exp_item.participants,
            "price": exp_item.price,
            "pricing_model": exp_item.pricing_model,
            "subtotal": exp_item.subtotal
        }

    # Extract Google Maps Coordinates
    lat = prop.latitude if prop else None
    lng = prop.longitude if prop else None
    map_url = f"https://www.google.com/maps?q={lat},{lng}" if (lat and lng) else None

    # Host Message
    host_msg = booking.guest_information_message_snapshot
    if not host_msg and prop and prop.guest_information_message:
        host_msg = prop.guest_information_message
    if not host_msg:
        host_msg = "No additional instructions were provided by the Stay Partner."

    # Host Contact
    partner_user = prop.provider.user if (prop and prop.provider) else None

    return {
        "booking_id": booking.id,
        "booking_number": booking.booking_number,
        "status": get_booking_status_string(booking),
        "check_in": str(booking.check_in),
        "check_out": str(booking.check_out),
        "total_nights": booking.total_nights,
        "total_guests": booking.total_guests,
        "adults": booking.adults,
        "children": booking.children,
        "child_ages": booking.child_ages or [],
        "cot_count": booking.cot_count,
        "extra_bed_count": booking.extra_bed_count,
        "total_amount": booking.original_total_amount or booking.total_amount,
        "created_at": booking.created_at,

        # Property Information
        "property": {
            "id": prop.id if prop else None,
            "name": prop.name if prop else "Stay Sanctuary",
            "property_type": prop.property_type if prop else "Resort",
            "image": prop.images[0].image_url if (prop and prop.images) else None,
            "images": [i.image_url for i in prop.images] if (prop and prop.images) else [],
            "address": prop.address if prop else "",
            "locality": prop.location_details or "",
            "city": prop.city if prop else "",
            "state": prop.state if prop else "",
            "country": prop.country if prop else "India",
            "pincode": "",
            "latitude": lat,
            "longitude": lng,
            "map_url": map_url,
            "contact_phone": prop.contact_phone if prop else "",
            "contact_email": prop.contact_email if prop else "",
            "check_in_time": prop.check_in_time if prop else "14:00",
            "check_out_time": prop.check_out_time if prop else "11:00",
            "host_name": partner_user.name if partner_user else "Stay Partner",
        },

        # Booked Room Information
        "room": {
            "id": booked_room_item.room_id if booked_room_item else None,
            "name": booked_room_item.room_name if booked_room_item else (room_record.name if room_record else "Standard Room"),
            "room_type": room_record.room_type if room_record else "Standard Room",
            "capacity": room_record.capacity if room_record else 2,
            "quantity": booked_room_item.quantity if booked_room_item else 1,
            "nightly_price": booked_room_item.nightly_price if booked_room_item else 0.0,
            "subtotal": booked_room_item.subtotal if booked_room_item else 0.0,
            "amenities": room_amenities,
            "rules": room_rules_snap
        },

        # Home Rules Snapshot
        "home_rules": rules_snapshot,
        "property_rules": rules_snapshot,

        # Host Message Snapshot
        "host_message": host_msg,
        "guest_information_message": host_msg,
        "property_name": prop.name if prop else "Stay Sanctuary",

        # Cancellation Policy Snapshot
        "cancellation_policy": booking.cancellation_policy_snapshot or "Standard Voyara cancellation policy applies.",

        # Experience Details (if booked)
        "experience": exp_details,
    }
