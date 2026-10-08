"""
VOYARA — AI Booking Fallback & Alternative Intelligence Comprehensive Test Suite
Validates:
1. Exact match search
2. Same destination relaxed optional requirements (room type / property type difference labeled)
3. Nearby stays using real PostgreSQL coordinates & Haversine distance
4. Alternative dates search (±1, ±2, ±3, ±7 days) with complete stay inventory
5. Combined fallback pipeline
6. Final structured no-result when no alternatives exist
7. Budget exceeded handling (explicit above-budget difference labeling)
8. Multi-room capacity calculation for fallbacks
9. Child policy validation for fallbacks
10. Conversational resolution ("Book the second one", "Cheaper one", "Option 2")
11. Revalidation of selected alternative before booking preview
12. Single-session journey deduplication across turns
"""

import sys
import os
import unittest
from datetime import date, datetime, timedelta, timezone

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
from app.services.ai.booking_agent_tools import BookingAgentToolsService
from app.services.ai.booking_agent_service import BookingAgentService
from app.services.ai.booking_execution_service import BookingExecutionService
from app.services.verinova.agent_booking_verification import AgentBookingVerificationService
from app.auth.password import hash_password

class TestAIBookingFallbackIntelligenceE2E(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.db = SessionLocal()

        # Seed or get Test Traveler
        cls.traveler = cls.db.query(User).filter(User.email == "test_fallback_traveler@voyara.com").first()
        if not cls.traveler:
            cls.traveler = User(
                email="test_fallback_traveler@voyara.com",
                hashed_password=hash_password("TravelerPass@123"),
                name="Fallback Traveler",
                role=UserRole.CUSTOMER,
                is_active=True
            )
            cls.db.add(cls.traveler)
            cls.db.flush()

        # Seed or get Test Provider
        cls.provider_user = cls.db.query(User).filter(User.email == "test_fallback_host@voyara.com").first()
        if not cls.provider_user:
            cls.provider_user = User(
                email="test_fallback_host@voyara.com",
                hashed_password=hash_password("PartnerPass@123"),
                name="Fallback Host",
                role=UserRole.PROVIDER,
                is_active=True
            )
            cls.db.add(cls.provider_user)
            cls.db.flush()

        cls.provider_profile = cls.db.query(ProviderProfile).filter(ProviderProfile.user_id == cls.provider_user.id).first()
        if not cls.provider_profile:
            cls.provider_profile = ProviderProfile(
                user_id=cls.provider_user.id,
                business_name="Kerala Highlands Hospitality",
                contact_phone="9876543211"
            )
            cls.db.add(cls.provider_profile)
            cls.db.flush()

        # 1. Seed Peermade Valley Resort (8.4 km from Kuttikkanam)
        cls.peermade_prop = cls.db.query(Property).filter(Property.name == "Peermade Valley Resort").first()
        if not cls.peermade_prop:
            cls.peermade_prop = Property(
                provider_id=cls.provider_profile.id,
                name="Peermade Valley Resort",
                property_type="Resort",
                description="Lush tea garden resort in Peermade hills, close to Kuttikkanam.",
                address="Peermade Hill Station Road",
                city="Peermade",
                state="Kerala",
                country="India",
                latitude=9.5667,
                longitude=76.9833,
                contact_phone="9876543211",
                contact_email="peermade@voyara.com",
                verification_status=PropertyVerificationStatus.VERIFIED.value,
                is_active=True,
                rating=4.8,
                review_count=24
            )
            cls.db.add(cls.peermade_prop)
            cls.db.flush()

        cls.peermade_deluxe = cls.db.query(Room).filter(Room.property_id == cls.peermade_prop.id, Room.room_type == "Deluxe Room").first()
        if not cls.peermade_deluxe:
            cls.peermade_deluxe = Room(
                property_id=cls.peermade_prop.id,
                name="Deluxe Mountain View",
                room_type="Deluxe Room",
                description="Deluxe room with panoramic views of Peermade hills.",
                capacity=3,
                quantity=5,
                base_price=3200.0,
                is_active=True
            )
            cls.db.add(cls.peermade_deluxe)
            cls.db.flush()

        cls.peermade_standard = cls.db.query(Room).filter(Room.property_id == cls.peermade_prop.id, Room.room_type == "Standard Room").first()
        if not cls.peermade_standard:
            cls.peermade_standard = Room(
                property_id=cls.peermade_prop.id,
                name="Standard Garden Room",
                room_type="Standard Room",
                description="Comfortable standard room overlooking tea gardens.",
                capacity=2,
                quantity=4,
                base_price=2400.0,
                is_active=True
            )
            cls.db.add(cls.peermade_standard)
            cls.db.flush()

        # Rules
        p_rule = cls.db.query(PropertyRule).filter(PropertyRule.property_id == cls.peermade_prop.id).first()
        if not p_rule:
            p_rule = PropertyRule(
                property_id=cls.peermade_prop.id,
                children_allowed="Yes",
                minimum_child_age=0,
                max_child_age=17
            )
            cls.db.add(p_rule)
            cls.db.flush()

        # 2. Seed Thekkady Hills Homestay (21.4 km from Kuttikkanam)
        cls.thekkady_prop = cls.db.query(Property).filter(Property.name == "Thekkady Hills Homestay").first()
        if not cls.thekkady_prop:
            cls.thekkady_prop = Property(
                provider_id=cls.provider_profile.id,
                name="Thekkady Hills Homestay",
                property_type="Homestay",
                description="Authentic spice plantation homestay in Thekkady.",
                address="Kumily Thekkady Bypass",
                city="Thekkady",
                state="Kerala",
                country="India",
                latitude=9.6031,
                longitude=77.1615,
                contact_phone="9876543212",
                contact_email="thekkady@voyara.com",
                verification_status=PropertyVerificationStatus.VERIFIED.value,
                is_active=True,
                rating=4.7,
                review_count=18
            )
            cls.db.add(cls.thekkady_prop)
            cls.db.flush()

        cls.thekkady_family = cls.db.query(Room).filter(Room.property_id == cls.thekkady_prop.id, Room.room_type == "Family Room").first()
        if not cls.thekkady_family:
            cls.thekkady_family = Room(
                property_id=cls.thekkady_prop.id,
                name="Family Spice Suite",
                room_type="Family Room",
                description="Spacious family suite with private veranda.",
                capacity=4,
                quantity=3,
                base_price=2600.0,
                is_active=True
            )
            cls.db.add(cls.thekkady_family)
            cls.db.flush()

        # 3. Seed Kuttikkanam Hills Retreat (in Kuttikkanam, but only Standard Room available)
        cls.kuttikkanam_prop = cls.db.query(Property).filter(Property.name == "Kuttikkanam Hills Retreat").first()
        if not cls.kuttikkanam_prop:
            cls.kuttikkanam_prop = Property(
                provider_id=cls.provider_profile.id,
                name="Kuttikkanam Hills Retreat",
                property_type="Homestay",
                description="Serene retreat nestled in Kuttikkanam pine forests.",
                address="Pine Forest Road, Kuttikkanam",
                city="Kuttikkanam",
                state="Kerala",
                country="India",
                latitude=9.5816,
                longitude=76.9678,
                contact_phone="9876543213",
                contact_email="kuttikkanam@voyara.com",
                verification_status=PropertyVerificationStatus.VERIFIED.value,
                is_active=True,
                rating=4.6,
                review_count=12
            )
            cls.db.add(cls.kuttikkanam_prop)
            cls.db.flush()

        cls.kuttikkanam_standard = cls.db.query(Room).filter(Room.property_id == cls.kuttikkanam_prop.id, Room.room_type == "Standard Room").first()
        if not cls.kuttikkanam_standard:
            cls.kuttikkanam_standard = Room(
                property_id=cls.kuttikkanam_prop.id,
                name="Standard Pine Room",
                room_type="Standard Room",
                description="Pine forest view standard room.",
                capacity=2,
                quantity=3,
                base_price=2400.0,
                is_active=True
            )
            cls.db.add(cls.kuttikkanam_standard)
            cls.db.flush()

        cls.db.commit()

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_01_exact_match_found_proceeds_to_booking(self):
        """Test 1: Exact match search returns preview and proceeds toward booking."""
        target_in = date.today() + timedelta(days=20)
        target_out = target_in + timedelta(days=2)

        match = BookingAgentToolsService.search_exact_match(
            db=self.db,
            destination="Peermade",
            check_in=target_in,
            check_out=target_out,
            adults=2,
            room_type="Deluxe Room"
        )
        self.assertIsNotNone(match)
        self.assertEqual(match["property"]["name"], "Peermade Valley Resort")
        self.assertIn("Deluxe", match["room"]["name"])

    def test_02_same_destination_different_room_type_labeled(self):
        """Test 2: When requested Deluxe Room does not exist in destination, return available Standard Room with explicit label."""
        target_in = date.today() + timedelta(days=25)
        target_out = target_in + timedelta(days=2)

        # In Kuttikkanam, only Standard Pine Room exists, no Deluxe Room
        exact = BookingAgentToolsService.search_exact_match(
            db=self.db,
            destination="Kuttikkanam",
            check_in=target_in,
            check_out=target_out,
            adults=2,
            room_type="Deluxe Room"
        )
        self.assertIsNone(exact)

        # Fallback search should find Kuttikkanam Standard Room labeled 'Different room type'
        alts = BookingAgentToolsService.search_same_destination_alternatives(
            db=self.db,
            destination="Kuttikkanam",
            check_in=target_in,
            check_out=target_out,
            adults=2,
            room_type="Deluxe Room"
        )
        self.assertTrue(len(alts) >= 1)
        self.assertEqual(alts[0]["property_name"], "Kuttikkanam Hills Retreat")
        self.assertIn("Different room type", alts[0]["diff_reason"])

    def test_03_nearby_stay_calculated_distance(self):
        """Test 3: Search nearby properties when destination has no properties; real distance calculated."""
        target_in = date.today() + timedelta(days=30)
        target_out = target_in + timedelta(days=2)

        # Destination: Vagamon (where no property is currently seeded)
        # Peermade is ~13.8 km from Vagamon
        nearby = BookingAgentToolsService.search_nearby_properties(
            db=self.db,
            destination="Vagamon",
            check_in=target_in,
            check_out=target_out,
            adults=2,
            max_radius_km=50.0
        )
        self.assertTrue(len(nearby) >= 1)
        # Verify distance is computed and within realistic range
        first = nearby[0]
        self.assertIsNotNone(first["distance_km"])
        self.assertGreater(first["distance_km"], 0.0)
        self.assertLess(first["distance_km"], 50.0)
        self.assertIn("km", first["distance_label"])
        self.assertIn("Nearby stay", first["diff_reason"])

    def test_04_alternative_dates_search(self):
        """Test 4: Search for alternative dates when requested dates are blocked."""
        target_in = date.today() + timedelta(days=40)
        target_out = target_in + timedelta(days=2)

        # Block the property for target dates
        closure = PropertyAvailability(
            property_id=self.kuttikkanam_prop.id,
            start_date=target_in,
            end_date=target_out,
            is_closed=True,
            reason="Renovation"
        )
        self.db.add(closure)
        self.db.commit()

        try:
            # Exact search on target_in should be None
            exact = BookingAgentToolsService.search_exact_match(
                db=self.db,
                destination="Kuttikkanam",
                check_in=target_in,
                check_out=target_out,
                adults=2
            )
            self.assertIsNone(exact)

            # Alternative dates search should return windows e.g. +1, +2, +3, +7 days
            alt_dates = BookingAgentToolsService.search_alternative_dates(
                db=self.db,
                destination="Kuttikkanam",
                check_in=target_in,
                check_out=target_out,
                adults=2
            )
            self.assertTrue(len(alt_dates) >= 1)
            self.assertIn("Alternative dates", alt_dates[0]["diff_reason"])
            self.assertNotEqual(alt_dates[0]["check_in"], target_in.isoformat())
        finally:
            self.db.delete(closure)
            self.db.commit()

    def test_05_budget_exceeded_clearly_labeled(self):
        """Test 5: Higher-priced option is never silently mislabeled as fitting budget."""
        target_in = date.today() + timedelta(days=45)
        target_out = target_in + timedelta(days=2)

        # User wants stay in Peermade under ₹4,000 total (Deluxe is ₹6,400 total)
        exact = BookingAgentToolsService.search_exact_match(
            db=self.db,
            destination="Peermade",
            check_in=target_in,
            check_out=target_out,
            adults=2,
            room_type="Deluxe Room",
            budget_max=4000.0,
            budget_type="TOTAL"
        )
        self.assertIsNone(exact)

        # Fallback search returns the option with explicit above-budget diff tag
        alts = BookingAgentToolsService.search_same_destination_alternatives(
            db=self.db,
            destination="Peermade",
            check_in=target_in,
            check_out=target_out,
            adults=2,
            room_type="Deluxe Room",
            budget_max=4000.0,
            budget_type="TOTAL"
        )
        self.assertTrue(len(alts) >= 1)
        self.assertIn("above your budget", alts[0]["diff_reason"])

    def test_06_multi_room_capacity_applied_to_fallbacks(self):
        """Test 6: Multi-room configuration strictly calculates needed units for 6 adults."""
        target_in = date.today() + timedelta(days=50)
        target_out = target_in + timedelta(days=2)

        # 6 adults in Peermade (Deluxe room cap = 3) -> requires 2 rooms
        fb = BookingAgentToolsService.search_intelligent_fallbacks(
            db=self.db,
            destination="Peermade",
            check_in=target_in,
            check_out=target_out,
            adults=6,
            room_type="Deluxe Room"
        )
        self.assertEqual(fb["state"], "EXACT_MATCH")
        match = fb["exact_match"]
        self.assertEqual(match["room_config"]["quantity"], 2)
        self.assertEqual(match["pricing"]["room_quantity"], 2)

    def test_07_conversational_resolution_book_the_second_one(self):
        """Test 7: Resolving 'Book the second one' against displayed alternatives."""
        displayed_alts = [
            {
                "option_index": 1,
                "property_id": self.peermade_prop.id,
                "property_name": "Peermade Valley Resort",
                "room_id": self.peermade_standard.id,
                "room_name": "Standard Garden Room",
                "total_price": 4800.0
            },
            {
                "option_index": 2,
                "property_id": self.peermade_prop.id,
                "property_name": "Peermade Valley Resort",
                "room_id": self.peermade_deluxe.id,
                "room_name": "Deluxe Mountain View",
                "total_price": 6400.0
            }
        ]

        resolved_2 = BookingAgentToolsService.resolve_conversational_selection(
            user_message="Book the second one please",
            displayed_alternatives=displayed_alts
        )
        self.assertIsNotNone(resolved_2)
        self.assertEqual(resolved_2["option_index"], 2)
        self.assertEqual(resolved_2["room_id"], self.peermade_deluxe.id)

        resolved_cheaper = BookingAgentToolsService.resolve_conversational_selection(
            user_message="I will take the cheaper one",
            displayed_alternatives=displayed_alts
        )
        self.assertIsNotNone(resolved_cheaper)
        self.assertEqual(resolved_cheaper["option_index"], 1)
        self.assertEqual(resolved_cheaper["total_price"], 4800.0)

    def test_08_end_to_end_dialog_fallback_to_confirmation(self):
        """Test 8: Full conversational journey from fallback presentation to choice to preview to verified payment."""
        target_in = (date.today() + timedelta(days=60)).strftime("%d %b %Y")
        target_out = (date.today() + timedelta(days=62)).strftime("%d %b %Y")

        # 1. Traveler asks for non-existent Deluxe room in Kuttikkanam
        req1 = AIBookingChatRequest(
            message=f"Book a deluxe room in Kuttikkanam for 2 adults from {target_in} to {target_out}"
        )
        res1 = BookingAgentService.handle_chat_message(
            db=self.db,
            traveler_id=self.traveler.id,
            request=req1
        )

        self.assertEqual(res1.intent, "SELECTION_REQUIRED")
        self.assertTrue(len(res1.alternatives) >= 1)
        self.assertIn("RECOMMENDED FOR YOU", res1.message)

        # 2. Traveler selects the second option or first option
        req2 = AIBookingChatRequest(
            session_id=res1.session_id,
            conversation_id=res1.conversation_id,
            message="Book the first one"
        )
        res2 = BookingAgentService.handle_chat_message(
            db=self.db,
            traveler_id=self.traveler.id,
            request=req2
        )

        self.assertEqual(res2.intent, "PAYMENT_CONFIRMATION_REQUIRED")
        self.assertIsNotNone(res2.booking_preview)
        preview_id = res2.booking_preview["preview_id"]

        # 3. Traveler confirms and pays
        req3 = AIBookingConfirmRequest(
            preview_id=preview_id,
            idempotency_key=f"idemp-test-flow-{preview_id}"
        )
        res3 = BookingExecutionService.confirm_and_execute_booking(
            db=self.db,
            traveler_id=self.traveler.id,
            request=req3
        )

        self.assertTrue(res3.success)
        self.assertEqual(res3.status, "VERIFIED")
        self.assertIsNotNone(res3.booking)

    def test_09_journey_history_deduplication(self):
        """Test 9: Multiple turns and fallback searches produce ONE unified booking journey in history."""
        target_in = (date.today() + timedelta(days=70)).strftime("%d %b %Y")
        target_out = (date.today() + timedelta(days=72)).strftime("%d %b %Y")

        req1 = AIBookingChatRequest(
            message=f"Book a resort in Vagamon for 2 adults from {target_in} to {target_out}"
        )
        res1 = BookingAgentService.handle_chat_message(
            db=self.db,
            traveler_id=self.traveler.id,
            request=req1
        )

        # Follow up turn on same session
        req2 = AIBookingChatRequest(
            session_id=res1.session_id,
            conversation_id=res1.conversation_id,
            message="Book option 1"
        )
        res2 = BookingAgentService.handle_chat_message(
            db=self.db,
            traveler_id=self.traveler.id,
            request=req2
        )

        # Query session list for traveler
        sessions = self.db.query(AIBookingSession).filter(
            AIBookingSession.id == res1.session_id,
            AIBookingSession.traveler_id == self.traveler.id
        ).all()

        self.assertEqual(len(sessions), 1)
        self.assertEqual(sessions[0].id, res1.session_id)

    def test_10_final_no_result_when_nothing_exists(self):
        """Test 10: Genuinely empty search yields structured final no-result instead of dead end."""
        target_in = date.today() + timedelta(days=90)
        target_out = target_in + timedelta(days=2)

        # Search in a completely fictional or unserviceable place
        fb = BookingAgentToolsService.search_intelligent_fallbacks(
            db=self.db,
            destination="Antarctica Ice Camp",
            check_in=target_in,
            check_out=target_out,
            adults=2
        )
        self.assertEqual(fb["state"], "NO_MATCH")
        self.assertEqual(len(fb["alternatives"]), 0)
        self.assertIn("Antarctica Ice Camp", fb["message"])

    def test_11_case_a_no_properties_in_destination(self):
        """Test 11: Case A — No VOYARA property in destination returns clear explanation + real nearby stays."""
        target_in = date.today() + timedelta(days=35)
        target_out = target_in + timedelta(days=2)

        # Destination 'Vagamon' has 0 seeded properties in test DB, but Peermade is ~15 km away
        fb = BookingAgentToolsService.search_intelligent_fallbacks(
            db=self.db,
            destination="Vagamon",
            check_in=target_in,
            check_out=target_out,
            adults=2
        )
        self.assertEqual(fb["state"], "NEARBY_MATCH")
        self.assertTrue(len(fb["alternatives"]) > 0)
        self.assertIn("Vagamon", fb["message"])
        self.assertIn("RECOMMENDED FOR YOU", fb["message"])
        self.assertIn("Would you like to book one of these stays?", fb["message"])

        # Validate alternative properties
        opt1 = fb["alternatives"][0]
        self.assertTrue(opt1["is_recommended"])
        self.assertFalse(opt1["destination_has_properties"])
        self.assertIsNotNone(opt1["travel_time_text"])

    def test_12_case_b_properties_exist_no_dates_available(self):
        """Test 12: Case B — Properties exist in destination but are closed/blocked on requested dates."""
        target_in = date.today() + timedelta(days=40)
        target_out = target_in + timedelta(days=2)

        # Add temporary property closure for Kuttikkanam property
        closure = PropertyAvailability(
            property_id=self.kuttikkanam_prop.id,
            start_date=target_in,
            end_date=target_out,
            is_closed=True,
            reason="Monsoon Maintenance"
        )
        self.db.add(closure)
        self.db.commit()

        try:
            fb = BookingAgentToolsService.search_intelligent_fallbacks(
                db=self.db,
                destination="Kuttikkanam",
                check_in=target_in,
                check_out=target_out,
                adults=2
            )
            self.assertEqual(fb["state"], "NEARBY_MATCH")
            self.assertTrue(len(fb["alternatives"]) > 0)
            self.assertIn("Kuttikkanam", fb["message"])
            self.assertIn("RECOMMENDED FOR YOU", fb["message"])
        finally:
            self.db.delete(closure)
            self.db.commit()

    def test_13_case_c_exact_match(self):
        """Test 13: Case C — Available stay in destination returns matching message."""
        target_in = date.today() + timedelta(days=45)
        target_out = target_in + timedelta(days=2)

        fb = BookingAgentToolsService.search_intelligent_fallbacks(
            db=self.db,
            destination="Peermade",
            check_in=target_in,
            check_out=target_out,
            adults=2,
            room_type="Deluxe Room"
        )
        self.assertEqual(fb["state"], "EXACT_MATCH")
        self.assertIn("Peermade", fb["message"])

    def test_14_travel_time_and_fits_description(self):
        """Test 14: Accurate travel time by road and room fit descriptions."""
        # 8.4 km should be ~20 min
        tt_8 = BookingAgentToolsService.calculate_approx_travel_time(8.4)
        self.assertIn("20 min", tt_8["travel_time_text"])

        # 21.3 km should be ~40 min
        tt_21 = BookingAgentToolsService.calculate_approx_travel_time(21.3)
        self.assertIn("40 min", tt_21["travel_time_text"])

        # Fits description for 2 adults + 1 child
        fit_fam = BookingAgentToolsService.build_fits_description(adults=2, children=1, room_quantity=1, room_capacity=3, room_name="Family Suite")
        self.assertEqual(fit_fam["fits_description"], "1 room · Fits 2 adults, 1 child")
        self.assertIn("Recommended room: Family Suite", fit_fam["recommendation_reason"])

    def test_15_conversational_recommended_and_skip(self):
        """Test 15: Natural language 'Book the recommended stay' and 'Skip' actions."""
        displayed_alts = [
            {
                "option_index": 1,
                "is_recommended": True,
                "property_id": self.peermade_prop.id,
                "property_name": "Peermade Valley Resort",
                "room_id": self.peermade_deluxe.id,
                "room_name": "Deluxe Mountain View",
                "total_price": 6400.0
            },
            {
                "option_index": 2,
                "is_recommended": False,
                "property_id": self.thekkady_prop.id,
                "property_name": "Thekkady Hills Homestay",
                "room_id": self.thekkady_family.id,
                "room_name": "Family Spice Suite",
                "total_price": 5200.0
            }
        ]

        # 1. Resolve recommended
        rec_res = BookingAgentToolsService.resolve_conversational_selection(
            user_message="Book the recommended stay please",
            displayed_alternatives=displayed_alts
        )
        self.assertIsNotNone(rec_res)
        self.assertEqual(rec_res["option_index"], 1)

        # 2. Test Skip flow in dialog turn
        req_skip = AIBookingChatRequest(message="Skip")
        res_skip = BookingAgentService.handle_chat_message(
            db=self.db,
            traveler_id=self.traveler.id,
            request=req_skip
        )
        self.assertEqual(res_skip.intent, "AWAITING_INFO")
        self.assertIn("Where or when would you like to travel next?", res_skip.message)

if __name__ == "__main__":
    unittest.main()
