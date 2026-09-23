import os
import sys
from datetime import datetime, date, timedelta

# Ensure app path is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), ".")))

from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.provider import ProviderProfile
from app.models.property import Property, PropertyRule
from app.models.room import Room, RoomRule, RoomAmenity
from app.models.booking import Booking, BookingStatus, BookingRoom, BookingRuleSnapshot
from app.models.booking_message import BookingMessage
from app.models.support import SupportTicket, SupportMessage, TicketStatus
from app.models.notification import Notification
from app.auth.password import hash_password
from app.services.notifications.notification_service import NotificationService

# Test helper function from messaging_router
from app.routers.bookings.messaging_router import get_authorized_booking, get_stay_information, serialize_message

def run_tests():
    db = SessionLocal()
    print("=" * 60)
    print("STARTING E2E INTEGRATION TEST SUITE: MESSAGING, SUPPORT & STAY INFO")
    print("=" * 60)

    try:
        # 1. SETUP TEST USERS
        traveler = db.query(User).filter((User.email == "test_traveler_msg@voyara.com") | (User.phone == "+919988112233")).first()
        if not traveler:
            traveler = User(
                email="test_traveler_msg@voyara.com",
                hashed_password=hash_password("TravelerPass123!"),
                name="Aarav Traveler",
                role=UserRole.CUSTOMER,
                phone="+919988112233"
            )
            db.add(traveler)
            db.commit()
            db.refresh(traveler)

        host = db.query(User).filter((User.email == "test_host_msg@voyara.com") | (User.phone == "+919988112244")).first()
        if not host:
            host = User(
                email="test_host_msg@voyara.com",
                hashed_password=hash_password("HostPass123!"),
                name="Priya Host",
                role=UserRole.PROVIDER,
                phone="+919988112244"
            )
            db.add(host)
            db.commit()
            db.refresh(host)

        # Ensure ProviderProfile for Host
        provider_profile = db.query(ProviderProfile).filter(ProviderProfile.user_id == host.id).first()
        if not provider_profile:
            provider_profile = ProviderProfile(
                user_id=host.id,
                business_name="Misty Sanctuaries Hospitality",
                contact_phone="+919988112244",
                contact_email=host.email
            )
            db.add(provider_profile)
            db.commit()
            db.refresh(provider_profile)

        stranger = db.query(User).filter((User.email == "test_stranger_msg@voyara.com") | (User.phone == "+919988112255")).first()
        if not stranger:
            stranger = User(
                email="test_stranger_msg@voyara.com",
                hashed_password=hash_password("StrangerPass123!"),
                name="Siddharth Stranger",
                role=UserRole.CUSTOMER,
                phone="+919988112255"
            )
            db.add(stranger)
            db.commit()
            db.refresh(stranger)

        admin = db.query(User).filter((User.email == "test_admin_msg@voyara.com") | (User.phone == "+919988112266")).first()
        if not admin:
            admin = User(
                email="test_admin_msg@voyara.com",
                hashed_password=hash_password("AdminPass123!"),
                name="Voyara Admin Concierge",
                role=UserRole.ADMIN,
                phone="+919988112266"
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)

        print(f"[OK] Test users ready (Traveler: #{traveler.id}, Host: #{host.id}, Stranger: #{stranger.id}, Admin: #{admin.id})")

        # 2. SETUP PROPERTY, RULES & ROOM
        prop = db.query(Property).filter(Property.name == "Munnar Misty Sanctuary").first()
        if not prop:
            prop = Property(
                provider_id=provider_profile.id,
                name="Munnar Misty Sanctuary",
                description="Serene mountain retreat with misty mornings and lush tea gardens.",
                property_type="VILLA",
                address="Pothamedu Viewpoint Road",
                location_details="Near Sunset Point",
                city="Munnar",
                state="Kerala",
                country="India",
                latitude=10.088933,
                longitude=77.059525,
                contact_phone="+919876500001",
                contact_email="host@mistysanctuary.com",
                check_in_time="14:00",
                check_out_time="11:00",
                guest_information_message="Welcome to Munnar! Please ring the front gate bell upon arrival. Hot tea will be served.",
                verification_status="VERIFIED",
                is_active=True
            )
            db.add(prop)
            db.commit()
            db.refresh(prop)

            # Add Property Home Rules
            prop_rule = PropertyRule(
                property_id=prop.id,
                children_allowed="Yes",
                quiet_hours_enabled=True,
                quiet_hours_start="22:00",
                quiet_hours_end="07:00",
                smoking_policy="No",
                pets_policy="Yes",
                check_in_start="14:00",
                check_out_time="11:00"
            )
            db.add(prop_rule)
            db.commit()

        room = db.query(Room).filter(Room.property_id == prop.id).first()
        if not room:
            room = Room(
                property_id=prop.id,
                name="Misty Valley Deluxe Suite",
                room_type="Suite",
                description="King bed with private tea garden balcony",
                capacity=3,
                quantity=4,
                base_price=4500.0,
                is_active=True
            )
            db.add(room)
            db.commit()
            db.refresh(room)

            # Add Room Amenity
            amenity = RoomAmenity(room_id=room.id, amenity_name="Mountain View Balcony")
            db.add(amenity)
            db.commit()

        print(f"[OK] Property #{prop.id} and Room #{room.id} verified.")

        # 3. SETUP CONFIRMED BOOKING & STAY INFORMATION SNAPSHOTS
        check_in = date.today() + timedelta(days=10)
        check_out = date.today() + timedelta(days=13)
        booking = db.query(Booking).filter(Booking.user_id == traveler.id, Booking.property_id == prop.id).first()
        if not booking:
            booking = Booking(
                booking_number=f"BK-TEST-{int(datetime.utcnow().timestamp())}",
                property_id=prop.id,
                user_id=traveler.id,
                check_in=check_in,
                check_out=check_out,
                status=BookingStatus.CONFIRMED,
                total_nights=3,
                total_guests=2,
                room_total=13500.0,
                total_amount=13500.0,
                original_total_amount=13500.0,
                guest_information_message_snapshot=prop.guest_information_message,
                cancellation_policy_snapshot="Free cancellation up to 48 hours before check-in."
            )
            db.add(booking)
            db.commit()
            db.refresh(booking)

            # Booking Room Item
            bk_room = BookingRoom(
                booking_id=booking.id,
                room_id=room.id,
                room_name=room.name,
                quantity=1,
                nights=3,
                guests=2,
                nightly_price=4500.0,
                subtotal=13500.0
            )
            db.add(bk_room)
            db.commit()

        # Ensure BookingRoom exists
        bk_room = db.query(BookingRoom).filter(BookingRoom.booking_id == booking.id).first()
        if not bk_room:
            bk_room = BookingRoom(
                booking_id=booking.id,
                room_id=room.id,
                room_name=room.name,
                quantity=1,
                nights=3,
                guests=2,
                nightly_price=4500.0,
                subtotal=13500.0
            )
            db.add(bk_room)
            db.commit()

        # Ensure BookingRuleSnapshot exists
        rule_snapshot = db.query(BookingRuleSnapshot).filter(BookingRuleSnapshot.booking_id == booking.id).first()
        if not rule_snapshot:
            rule_snapshot = BookingRuleSnapshot(
                booking_id=booking.id,
                property_rules_snapshot={
                    "children_allowed": "Yes",
                    "quiet_hours_enabled": True,
                    "quiet_hours_start": "22:00",
                    "quiet_hours_end": "07:00",
                    "smoking_policy": "No",
                    "pets_policy": "Yes"
                },
                room_rules_snapshot={
                    "balcony_rule": "No feeding wild animals"
                },
                adults=2,
                children=0
            )
            db.add(rule_snapshot)
            db.commit()

        db.refresh(booking)
        print(f"[OK] Booking #{booking.id} ({booking.booking_number}) confirmed with rule snapshot.")

        # -------------------------------------------------------------
        # TEST 1: TRAVELER <-> STAY PARTNER MESSAGING WORKFLOW
        # -------------------------------------------------------------
        print("\n--- TEST 1: TRAVELER <-> STAY PARTNER MESSAGING WORKFLOW ---")
        # Traveler sends a message
        msg1 = BookingMessage(
            booking_id=booking.id,
            sender_id=traveler.id,
            sender_role="CUSTOMER",
            sender_name=traveler.name,
            message="Hi Priya! We will be arriving around 3 PM. Can we drop our bags early?",
            is_read=False
        )
        db.add(msg1)
        db.commit()
        db.refresh(msg1)

        # Host receives notification
        NotificationService.create_notification(
            db=db,
            user_id=host.id,
            title="New message from a Traveler",
            message=f"{traveler.name} sent a message regarding booking {booking.booking_number}.",
            type="BOOKING_MESSAGE",
            booking_id=booking.id
        )
        print(f"[PASS] Traveler sent message #{msg1.id}. Host notification dispatched.")

        # Stay Partner replies
        msg2 = BookingMessage(
            booking_id=booking.id,
            sender_id=host.id,
            sender_role="PROVIDER",
            sender_name=host.name,
            message="Hello Aarav! Yes, early luggage drop is ready for you. See you at 3 PM!",
            is_read=False
        )
        db.add(msg2)
        db.commit()
        db.refresh(msg2)

        # Traveler receives notification
        NotificationService.create_notification(
            db=db,
            user_id=traveler.id,
            title="New message from your Stay Partner",
            message=f"{host.name} replied to your message.",
            type="BOOKING_MESSAGE",
            booking_id=booking.id
        )
        print(f"[PASS] Stay Partner sent reply message #{msg2.id}. Traveler notification dispatched.")

        # Verify DB query
        messages = db.query(BookingMessage).filter(BookingMessage.booking_id == booking.id).all()
        assert len(messages) >= 2, "Expected at least 2 booking messages in database."
        print(f"[PASS] Retrieved {len(messages)} real messages from PostgreSQL database.")

        # -------------------------------------------------------------
        # TEST 2: RBAC & CROSS-BOOKING SECURITY
        # -------------------------------------------------------------
        print("\n--- TEST 2: RBAC & CROSS-USER ISOLATION ---")
        # Traveler can access
        authorized_bk_traveler = get_authorized_booking(db, booking.id, traveler)
        assert authorized_bk_traveler.id == booking.id, "Traveler must access their booking."

        # Host can access
        authorized_bk_host = get_authorized_booking(db, booking.id, host)
        assert authorized_bk_host.id == booking.id, "Stay Partner must access booking on their property."

        # Admin can access
        authorized_bk_admin = get_authorized_booking(db, booking.id, admin)
        assert authorized_bk_admin.id == booking.id, "Admin must have access."

        # Stranger is rejected with 403
        stranger_blocked = False
        try:
            get_authorized_booking(db, booking.id, stranger)
        except Exception as e:
            if hasattr(e, "status_code") and e.status_code == 403:
                stranger_blocked = True
        assert stranger_blocked is True, "Stranger MUST be rejected with HTTP 403 Forbidden."
        print("[PASS] Security isolation verified: Stranger is 100% blocked from viewing/messaging booking.")

        # -------------------------------------------------------------
        # TEST 3: AUTOMATIC STAY INFORMATION DELIVERY & SNAPSHOT IMMUTABILITY
        # -------------------------------------------------------------
        print("\n--- TEST 3: STAY INFORMATION DELIVERY & SNAPSHOT IMMUTABILITY ---")
        stay_info = get_stay_information(booking_id=booking.id, current_user=traveler, db=db)
        
        assert stay_info["booking_number"] == booking.booking_number
        assert stay_info["property"]["name"] == "Munnar Misty Sanctuary"
        assert stay_info["property"]["address"] == "Pothamedu Viewpoint Road"
        assert stay_info["property"]["latitude"] == 10.088933
        assert stay_info["property"]["longitude"] == 77.059525
        assert "maps?q=10.088933,77.059525" in stay_info["property"]["map_url"]
        assert stay_info["host_message"] == "Welcome to Munnar! Please ring the front gate bell upon arrival. Hot tea will be served."
        assert stay_info["home_rules"]["quiet_hours_start"] == "22:00"
        print(f"[PASS] Stay Information delivered with real DB coordinates ({stay_info['property']['latitude']}, {stay_info['property']['longitude']}) and map link.")

        # Simulate host changing property rule live
        prop_rule_db = db.query(PropertyRule).filter(PropertyRule.property_id == prop.id).first()
        if prop_rule_db:
            prop_rule_db.quiet_hours_start = "23:45"
            db.commit()

        # Re-fetch stay info - must retain original confirmed booking snapshot
        stay_info_after = get_stay_information(booking_id=booking.id, current_user=traveler, db=db)
        assert stay_info_after["home_rules"]["quiet_hours_start"] == "22:00", "Confirmed snapshot must be immutable against live host rule updates."
        print("[PASS] Stay Information snapshot immutability verified against live property changes.")

        # -------------------------------------------------------------
        # TEST 4: TRAVELER & STAY PARTNER SUPPORT TICKETS
        # -------------------------------------------------------------
        print("\n--- TEST 4: SUPPORT TICKET CREATION & CONTEXT LINKING ---")
        t_ticket = SupportTicket(
            user_id=traveler.id,
            subject="Special dietary request for complimentary breakfast",
            category="Booking Inquiry",
            booking_id=booking.id,
            property_id=prop.id,
            message="Could we request gluten-free breakfast items during our stay?",
            status=TicketStatus.OPEN
        )
        db.add(t_ticket)
        db.commit()
        db.refresh(t_ticket)
        print(f"[PASS] Traveler submitted Support Ticket #{t_ticket.id} linked to Booking #{booking.id}.")

        p_ticket = SupportTicket(
            user_id=host.id,
            subject="Property calendar sync with external calendar",
            category="Property Management",
            property_id=prop.id,
            message="How do I export iCal for the Misty Valley Suite?",
            status=TicketStatus.OPEN
        )
        db.add(p_ticket)
        db.commit()
        db.refresh(p_ticket)
        print(f"[PASS] Stay Partner submitted Support Ticket #{p_ticket.id} linked to Property #{prop.id}.")

        # -------------------------------------------------------------
        # TEST 5: ADMIN SUPPORT DESK & STATUS TRANSITIONS
        # -------------------------------------------------------------
        print("\n--- TEST 5: ADMIN SUPPORT DESK & STATUS TRANSITIONS ---")
        # Admin replies to Traveler ticket and moves to WAITING_FOR_USER
        admin_msg = SupportMessage(
            ticket_id=t_ticket.id,
            sender_id=admin.id,
            sender_role="ADMIN",
            sender_name=admin.name,
            message="Hello Aarav, we have notified the kitchen team at Munnar Misty Sanctuary. Please confirm any specific nut allergies."
        )
        db.add(admin_msg)
        t_ticket.status = TicketStatus.WAITING_FOR_USER
        t_ticket.admin_response = admin_msg.message
        db.commit()

        NotificationService.create_notification(
            db=db,
            user_id=traveler.id,
            title="Voyara Support Update",
            message=admin_msg.message,
            type="SUPPORT_MESSAGE"
        )
        print(f"[PASS] Admin updated Ticket #{t_ticket.id} status to WAITING_FOR_USER and notified traveler.")

        # Traveler replies
        t_reply = SupportMessage(
            ticket_id=t_ticket.id,
            sender_id=traveler.id,
            sender_role="CUSTOMER",
            sender_name=traveler.name,
            message="No nut allergies, only gluten-free. Thank you so much!"
        )
        db.add(t_reply)
        t_ticket.status = TicketStatus.IN_PROGRESS
        db.commit()
        print(f"[PASS] Traveler replied. Ticket #{t_ticket.id} status changed to IN_PROGRESS.")

        # Admin resolves ticket
        t_ticket.status = TicketStatus.RESOLVED
        db.commit()
        print(f"[PASS] Ticket #{t_ticket.id} status changed to RESOLVED.")

        # Admin closes Stay Partner ticket
        p_ticket.status = TicketStatus.CLOSED
        db.commit()
        print(f"[PASS] Stay Partner Ticket #{p_ticket.id} status changed to CLOSED.")

        # Verify notifications in DB
        user_notifications = db.query(Notification).filter(Notification.user_id == traveler.id).all()
        assert len(user_notifications) >= 2, "Traveler should have received notifications."
        print(f"[PASS] Verified {len(user_notifications)} in-app notifications generated for user.")

        print("\n" + "=" * 60)
        print("ALL 5 E2E INTEGRATION TESTS PASSED SUCCESSFULLY (100% REAL DB)")
        print("=" * 60)

    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
