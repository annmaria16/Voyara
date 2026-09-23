import os
import sys
from datetime import datetime, date, timedelta

# Ensure app path is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), ".")))

from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.provider import ProviderProfile
from app.models.property import Property, PropertyRule, PropertyImage
from app.models.room import Room, RoomRule, RoomAmenity
from app.models.booking import Booking, BookingStatus, BookingRoom
from app.models.booking_message import BookingMessage
from app.models.notification import Notification
from app.auth.jwt import create_access_token
from app.auth.password import hash_password

client = TestClient(app)

def run_tests():
    db = SessionLocal()
    print("=" * 70)
    print("STARTING COMPREHENSIVE E2E TEST SUITE: BOOKING-LINKED MESSAGING")
    print("=" * 70)

    try:
        # 1. SETUP TEST USERS
        # Traveler 1
        traveler1 = db.query(User).filter(User.email == "e2e_traveler1@voyara.com").first()
        if not traveler1:
            traveler1 = User(
                email="e2e_traveler1@voyara.com",
                hashed_password=hash_password("Pass123!"),
                name="Ananya Sharma",
                role=UserRole.CUSTOMER,
                phone="+919811111111"
            )
            db.add(traveler1)
            db.commit()
            db.refresh(traveler1)

        # Traveler 2 (Stranger)
        traveler2 = db.query(User).filter(User.email == "e2e_traveler2@voyara.com").first()
        if not traveler2:
            traveler2 = User(
                email="e2e_traveler2@voyara.com",
                hashed_password=hash_password("Pass123!"),
                name="Rohan Verma",
                role=UserRole.CUSTOMER,
                phone="+919822222222"
            )
            db.add(traveler2)
            db.commit()
            db.refresh(traveler2)

        # Stay Partner 1 (Provider)
        provider1_user = db.query(User).filter(User.email == "e2e_partner1@voyara.com").first()
        if not provider1_user:
            provider1_user = User(
                email="e2e_partner1@voyara.com",
                hashed_password=hash_password("Pass123!"),
                name="Vikram Nair",
                role=UserRole.PROVIDER,
                phone="+919833333333"
            )
            db.add(provider1_user)
            db.commit()
            db.refresh(provider1_user)

        profile1 = db.query(ProviderProfile).filter(ProviderProfile.user_id == provider1_user.id).first()
        if not profile1:
            profile1 = ProviderProfile(
                user_id=provider1_user.id,
                business_name="Kerala Serenity Escapes",
                contact_phone="+919833333333",
                contact_email=provider1_user.email
            )
            db.add(profile1)
            db.commit()
            db.refresh(profile1)

        # Stay Partner 2 (Other Provider)
        provider2_user = db.query(User).filter(User.email == "e2e_partner2@voyara.com").first()
        if not provider2_user:
            provider2_user = User(
                email="e2e_partner2@voyara.com",
                hashed_password=hash_password("Pass123!"),
                name="Sunita Rao",
                role=UserRole.PROVIDER,
                phone="+919844444444"
            )
            db.add(provider2_user)
            db.commit()
            db.refresh(provider2_user)

        profile2 = db.query(ProviderProfile).filter(ProviderProfile.user_id == provider2_user.id).first()
        if not profile2:
            profile2 = ProviderProfile(
                user_id=provider2_user.id,
                business_name="Goa Breeze Hideaways",
                contact_phone="+919844444444",
                contact_email=provider2_user.email
            )
            db.add(profile2)
            db.commit()
            db.refresh(profile2)

        # Generate JWT Auth Headers
        token_t1 = create_access_token({"sub": str(traveler1.id), "role": "CUSTOMER"})
        headers_t1 = {"Authorization": f"Bearer {token_t1}"}

        token_t2 = create_access_token({"sub": str(traveler2.id), "role": "CUSTOMER"})
        headers_t2 = {"Authorization": f"Bearer {token_t2}"}

        token_p1 = create_access_token({"sub": str(provider1_user.id), "role": "PROVIDER"})
        headers_p1 = {"Authorization": f"Bearer {token_p1}"}

        token_p2 = create_access_token({"sub": str(provider2_user.id), "role": "PROVIDER"})
        headers_p2 = {"Authorization": f"Bearer {token_p2}"}

        print("[OK] Test users, profiles, and auth headers initialized.")

        # 2. SETUP PROPERTIES & ROOMS
        prop1 = db.query(Property).filter(Property.name == "Munnar Tea Hills Villa").first()
        if not prop1:
            prop1 = Property(
                provider_id=profile1.id,
                name="Munnar Tea Hills Villa",
                description="Lush greenery and panoramic tea estate views.",
                property_type="VILLA",
                address="Cliff View Road",
                location_details="Top Station Hill",
                city="Munnar",
                state="Kerala",
                country="India",
                latitude=10.0889,
                longitude=77.0595,
                contact_phone="+919833333333",
                contact_email="munnar@voyara.com",
                check_in_time="14:00",
                check_out_time="11:00",
                guest_information_message="Welcome! Key lockbox code is 4321.",
                verification_status="VERIFIED",
                is_active=True
            )
            db.add(prop1)
            db.commit()
            db.refresh(prop1)

            # Add primary image
            img1 = PropertyImage(
                property_id=prop1.id,
                image_url="/uploads/properties/munnar_estate_main.jpg",
                is_primary=True
            )
            db.add(img1)

            prop1_rule = PropertyRule(
                property_id=prop1.id,
                children_allowed="Yes",
                quiet_hours_enabled=True,
                quiet_hours_start="22:00",
                quiet_hours_end="07:00",
                smoking_policy="No",
                pets_policy="Yes",
                check_in_start="14:00",
                check_out_time="11:00"
            )
            db.add(prop1_rule)
            db.commit()

        room1 = db.query(Room).filter(Room.property_id == prop1.id).first()
        if not room1:
            room1 = Room(
                property_id=prop1.id,
                name="Panoramic Tea View Suite",
                room_type="DELUXE_SUITE",
                description="Spacious suite with tea plantation view",
                capacity=3,
                quantity=5,
                base_price=4500.0,
                is_active=True
            )
            db.add(room1)
            db.commit()
            db.refresh(room1)

            amenity = RoomAmenity(
                room_id=room1.id,
                amenity_name="WiFi"
            )
            db.add(amenity)
            db.commit()

        # Property 2 (Provider 2)
        prop2 = db.query(Property).filter(Property.name == "Goa Sunset Beach Bungalow").first()
        if not prop2:
            prop2 = Property(
                provider_id=profile2.id,
                name="Goa Sunset Beach Bungalow",
                description="Direct beach access and sea breeze.",
                property_type="RESORT",
                address="Calangute Coastal Way",
                city="Goa",
                state="Goa",
                country="India",
                latitude=15.5494,
                longitude=73.7535,
                contact_phone="+919844444444",
                contact_email="goa@voyara.com",
                verification_status="VERIFIED",
                is_active=True
            )
            db.add(prop2)
            db.commit()
            db.refresh(prop2)

        print(f"[OK] Properties ready (Prop1: #{prop1.id} '{prop1.name}', Prop2: #{prop2.id} '{prop2.name}')")

        # 3. SETUP BOOKINGS IN DIFFERENT LIFECYCLE STATES
        today = date.today()

        # Helper to get or create booking
        def get_or_create_booking(booking_number, user_id, prop_id, room_obj, status, in_days, out_days):
            b = db.query(Booking).filter(Booking.booking_number == booking_number).first()
            if not b:
                b = Booking(
                    booking_number=booking_number,
                    user_id=user_id,
                    property_id=prop_id,
                    check_in=today + timedelta(days=in_days),
                    check_out=today + timedelta(days=out_days),
                    total_nights=max(1, out_days - in_days),
                    total_guests=2,
                    room_total=9000.0,
                    total_amount=9000.0,
                    status=status
                )
                db.add(b)
                db.commit()
                db.refresh(b)

                br = BookingRoom(
                    booking_id=b.id,
                    room_id=room_obj.id,
                    room_name=room_obj.name,
                    nightly_price=room_obj.base_price,
                    nights=max(1, out_days - in_days),
                    quantity=1,
                    guests=2,
                    subtotal=9000.0
                )
                db.add(br)
                db.commit()
            else:
                b.status = status
                db.commit()
            return b

        # Booking A: CONFIRMED (Active)
        booking_confirmed = get_or_create_booking("VOY-CONF-E2E01", traveler1.id, prop1.id, room1, BookingStatus.CONFIRMED, 2, 4)
        # Booking B: CHECKED_IN (Active)
        booking_checked_in = get_or_create_booking("VOY-CKIN-E2E02", traveler1.id, prop1.id, room1, BookingStatus.CHECKED_IN, 0, 2)
        # Booking C: COMPLETED (Closed)
        booking_completed = get_or_create_booking("VOY-CMPL-E2E03", traveler1.id, prop1.id, room1, BookingStatus.COMPLETED, -5, -2)
        # Booking D: CANCELLED (Disabled)
        booking_cancelled = get_or_create_booking("VOY-CNCL-E2E04", traveler1.id, prop1.id, room1, BookingStatus.CANCELLED, 10, 12)
        # Booking E: PENDING (Disabled)
        booking_pending = get_or_create_booking("VOY-PEND-E2E05", traveler1.id, prop1.id, room1, BookingStatus.PENDING, 15, 17)

        print("[OK] Test bookings initialized with varying lifecycle states.")

        # 4. TEST CASE 1: Traveler conversations list
        res = client.get("/api/messages/conversations", headers=headers_t1)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        convs = res.json()
        assert isinstance(convs, list), "Expected list of conversations"
        conv_ids = [c["booking_id"] for c in convs]
        assert booking_confirmed.id in conv_ids, "CONFIRMED booking should be in conversation list"
        assert booking_checked_in.id in conv_ids, "CHECKED_IN booking should be in conversation list"
        assert booking_completed.id in conv_ids, "COMPLETED booking should be in conversation list (read-only)"
        assert booking_cancelled.id not in conv_ids, "CANCELLED booking should NOT be in active list"
        assert booking_pending.id not in conv_ids, "PENDING booking should NOT be in active list"

        # Verify conversation structure
        c_conf = next(c for c in convs if c["booking_id"] == booking_confirmed.id)
        assert c_conf["property_name"] == "Munnar Tea Hills Villa"
        assert c_conf["property_city"] == "Munnar"
        assert c_conf["property_cover_image"] == "/uploads/properties/munnar_estate_main.jpg"
        assert c_conf["can_send_messages"] == True
        assert c_conf["is_closed"] == False
        print("[TEST 1 PASSED] Traveler conversation list retrieved and validated.")

        # 5. TEST CASE 2: Provider conversations list
        res = client.get("/api/messages/conversations", headers=headers_p1)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        p_convs = res.json()
        p_booking_ids = [c["booking_id"] for c in p_convs]
        assert booking_confirmed.id in p_booking_ids
        assert booking_checked_in.id in p_booking_ids
        # Other provider should see 0 conversations
        res_p2 = client.get("/api/messages/conversations", headers=headers_p2)
        assert res_p2.status_code == 200
        assert len(res_p2.json()) == 0, "Provider 2 should not see Provider 1's conversations"
        print("[TEST 2 PASSED] Provider conversation list isolated per property ownership.")

        # 6. TEST CASE 3: Traveler sends message to Stay Partner on CONFIRMED booking
        msg_payload = {"message": "Hello! What is the earliest check-in time we can arrive?"}
        res = client.post(f"/api/messages/conversations/{booking_confirmed.id}/messages", json=msg_payload, headers=headers_t1)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        sent_msg = res.json()
        assert sent_msg["message"] == msg_payload["message"]
        assert sent_msg["sender_role"] == "CUSTOMER"
        assert sent_msg["is_read"] == False

        # Verify in-app notification sent to Provider
        notif = db.query(Notification).filter(
            Notification.user_id == provider1_user.id,
            Notification.type == "BOOKING_MESSAGE"
        ).order_by(Notification.id.desc()).first()
        assert notif is not None, "Notification should be generated for Stay Partner"
        assert f"booking_id={booking_confirmed.id}" in notif.link
        print("[TEST 3 PASSED] Traveler message to Stay Partner succeeded & notification created.")

        # 7. TEST CASE 4: Stay Partner replies to Traveler on CONFIRMED booking
        reply_payload = {"message": "Hello Ananya! Early check-in at 12:30 PM is available. Looking forward to hosting you!"}
        res = client.post(f"/api/messages/conversations/{booking_confirmed.id}/messages", json=reply_payload, headers=headers_p1)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        reply_msg = res.json()
        assert reply_msg["sender_role"] == "PROVIDER"

        # Verify in-app notification sent to Traveler
        notif_t = db.query(Notification).filter(
            Notification.user_id == traveler1.id,
            Notification.type == "BOOKING_MESSAGE"
        ).order_by(Notification.id.desc()).first()
        assert notif_t is not None, "Notification should be generated for Traveler"
        assert f"/customer/messages?booking_id={booking_confirmed.id}" in notif_t.link
        print("[TEST 4 PASSED] Stay Partner reply succeeded & traveler notification created.")

        # 8. TEST CASE 5: Messaging on CHECKED_IN booking works
        ckin_msg = {"message": "Hi, we have arrived and everything is wonderful!"}
        res = client.post(f"/api/messages/conversations/{booking_checked_in.id}/messages", json=ckin_msg, headers=headers_t1)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        print("[TEST 5 PASSED] Messaging on CHECKED_IN booking succeeded.")

        # 9. TEST CASE 6: Messaging on COMPLETED / CHECKED_OUT booking is blocked (Read-Only)
        res_comp = client.post(f"/api/messages/conversations/{booking_completed.id}/messages", json={"message": "Can I message after checkout?"}, headers=headers_t1)
        assert res_comp.status_code == 400, f"Expected 400 for COMPLETED, got {res_comp.status_code}"
        assert "Stay completed — this conversation is now closed." in res_comp.json()["detail"]
        print("[TEST 6 PASSED] Messaging on COMPLETED booking is properly blocked with closure message.")

        # 10. TEST CASE 7: Messaging on CANCELLED / FAILED / PENDING booking is blocked
        res_cncl = client.post(f"/api/messages/conversations/{booking_cancelled.id}/messages", json={"message": "Try to send"}, headers=headers_t1)
        assert res_cncl.status_code == 400
        assert "This booking is no longer active for direct messaging." in res_cncl.json()["detail"]

        res_pend = client.post(f"/api/messages/conversations/{booking_pending.id}/messages", json={"message": "Try to send"}, headers=headers_t1)
        assert res_pend.status_code == 400
        print("[TEST 7 PASSED] Messaging on CANCELLED and PENDING bookings blocked.")

        # 11. TEST CASE 8: IDOR Security — Unauthorized Traveler (Traveler 2) attempts access
        res_idor_t = client.get(f"/api/messages/conversations/{booking_confirmed.id}", headers=headers_t2)
        assert res_idor_t.status_code == 403, f"Expected 403, got {res_idor_t.status_code}"

        res_idor_send = client.post(f"/api/messages/conversations/{booking_confirmed.id}/messages", json={"message": "Malicious message"}, headers=headers_t2)
        assert res_idor_send.status_code == 403, f"Expected 403, got {res_idor_send.status_code}"
        print("[TEST 8 PASSED] Cross-Traveler IDOR security verified (403 Forbidden).")

        # 12. TEST CASE 9: IDOR Security — Unauthorized Stay Partner (Provider 2) attempts access
        res_idor_p = client.get(f"/api/messages/conversations/{booking_confirmed.id}", headers=headers_p2)
        assert res_idor_p.status_code == 403, f"Expected 403, got {res_idor_p.status_code}"

        res_idor_p_send = client.post(f"/api/messages/conversations/{booking_confirmed.id}/messages", json={"message": "Unauthorized message"}, headers=headers_p2)
        assert res_idor_p_send.status_code == 403, f"Expected 403, got {res_idor_p_send.status_code}"
        print("[TEST 9 PASSED] Cross-Provider IDOR security verified (403 Forbidden).")

        # 13. TEST CASE 10: Mark conversation as read & Unread counts
        # First check unread count for Traveler 1 (Partner sent a reply in Test 4)
        res_unread_t = client.get("/api/messages/unread-count", headers=headers_t1)
        assert res_unread_t.status_code == 200
        unread_count_before = res_unread_t.json().get("unread_count", 0)
        assert unread_count_before >= 1, f"Expected at least 1 unread message, got {unread_count_before}"

        # Traveler 1 opens the conversation (which marks it as read)
        res_read = client.post(f"/api/messages/conversations/{booking_confirmed.id}/read", headers=headers_t1)
        assert res_read.status_code == 200
        assert res_read.json().get("marked_read", 0) >= 1

        # Check unread count after marking read
        res_unread_after = client.get("/api/messages/unread-count", headers=headers_t1)
        assert res_unread_after.status_code == 200
        assert res_unread_after.json().get("unread_count", 0) == 0
        print("[TEST 10 PASSED] Mark as read and unread counter verified.")

        # 14. TEST CASE 11: GET /bookings/{booking_id}/stay-information preserved
        res_stay = client.get(f"/api/bookings/{booking_confirmed.id}/stay-information", headers=headers_t1)
        assert res_stay.status_code == 200, f"Expected 200, got {res_stay.status_code}"
        stay_data = res_stay.json()
        assert stay_data["property_name"] == "Munnar Tea Hills Villa"
        assert stay_data["guest_information_message"] == "Welcome! Key lockbox code is 4321."
        assert "property_rules" in stay_data
        assert stay_data["property_rules"]["children_allowed"] == "Yes"
        print("[TEST 11 PASSED] Stay information endpoint validated.")

        # 15. TEST CASE 12: GET /api/messages/conversations/{booking_id} full detail
        res_detail = client.get(f"/api/messages/conversations/{booking_confirmed.id}", headers=headers_t1)
        assert res_detail.status_code == 200
        detail_data = res_detail.json()
        assert detail_data["booking_id"] == booking_confirmed.id
        assert detail_data["booking_number"] == "VOY-CONF-E2E01"
        assert len(detail_data["messages"]) >= 2
        assert detail_data["property_name"] == "Munnar Tea Hills Villa"
        print("[TEST 12 PASSED] Conversation detail endpoint validated with full message history.")

        print("=" * 70)
        print("ALL 12 E2E BOOKING-LINKED MESSAGING TESTS PASSED PERFECTLY!")
        print("=" * 70)

    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
