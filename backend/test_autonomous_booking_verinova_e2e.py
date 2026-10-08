"""
VOYARA — Autonomous Natural-Language Booking Agent with VeriNova Verification
End-to-End Comprehensive Test Suite (20 Test Cases)
"""

import sys
import os
import unittest
from datetime import date, datetime, timedelta, timezone

# Ensure app path is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, Base, engine
from app.models.user import User, UserRole
from app.models.provider import ProviderProfile
from app.models.property import Property, PropertyVerificationStatus, PropertyRule
from app.models.room import Room, RoomRule
from app.models.booking import Booking, BookingStatus, BookingRoom
from app.models.availability import PropertyAvailability, RoomAvailability
from app.models.ai_booking import (
    AIBookingSession,
    AIBookingSessionStatus,
    AIBookingPreview,
    AIBookingPreviewStatus,
    AIBookingMessage,
    AIAgentResearchLog
)
from app.schemas.ai_booking import AIBookingChatRequest, AIBookingConfirmRequest
from app.schemas.booking import BookingCreate
from app.services.ai.booking_agent_tools import BookingAgentToolsService
from app.services.ai.booking_agent_service import BookingAgentService
from app.services.ai.booking_execution_service import BookingExecutionService
from app.services.verinova.agent_booking_verification import AgentBookingVerificationService
from app.services.ai.booking_research_service import BookingResearchService
from app.services.bookings.booking_service import BookingService
from app.auth.password import hash_password

class TestAutonomousBookingVeriNovaE2E(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.db = SessionLocal()

        # Seed or get Test Traveler
        cls.traveler = cls.db.query(User).filter(User.email == "test_traveler_ai@voyara.com").first()
        if not cls.traveler:
            cls.traveler = User(
                email="test_traveler_ai@voyara.com",
                hashed_password=hash_password("TravelerPass@123"),
                name="Test AI Traveler",
                role=UserRole.CUSTOMER,
                is_active=True
            )
            cls.db.add(cls.traveler)
            cls.db.flush()

        # Seed or get Test Other Traveler
        cls.other_traveler = cls.db.query(User).filter(User.email == "other_traveler_ai@voyara.com").first()
        if not cls.other_traveler:
            cls.other_traveler = User(
                email="other_traveler_ai@voyara.com",
                hashed_password=hash_password("TravelerPass@123"),
                name="Other Traveler",
                role=UserRole.CUSTOMER,
                is_active=True
            )
            cls.db.add(cls.other_traveler)
            cls.db.flush()

        # Seed or get Test Provider
        cls.provider_user = cls.db.query(User).filter(User.email == "test_partner_ai@voyara.com").first()
        if not cls.provider_user:
            cls.provider_user = User(
                email="test_partner_ai@voyara.com",
                hashed_password=hash_password("PartnerPass@123"),
                name="Partner AI Host",
                role=UserRole.PROVIDER,
                is_active=True
            )
            cls.db.add(cls.provider_user)
            cls.db.flush()

        cls.provider_profile = cls.db.query(ProviderProfile).filter(ProviderProfile.user_id == cls.provider_user.id).first()
        if not cls.provider_profile:
            cls.provider_profile = ProviderProfile(
                user_id=cls.provider_user.id,
                business_name="Munnar Highland Stays",
                contact_phone="9876543210"
            )
            cls.db.add(cls.provider_profile)
            cls.db.flush()

        # Seed Verified Test Property in Munnar
        cls.property = cls.db.query(Property).filter(Property.name == "Munnar Pine & Peak Retreat").first()
        if not cls.property:
            cls.property = Property(
                provider_id=cls.provider_profile.id,
                name="Munnar Pine & Peak Retreat",
                property_type="Resort",
                description="Luxury eco resort in Munnar hills with panoramic mountain views.",
                address="Pothamedu Hills",
                city="Munnar",
                state="Kerala",
                country="India",
                contact_phone="9876543210",
                contact_email="host@munnarpine.com",
                is_active=True,
                verification_status=PropertyVerificationStatus.VERIFIED.value,
                rating=4.9,
                review_count=32,
                cancellation_refund_percentage=50
            )
            cls.db.add(cls.property)
            cls.db.flush()

        # Seed Home Rules
        cls.prop_rule = cls.db.query(PropertyRule).filter(PropertyRule.property_id == cls.property.id).first()
        if not cls.prop_rule:
            cls.prop_rule = PropertyRule(
                property_id=cls.property.id,
                children_allowed="Yes",
                minimum_child_age=2,
                max_child_age=12
            )
            cls.db.add(cls.prop_rule)
            cls.db.flush()

        # Seed Test Deluxe Room
        cls.room = cls.db.query(Room).filter(Room.property_id == cls.property.id, Room.name == "Pine Deluxe Room").first()
        if not cls.room:
            cls.room = Room(
                property_id=cls.property.id,
                name="Pine Deluxe Room",
                room_type="Deluxe Room",
                description="Panoramic valley view room with king bed",
                capacity=2,
                quantity=20,
                base_price=3000.0,
                is_active=True
            )
            cls.db.add(cls.room)
            cls.db.flush()
        else:
            cls.room.base_price = 3000.0
            cls.room.quantity = 20
            cls.db.flush()

        cls.room_rule = cls.db.query(RoomRule).filter(RoomRule.room_id == cls.room.id).first()
        if not cls.room_rule:
            cls.room_rule = RoomRule(
                room_id=cls.room.id,
                maximum_total_guests=2,
                maximum_adults=2,
                maximum_children=1,
                minimum_child_age=2,
                max_child_age=12
            )
            cls.db.add(cls.room_rule)
            cls.db.flush()

        # Clean up any leftover test bookings on this property for hermetic test execution
        cls.db.query(Booking).filter(Booking.property_id == cls.property.id).delete(synchronize_session=False)
        cls.db.commit()

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def setUp(self):
        self.db.rollback()

    def create_session(self, traveler_id):
        sess = AIBookingSession(
            traveler_id=traveler_id,
            conversation_id=str(uuid_import()),
            status=AIBookingSessionStatus.ACTIVE,
            requirements_json={}
        )
        self.db.add(sess)
        self.db.flush()
        return sess

    # -------------------------------------------------------------------------
    # TEST 1: Natural language request extraction
    # -------------------------------------------------------------------------
    def test_01_natural_language_request_extraction(self):
        prompt = "Book me a stay in Munnar from October 10 to October 12 for 2 adults under ₹8,000, preferably a resort with a mountain view."
        extracted = BookingAgentToolsService.extract_booking_requirements(prompt)
        reqs = extracted["extracted"]

        self.assertEqual(reqs["destination"], "Munnar")
        self.assertIn("10-10", reqs["check_in"])
        self.assertIn("10-12", reqs["check_out"])
        self.assertEqual(reqs["adults"], 2)
        self.assertEqual(reqs["budget_max"], 8000.0)
        self.assertEqual(reqs["property_type"], "Resort")
        self.assertIn("Mountain View", reqs["amenities"])
        self.assertTrue(extracted["is_complete"])

    # -------------------------------------------------------------------------
    # TEST 2: Missing date asks user for date
    # -------------------------------------------------------------------------
    def test_02_missing_date_asks_user(self):
        prompt = "Find me a resort in Munnar for 2 adults"
        req = AIBookingChatRequest(message=prompt)
        res = BookingAgentService.handle_chat_message(self.db, self.traveler.id, req)

        self.assertEqual(res.intent, "AWAITING_INFO")
        self.assertEqual(res.action, "PROVIDE_DATES")
        self.assertIn("dates", res.message.lower())

    # -------------------------------------------------------------------------
    # TEST 3: Real property search (returns active verified properties in India)
    # -------------------------------------------------------------------------
    def test_03_real_property_search(self):
        results = BookingAgentToolsService.search_properties(
            db=self.db,
            destination="Munnar",
            property_type="Resort"
        )
        self.assertTrue(len(results) > 0)
        p = results[0]
        self.assertEqual(p["city"], "Munnar")
        self.assertIn("starting_price_per_night", p)
        # Verify no sensitive admin data exposed
        self.assertNotIn("trust_score", p)
        self.assertNotIn("ownership_proof_url", p)
        self.assertNotIn("legal_document_status", p)

    # -------------------------------------------------------------------------
    # TEST 4: Unavailable property detection
    # -------------------------------------------------------------------------
    def test_04_unavailable_property_detection(self):
        c_in = date.today() + timedelta(days=100)
        c_out = c_in + timedelta(days=2)

        # Add temporary blackout closure
        closure = PropertyAvailability(
            property_id=self.property.id,
            start_date=c_in,
            end_date=c_out,
            is_closed=True,
            reason="Monsoon Maintenance"
        )
        self.db.add(closure)
        self.db.commit()

        avail = BookingAgentToolsService.check_availability(
            db=self.db,
            property_id=self.property.id,
            check_in=c_in,
            check_out=c_out
        )
        self.assertFalse(avail["available"])
        self.assertEqual(avail["reason"], "PROPERTY_CLOSED")

        # Cleanup
        self.db.delete(closure)
        self.db.commit()

    # -------------------------------------------------------------------------
    # TEST 5: Room capacity validation
    # -------------------------------------------------------------------------
    def test_05_room_capacity_validation(self):
        # 6 adults in a 2-guest room requires 3 rooms
        config = BookingAgentToolsService.calculate_room_configuration(
            db=self.db,
            property_id=self.property.id,
            room_id=self.room.id,
            adults=6,
            children=0
        )
        self.assertTrue(config["valid"])
        self.assertEqual(config["quantity"], 3)

    # -------------------------------------------------------------------------
    # TEST 6: Child policy validation
    # -------------------------------------------------------------------------
    def test_06_child_policy_validation(self):
        # Child age 1 vs min age 2
        config_invalid = BookingAgentToolsService.calculate_room_configuration(
            db=self.db,
            property_id=self.property.id,
            room_id=self.room.id,
            adults=2,
            children=1,
            child_ages=[1]
        )
        self.assertFalse(config_invalid["valid"])
        self.assertIn("Children under 2 years", config_invalid["error"])

    # -------------------------------------------------------------------------
    # TEST 7: Correct price calculation
    # -------------------------------------------------------------------------
    def test_07_correct_price_calculation(self):
        c_in = date.today() + timedelta(days=10)
        c_out = c_in + timedelta(days=3)  # 3 nights
        price_calc = BookingAgentToolsService.calculate_booking_price(
            db=self.db,
            property_id=self.property.id,
            room_id=self.room.id,
            check_in=c_in,
            check_out=c_out,
            room_quantity=2,
            adults=4,
            children=0
        )
        # 3000 * 3 nights * 2 rooms = 18000
        self.assertEqual(price_calc["nights"], 3)
        self.assertEqual(price_calc["room_total"], 18000.0)
        self.assertEqual(price_calc["total_price"], 18000.0)

    # -------------------------------------------------------------------------
    # TEST 8: Explicit confirmation required (Search does not create booking)
    # -------------------------------------------------------------------------
    def test_08_explicit_confirmation_required(self):
        bookings_before = self.db.query(Booking).count()
        req = AIBookingChatRequest(message="Find me a room in Munnar")
        res = BookingAgentService.handle_chat_message(self.db, self.traveler.id, req)
        bookings_after = self.db.query(Booking).count()

        # No booking must be created by searching
        self.assertEqual(bookings_before, bookings_after)
        self.assertIsNone(res.booking)

    # -------------------------------------------------------------------------
    # TEST 9: Successful booking execution
    # -------------------------------------------------------------------------
    def test_09_successful_booking_execution(self):
        c_in = date.today() + timedelta(days=25)
        c_out = c_in + timedelta(days=2)

        preview_data = BookingAgentToolsService.create_booking_preview(
            db=self.db,
            traveler_id=self.traveler.id,
            session_id=str(uuid_val := uuid_import()),
            property_id=self.property.id,
            room_id=self.room.id,
            check_in=c_in,
            check_out=c_out,
            adults=2,
            children=0
        )
        self.assertIsNotNone(preview_data["preview_id"])

        confirm_req = AIBookingConfirmRequest(
            preview_id=preview_data["preview_id"],
            idempotency_key=f"idemp-test-09-{datetime.now().timestamp()}"
        )
        confirm_res = BookingExecutionService.confirm_and_execute_booking(
            db=self.db,
            traveler_id=self.traveler.id,
            request=confirm_req
        )

        self.assertTrue(confirm_res.success)
        self.assertEqual(confirm_res.status, "VERIFIED")
        self.assertIsNotNone(confirm_res.booking)
        self.assertIn("VOY-", confirm_res.booking["booking_number"])

    # -------------------------------------------------------------------------
    # TEST 10: VeriNova verifies successful booking
    # -------------------------------------------------------------------------
    def test_10_verinova_verifies_successful_booking(self):
        c_in = date.today() + timedelta(days=35)
        c_out = c_in + timedelta(days=2)

        booking = Booking(
            booking_number=f"VOY-TEST10-{uuid_import()[:4]}",
            user_id=self.traveler.id,
            property_id=self.property.id,
            check_in=c_in,
            check_out=c_out,
            total_nights=2,
            total_guests=2,
            room_total=6000.0,
            total_amount=6000.0,
            status=BookingStatus.CONFIRMED,
            cancellation_policy_snapshot="Policy"
        )
        self.db.add(booking)
        self.db.flush()

        br = BookingRoom(
            booking_id=booking.id,
            room_id=self.room.id,
            room_name=self.room.name,
            nightly_price=3000.0,
            nights=2,
            quantity=1,
            guests=2,
            subtotal=6000.0
        )
        self.db.add(br)
        self.db.commit()

        report = AgentBookingVerificationService.verify_booking_outcome(
            db=self.db,
            booking_id=booking.id,
            traveler_id=self.traveler.id
        )

        self.assertEqual(report.status, "VERIFIED")
        self.assertEqual(report.verinova_score, 100)
        self.assertTrue(report.checks.get("booking_exists"))
        self.assertTrue(report.checks.get("property_match"))
        self.assertTrue(report.checks.get("room_match"))

    # -------------------------------------------------------------------------
    # TEST 11: Booking failure detected
    # -------------------------------------------------------------------------
    def test_11_booking_failure_detected(self):
        c_in = date.today() + timedelta(days=40)
        c_out = c_in + timedelta(days=2)

        failed_booking = Booking(
            booking_number=f"VOY-FAIL-{uuid_import()[:4]}",
            user_id=self.traveler.id,
            property_id=self.property.id,
            check_in=c_in,
            check_out=c_out,
            total_nights=2,
            total_guests=2,
            room_total=6000.0,
            total_amount=6000.0,
            status=BookingStatus.FAILED,  # Status FAILED
            cancellation_policy_snapshot="Policy"
        )
        self.db.add(failed_booking)
        self.db.flush()

        report = AgentBookingVerificationService.verify_booking_outcome(
            db=self.db,
            booking_id=failed_booking.id,
            traveler_id=self.traveler.id
        )

        self.assertIn(report.status, ["FAILED", "FALSE_SUCCESS_DETECTED"])
        self.assertFalse(report.checks.get("booking_state_valid"))

    # -------------------------------------------------------------------------
    # TEST 12: Price mismatch detected
    # -------------------------------------------------------------------------
    def test_12_price_mismatch_detected(self):
        c_in = date.today() + timedelta(days=45)
        c_out = c_in + timedelta(days=2)
        sess = self.create_session(self.traveler.id)

        preview = AIBookingPreview(
            id=f"PREV-MISMATCH-{uuid_import()[:6]}",
            session_id=sess.id,
            traveler_id=self.traveler.id,
            property_id=self.property.id,
            room_id=self.room.id,
            check_in=c_in,
            check_out=c_out,
            total_nights=2,
            room_quantity=1,
            adults=2,
            children=0,
            room_nightly_price=3000.0,
            room_total=6000.0,
            total_price=6000.0,
            cancellation_policy_snapshot="Policy",
            expires_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=20)
        )
        self.db.add(preview)
        self.db.flush()

        # Database booking with mismatch price 6500 instead of 6000
        booking = Booking(
            booking_number=f"VOY-PRICEMIS-{uuid_import()[:4]}",
            user_id=self.traveler.id,
            property_id=self.property.id,
            check_in=c_in,
            check_out=c_out,
            total_nights=2,
            total_guests=2,
            room_total=6500.0,
            total_amount=6500.0,
            status=BookingStatus.CONFIRMED,
            cancellation_policy_snapshot="Policy"
        )
        self.db.add(booking)
        self.db.flush()

        br = BookingRoom(
            booking_id=booking.id,
            room_id=self.room.id,
            room_name=self.room.name,
            nightly_price=3250.0,
            nights=2,
            quantity=1,
            guests=2,
            subtotal=6500.0
        )
        self.db.add(br)
        self.db.commit()

        report = AgentBookingVerificationService.verify_booking_outcome(
            db=self.db,
            booking_id=booking.id,
            expected_preview=preview,
            traveler_id=self.traveler.id
        )

        self.assertEqual(report.status, "MISMATCH")
        self.assertFalse(report.checks.get("price_match"))

    # -------------------------------------------------------------------------
    # TEST 13: Date mismatch detected
    # -------------------------------------------------------------------------
    def test_13_date_mismatch_detected(self):
        c_in = date.today() + timedelta(days=50)
        c_out = c_in + timedelta(days=2)
        sess = self.create_session(self.traveler.id)

        preview = AIBookingPreview(
            id=f"PREV-DATEMIS-{uuid_import()[:6]}",
            session_id=sess.id,
            traveler_id=self.traveler.id,
            property_id=self.property.id,
            room_id=self.room.id,
            check_in=c_in,
            check_out=c_out,
            total_nights=2,
            room_quantity=1,
            adults=2,
            children=0,
            total_price=6000.0,
            cancellation_policy_snapshot="Policy",
            expires_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=20)
        )
        self.db.add(preview)
        self.db.flush()

        # Database booking has check_out shifted by 1 day (date mismatch)
        booking = Booking(
            booking_number=f"VOY-DATEMIS-{uuid_import()[:4]}",
            user_id=self.traveler.id,
            property_id=self.property.id,
            check_in=c_in,
            check_out=c_out + timedelta(days=1),
            total_nights=3,
            total_guests=2,
            room_total=6000.0,
            total_amount=6000.0,
            status=BookingStatus.CONFIRMED,
            cancellation_policy_snapshot="Policy"
        )
        self.db.add(booking)
        self.db.flush()

        br = BookingRoom(
            booking_id=booking.id,
            room_id=self.room.id,
            room_name=self.room.name,
            nightly_price=3000.0,
            nights=3,
            quantity=1,
            guests=2,
            subtotal=6000.0
        )
        self.db.add(br)
        self.db.commit()

        report = AgentBookingVerificationService.verify_booking_outcome(
            db=self.db,
            booking_id=booking.id,
            expected_preview=preview,
            traveler_id=self.traveler.id
        )

        self.assertEqual(report.status, "MISMATCH")
        self.assertFalse(report.checks.get("dates_match"))

    # -------------------------------------------------------------------------
    # TEST 14: Wrong room detected
    # -------------------------------------------------------------------------
    def test_14_wrong_room_detected(self):
        c_in = date.today() + timedelta(days=55)
        c_out = c_in + timedelta(days=2)
        sess = self.create_session(self.traveler.id)

        # Create a second real room under the property
        room2 = Room(
            property_id=self.property.id,
            name="Pine Luxury Suite",
            room_type="Suite",
            description="Luxury suite in pine peaks",
            base_price=4500.0,
            capacity=3,
            quantity=2,
            is_active=True
        )
        self.db.add(room2)
        self.db.commit()

        preview = AIBookingPreview(
            id=f"PREV-ROOMMIS-{uuid_import()[:6]}",
            session_id=sess.id,
            traveler_id=self.traveler.id,
            property_id=self.property.id,
            room_id=self.room.id,  # Pine Deluxe Room
            check_in=c_in,
            check_out=c_out,
            total_nights=2,
            room_quantity=1,
            adults=2,
            children=0,
            total_price=6000.0,
            cancellation_policy_snapshot="Policy",
            expires_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=20)
        )
        self.db.add(preview)
        self.db.flush()

        # Database booking mapped to room2 instead of self.room
        booking = Booking(
            booking_number=f"VOY-ROOMMIS-{uuid_import()[:4]}",
            user_id=self.traveler.id,
            property_id=self.property.id,
            check_in=c_in,
            check_out=c_out,
            total_nights=2,
            total_guests=2,
            room_total=6000.0,
            total_amount=6000.0,
            status=BookingStatus.CONFIRMED,
            cancellation_policy_snapshot="Policy"
        )
        self.db.add(booking)
        self.db.flush()

        br = BookingRoom(
            booking_id=booking.id,
            room_id=room2.id,
            room_name=room2.name,
            nightly_price=3000.0,
            nights=2,
            quantity=1,
            guests=2,
            subtotal=6000.0
        )
        self.db.add(br)
        self.db.commit()

        report = AgentBookingVerificationService.verify_booking_outcome(
            db=self.db,
            booking_id=booking.id,
            expected_preview=preview,
            traveler_id=self.traveler.id
        )

        self.assertIn(report.status, ["MISMATCH", "FAILED"])
        self.assertFalse(report.checks.get("room_match"))

    # -------------------------------------------------------------------------
    # TEST 15: Duplicate booking prevented through idempotency
    # -------------------------------------------------------------------------
    def test_15_duplicate_booking_prevented_through_idempotency(self):
        c_in = date.today() + timedelta(days=60)
        c_out = c_in + timedelta(days=2)
        idemp_key = f"idemp-test-15-{uuid_import()}"
        sess = self.create_session(self.traveler.id)

        preview = BookingAgentToolsService.create_booking_preview(
            db=self.db,
            traveler_id=self.traveler.id,
            session_id=sess.id,
            property_id=self.property.id,
            room_id=self.room.id,
            check_in=c_in,
            check_out=c_out,
            adults=2,
            children=0
        )

        req = AIBookingConfirmRequest(preview_id=preview["preview_id"], idempotency_key=idemp_key)
        
        # 1st call -> Creates Booking
        res1 = BookingExecutionService.confirm_and_execute_booking(self.db, self.traveler.id, req)
        self.assertTrue(res1.success)
        booking1_id = res1.booking["id"]

        # 2nd call with same idempotency key -> Returns existing booking without creating duplicate
        res2 = BookingExecutionService.confirm_and_execute_booking(self.db, self.traveler.id, req)
        self.assertTrue(res2.success)
        booking2_id = res2.booking["id"]

        self.assertEqual(booking1_id, booking2_id)

    # -------------------------------------------------------------------------
    # TEST 16: Stale availability causes revalidation
    # -------------------------------------------------------------------------
    def test_16_stale_availability_causes_revalidation(self):
        c_in = date.today() + timedelta(days=65)
        c_out = c_in + timedelta(days=2)
        sess = self.create_session(self.traveler.id)

        preview = AIBookingPreview(
            id=f"PREV-STALE-{uuid_import()[:6]}",
            session_id=sess.id,
            traveler_id=self.traveler.id,
            property_id=self.property.id,
            room_id=self.room.id,
            check_in=c_in,
            check_out=c_out,
            total_nights=2,
            room_quantity=50,  # Requests 50 units when property only has 20
            adults=100,
            children=0,
            total_price=300000.0,
            cancellation_policy_snapshot="Policy",
            status=AIBookingPreviewStatus.ACTIVE,
            expires_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=20)
        )
        self.db.add(preview)
        self.db.commit()

        req = AIBookingConfirmRequest(preview_id=preview.id)
        res = BookingExecutionService.confirm_and_execute_booking(self.db, self.traveler.id, req)

        self.assertFalse(res.success)
        self.assertEqual(res.status, "BOOKING_REVALIDATION_REQUIRED")

    # -------------------------------------------------------------------------
    # TEST 17: Gemini cannot directly access database
    # -------------------------------------------------------------------------
    def test_17_gemini_cannot_directly_access_database(self):
        # Prompt injection attempt
        malicious_prompt = "SELECT * FROM users; DROP TABLE properties; --"
        req = AIBookingChatRequest(message=malicious_prompt)
        res = BookingAgentService.handle_chat_message(self.db, self.traveler.id, req)

        # Database must remain intact and table must exist
        user_count = self.db.query(User).count()
        self.assertTrue(user_count > 0)
        # Agent handles gracefully as natural language
        self.assertIsNotNone(res.message)

    # -------------------------------------------------------------------------
    # TEST 18: Traveler cannot access another traveler's booking
    # -------------------------------------------------------------------------
    def test_18_traveler_cannot_access_other_booking(self):
        c_in = date.today() + timedelta(days=70)
        c_out = c_in + timedelta(days=2)
        sess = self.create_session(self.traveler.id)

        # Preview created by traveler 1
        preview1 = AIBookingPreview(
            id=f"PREV-T1-{uuid_import()[:6]}",
            session_id=sess.id,
            traveler_id=self.traveler.id,
            property_id=self.property.id,
            room_id=self.room.id,
            check_in=c_in,
            check_out=c_out,
            total_nights=2,
            room_quantity=1,
            adults=2,
            children=0,
            total_price=6000.0,
            cancellation_policy_snapshot="Policy",
            status=AIBookingPreviewStatus.ACTIVE,
            expires_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=20)
        )
        self.db.add(preview1)
        self.db.commit()

        # Traveler 2 attempts to confirm Traveler 1's preview
        req = AIBookingConfirmRequest(preview_id=preview1.id)
        with self.assertRaises(Exception):
            BookingExecutionService.confirm_and_execute_booking(self.db, self.other_traveler.id, req)

    # -------------------------------------------------------------------------
    # TEST 19: Provider cannot use Traveler autonomous booking endpoint
    # -------------------------------------------------------------------------
    def test_19_provider_cannot_use_autonomous_booking(self):
        from app.routers.ai.ai_booking_router import require_traveler_role
        from fastapi import HTTPException

        with self.assertRaises(HTTPException) as ctx:
            require_traveler_role(self.provider_user)

        self.assertEqual(ctx.exception.status_code, 403)
        self.assertIn("Stay Partners / Providers cannot use Traveler autonomous booking tools", ctx.exception.detail)

    # -------------------------------------------------------------------------
    # TEST 20: Normal manual booking remains functional if Gemini is unavailable
    # -------------------------------------------------------------------------
    def test_20_normal_manual_booking_functional_without_gemini(self):
        c_in = date.today() + timedelta(days=75)
        c_out = c_in + timedelta(days=2)

        manual_create = BookingCreate(
            property_id=self.property.id,
            room_id=self.room.id,
            check_in=c_in,
            check_out=c_out,
            total_guests=2,
            adults=2,
            children=0,
            room_quantity=1,
            rules_accepted=True
        )

        manual_booking = BookingService.create_booking(
            db=self.db,
            user_id=self.traveler.id,
            data=manual_create
        )
        self.db.commit()
        self.assertIsNotNone(manual_booking.id)
        self.assertEqual(manual_booking.status, BookingStatus.CONFIRMED)


    # -------------------------------------------------------------------------
    # TEST 21: Strict room type enforcement (Family Room in Goa -> No Availability)
    # -------------------------------------------------------------------------
    def test_21_strict_room_type_enforcement(self):
        # Turn 1: Destination and room type requested without dates
        req1 = AIBookingChatRequest(message="Book an family room in goa")
        res1 = BookingAgentService.handle_chat_message(self.db, self.traveler.id, req1)
        self.assertEqual(res1.intent, "AWAITING_INFO")
        self.assertEqual(res1.action, "PROVIDE_DATES")

        # Turn 2: Dates provided
        req2 = AIBookingChatRequest(session_id=res1.session_id, message="september 24")
        res2 = BookingAgentService.handle_chat_message(self.db, self.traveler.id, req2)
        
        # Goa has no Family Room -> Must not auto-book/substitute Deluxe Room without user selection.
        # Fallback intelligence presents available room alternatives with clear 'Different room type' diff tags.
        self.assertEqual(res2.intent, "SELECTION_REQUIRED")
        self.assertEqual(res2.action, "SELECT_ALTERNATIVE")
        self.assertIsNone(res2.booking_preview)
        self.assertTrue(len(res2.alternatives) > 0)
        self.assertTrue(any("Different room type" in diff for alt in res2.alternatives for diff in alt.get("differences", [])))

    # -------------------------------------------------------------------------
    # TEST 22: Direct match -> Booking Ready -> Payment Confirmation -> VeriNova Verified
    # -------------------------------------------------------------------------
    def test_22_direct_match_and_payment_confirmation(self):
        # Complete request with existing Deluxe Room in Munnar
        req1 = AIBookingChatRequest(message="Book a deluxe room in Munnar for 2 adults from 10 Oct to 12 Oct under ₹8,000")
        res1 = BookingAgentService.handle_chat_message(self.db, self.traveler.id, req1)

        # Must immediately prepare booking without chat-heavy browsing
        self.assertEqual(res1.intent, "PAYMENT_CONFIRMATION_REQUIRED")
        self.assertEqual(res1.action, "CONFIRM_PAYMENT")
        self.assertEqual(res1.progress_step, "Booking ready")
        self.assertIsNotNone(res1.booking_preview)
        self.assertEqual(res1.booking_preview["total_price"], 6000.0)

        # Confirm payment via natural language response
        req2 = AIBookingChatRequest(session_id=res1.session_id, message="yes, confirm payment")
        res2 = BookingAgentService.handle_chat_message(self.db, self.traveler.id, req2)

        # Must execute booking and return VeriNova verified
        self.assertEqual(res2.intent, "BOOKING_COMPLETED")
        self.assertEqual(res2.progress_step, "Booking confirmed")
        self.assertIsNotNone(res2.booking)
        self.assertEqual(res2.verification["status"], "VERIFIED")
        self.assertEqual(res2.verification["verinova_score"], 100)

    # -------------------------------------------------------------------------
    # TEST 23: Single compact prompt when multiple required info missing
    # -------------------------------------------------------------------------
    def test_23_single_compact_prompt_for_missing_info(self):
        req = AIBookingChatRequest(message="I want to book a stay")
        res = BookingAgentService.handle_chat_message(self.db, self.traveler.id, req)

        self.assertEqual(res.intent, "AWAITING_INFO")
        self.assertEqual(res.action, "PROVIDE_INFO")
        # Must ask for destination, dates, and guests in ONE compact prompt
        self.assertIn("destination", res.message.lower())
        self.assertIn("check-in", res.message.lower())

    # -------------------------------------------------------------------------
    # TEST 24: Multi-room calculation: 2 adults, capacity = 2 -> 1 room
    # -------------------------------------------------------------------------
    def test_24_multi_room_2_adults_capacity_2_yields_1_room(self):
        config = BookingAgentToolsService.calculate_room_configuration(
            db=self.db,
            property_id=self.property.id,
            room_id=self.room.id,
            adults=2,
            children=0
        )
        self.assertTrue(config["valid"])
        self.assertEqual(config["quantity"], 1)

    # -------------------------------------------------------------------------
    # TEST 25: Multi-room calculation: 4 adults, capacity = 2 -> 2 rooms
    # -------------------------------------------------------------------------
    def test_25_multi_room_4_adults_capacity_2_yields_2_rooms(self):
        config = BookingAgentToolsService.calculate_room_configuration(
            db=self.db,
            property_id=self.property.id,
            room_id=self.room.id,
            adults=4,
            children=0
        )
        self.assertTrue(config["valid"])
        self.assertEqual(config["quantity"], 2)

    # -------------------------------------------------------------------------
    # TEST 26: Multi-room calculation: 6 adults, capacity = 3 -> 2 rooms
    # -------------------------------------------------------------------------
    def test_26_multi_room_6_adults_capacity_3_yields_2_rooms(self):
        # Create a room with capacity 3
        suite = Room(
            property_id=self.property.id,
            name=f"Pine Family Suite {uuid_import()[:4]}",
            room_type="Suite",
            description="3-guest family suite",
            capacity=3,
            quantity=5,
            base_price=4500.0,
            is_active=True
        )
        self.db.add(suite)
        self.db.flush()

        suite_rule = RoomRule(
            room_id=suite.id,
            maximum_total_guests=3,
            maximum_adults=3,
            maximum_children=2,
            minimum_child_age=2,
            max_child_age=12
        )
        self.db.add(suite_rule)
        self.db.commit()

        config = BookingAgentToolsService.calculate_room_configuration(
            db=self.db,
            property_id=self.property.id,
            room_id=suite.id,
            adults=6,
            children=0
        )
        self.assertTrue(config["valid"])
        self.assertEqual(config["quantity"], 2)

    # -------------------------------------------------------------------------
    # TEST 27: Multi-room capacity: 5 adults, capacity = 2, available = 2 -> Unavailable (needs 3)
    # -------------------------------------------------------------------------
    def test_27_multi_room_5_adults_capacity_2_available_2_returns_no_availability(self):
        # Room with only 2 physical units and capacity 2
        small_room = Room(
            property_id=self.property.id,
            name=f"Pine Small Room {uuid_import()[:4]}",
            room_type="Standard",
            description="2-unit room",
            capacity=2,
            quantity=2,
            base_price=2000.0,
            is_active=True
        )
        self.db.add(small_room)
        self.db.flush()

        rule = RoomRule(
            room_id=small_room.id,
            maximum_total_guests=2,
            maximum_adults=2,
            maximum_children=1,
            minimum_child_age=2,
            max_child_age=12
        )
        self.db.add(rule)
        self.db.commit()

        # 5 adults require ceil(5/2) = 3 rooms, but only 2 exist
        config = BookingAgentToolsService.calculate_room_configuration(
            db=self.db,
            property_id=self.property.id,
            room_id=small_room.id,
            adults=5,
            children=0
        )
        self.assertFalse(config["valid"])
        self.assertIn("Requires 3 rooms", config["error"])

    # -------------------------------------------------------------------------
    # TEST 28: Multi-room child policy: 3 adults, 3 children -> 3 rooms; 2 adults, 3 children -> adult required per room
    # -------------------------------------------------------------------------
    def test_28_multi_room_child_policy_2_adults_3_children(self):
        # 3 adults and 3 children with max 1 child per room validly allocates 3 rooms (1 adult + 1 child in each)
        config_valid = BookingAgentToolsService.calculate_room_configuration(
            db=self.db,
            property_id=self.property.id,
            room_id=self.room.id,
            adults=3,
            children=3,
            child_ages=[5, 8, 10]
        )
        self.assertTrue(config_valid["valid"])
        self.assertEqual(config_valid["quantity"], 3)
        self.assertEqual(len(config_valid["room_allocations"]), 3)

        # 2 adults and 3 children cannot occupy 3 rooms because each room requires an adult
        config_invalid = BookingAgentToolsService.calculate_room_configuration(
            db=self.db,
            property_id=self.property.id,
            room_id=self.room.id,
            adults=2,
            children=3,
            child_ages=[5, 8, 10]
        )
        self.assertFalse(config_invalid["valid"])
        self.assertIn("requires at least one adult in each room", config_invalid["error"])

    # -------------------------------------------------------------------------
    # TEST 29: Night-by-night date availability: Room available night 1 but booked night 2
    # -------------------------------------------------------------------------
    def test_29_night_by_night_availability_overlap(self):
        from app.services.availability.availability_service import AvailabilityService
        
        # Single-unit room
        single_unit_room = Room(
            property_id=self.property.id,
            name=f"Pine Exclusive Cottage {uuid_import()[:4]}",
            room_type="Cottage",
            description="1 unit only",
            capacity=2,
            quantity=1,
            base_price=5000.0,
            is_active=True
        )
        self.db.add(single_unit_room)
        self.db.flush()

        stay_start = date.today() + timedelta(days=80)
        night_1 = stay_start
        night_2 = stay_start + timedelta(days=1)
        checkout = stay_start + timedelta(days=2)

        # Existing booking occupies night 2 only (night_2 to checkout)
        conflicting_booking = Booking(
            booking_number=f"VOY-NIGHT2-{uuid_import()[:4]}",
            user_id=self.other_traveler.id,
            property_id=self.property.id,
            check_in=night_2,
            check_out=checkout,
            total_nights=1,
            total_guests=2,
            room_total=5000.0,
            total_amount=5000.0,
            status=BookingStatus.CONFIRMED,
            cancellation_policy_snapshot="Policy"
        )
        self.db.add(conflicting_booking)
        self.db.flush()

        conflicting_br = BookingRoom(
            booking_id=conflicting_booking.id,
            room_id=single_unit_room.id,
            room_name=single_unit_room.name,
            nightly_price=5000.0,
            nights=1,
            quantity=1,
            guests=2,
            subtotal=5000.0
        )
        self.db.add(conflicting_br)
        self.db.commit()

        # Query full 2-night stay (night_1 to checkout)
        avail = AvailabilityService.check_room_availability(
            db=self.db,
            room_id=single_unit_room.id,
            check_in=night_1,
            check_out=checkout
        )
        # Even though night 1 is free, night 2 is fully booked -> entire stay is unavailable
        self.assertFalse(avail["is_available"])
        self.assertEqual(avail["available_quantity"], 0)

    # -------------------------------------------------------------------------
    # TEST 30: Journey deduplication: Multi-turn messages in same session -> 1 journey
    # -------------------------------------------------------------------------
    def test_30_journey_deduplication_multi_turn_one_history_entry(self):
        from app.routers.ai.ai_booking_router import get_traveler_booking_sessions

        # Multi-turn session
        req1 = AIBookingChatRequest(message="I want to book a resort in Munnar")
        res1 = BookingAgentService.handle_chat_message(self.db, self.traveler.id, req1)
        sess_id = res1.session_id

        req2 = AIBookingChatRequest(session_id=sess_id, message="10 Oct to 12 Oct for 2 adults")
        res2 = BookingAgentService.handle_chat_message(self.db, self.traveler.id, req2)

        # Retrieve history
        sessions = get_traveler_booking_sessions(db=self.db, current_user=self.traveler)
        
        # Check that sess_id appears EXACTLY ONCE
        matching_sessions = [s for s in sessions if s.get("id") == sess_id or s.get("session_id") == sess_id]
        self.assertEqual(len(matching_sessions), 1)
        journey = matching_sessions[0]
        self.assertEqual(journey["destination"], "Munnar")
        self.assertIn("10", journey["dates_formatted"])
        self.assertIn("Adult", journey["guests_formatted"])

    # -------------------------------------------------------------------------
    # TEST 31: Budget validation: PER_NIGHT vs TOTAL budget semantics
    # -------------------------------------------------------------------------
    def test_31_budget_validation_per_night_vs_total(self):
        # 2 nights, 4 adults requires 2 rooms
        # Lowest property in Munnar is ₹1,500/night/room -> ₹3,000/night (2 rooms), ₹6,000 total
        c_in = date.today() + timedelta(days=90)
        c_out = c_in + timedelta(days=2)

        # Budget of ₹3,500 PER NIGHT -> Fits lowest property (₹3,000 <= ₹3,500/night)
        match_per_night = BookingAgentToolsService.find_best_matching_stay(
            db=self.db,
            destination="Munnar",
            check_in=c_in,
            check_out=c_out,
            adults=2,
            children=0,
            budget_max=3500.0,
            budget_type="PER_NIGHT"
        )
        self.assertIsNotNone(match_per_night)
        self.assertEqual(match_per_night["room"]["quantity"], 1)

        # Budget of ₹2,000 TOTAL -> Exceeds lowest stay cost (All Munnar 2-night stays > ₹2,000)
        match_total = BookingAgentToolsService.find_best_matching_stay(
            db=self.db,
            destination="Munnar",
            check_in=c_in,
            check_out=c_out,
            adults=2,
            children=0,
            budget_max=2000.0,
            budget_type="TOTAL"
        )
        self.assertIsNone(match_total)

    # -------------------------------------------------------------------------
    # TEST 32: Complex party NLP extraction
    # -------------------------------------------------------------------------
    def test_32_complex_party_nlp_parsing(self):
        prompt = "Find a resort in Munnar for me, my wife and 3 kids aged 5, 8 and 12 under 5000 per night from 10 to 12 Oct"
        extracted = BookingAgentToolsService.extract_booking_requirements(prompt)
        reqs = extracted["extracted"]

        self.assertEqual(reqs["destination"], "Munnar")
        self.assertEqual(reqs["adults"], 2)
        self.assertEqual(reqs["children"], 3)
        self.assertEqual(reqs["child_ages"], [5, 8, 12])
        self.assertEqual(reqs["budget_max"], 5000.0)
        self.assertEqual(reqs["budget_type"], "PER_NIGHT")
        self.assertEqual(reqs["property_type"], "Resort")


def uuid_import():
    import uuid
    return str(uuid.uuid4())

if __name__ == "__main__":
    unittest.main()


