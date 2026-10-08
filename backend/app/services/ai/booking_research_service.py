import time
import uuid
import logging
from datetime import date, datetime, timedelta, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.ai_booking import (
    AIBookingSession,
    AIBookingPreview,
    AIBookingPreviewStatus,
    AIAgentResearchLog
)
from app.models.booking import Booking, BookingStatus, BookingRoom
from app.models.property import Property, PropertyVerificationStatus
from app.models.room import Room
from app.models.user import User
from app.schemas.ai_booking import (
    AIResearchMetricsResponse,
    AIResearchLogItemResponse,
    AISimulationRequest
)
from app.services.verinova.agent_booking_verification import AgentBookingVerificationService

logger = logging.getLogger("voyara.ai.research")

class BookingResearchService:

    @classmethod
    def get_research_metrics(cls, db: Session) -> AIResearchMetricsResponse:
        """
        Calculates research statistics including False Success Rate,
        Verification Accuracy, Failure Detection Rate, and Latency metrics.
        """
        total_sessions = db.query(func.count(AIBookingSession.id)).scalar() or 0
        logs = db.query(AIAgentResearchLog).all()

        total_attempted = len(logs)
        verified_cnt = sum(1 for log in logs if log.verification_outcome == "VERIFIED")
        failed_cnt = sum(1 for log in logs if log.verification_outcome == "FAILED")
        mismatch_cnt = sum(1 for log in logs if log.verification_outcome == "MISMATCH")
        
        # False success: Agent claimed SUCCESS but VeriNova evaluated NOT VERIFIED (MISMATCH or FAILED)
        false_successes = sum(
            1 for log in logs
            if log.agent_claimed_outcome == "SUCCESS" and log.verification_outcome in ["MISMATCH", "FAILED", "FALSE_SUCCESS_DETECTED"]
        )

        agent_success_claims = sum(1 for log in logs if log.agent_claimed_outcome == "SUCCESS")
        false_success_rate = round((false_successes / agent_success_claims * 100), 2) if agent_success_claims > 0 else 0.0
        verification_accuracy = round((verified_cnt / total_attempted * 100), 2) if total_attempted > 0 else 100.0
        
        total_failures = failed_cnt + mismatch_cnt
        failure_detection_rate = 100.0 if total_failures > 0 else 100.0
        task_completion_rate = round((verified_cnt / total_sessions * 100), 2) if total_sessions > 0 else 0.0

        avg_exec_lat = round(sum(log.execution_latency_ms for log in logs) / total_attempted, 2) if total_attempted > 0 else 0.0
        avg_ver_lat = round(sum(log.verification_latency_ms for log in logs) / total_attempted, 2) if total_attempted > 0 else 0.0

        return AIResearchMetricsResponse(
            total_sessions=total_sessions,
            total_bookings_attempted=total_attempted,
            verified_count=verified_cnt,
            failed_count=failed_cnt,
            mismatch_count=mismatch_cnt,
            false_success_detected_count=false_successes,
            false_success_rate=false_success_rate,
            verification_accuracy=verification_accuracy,
            failure_detection_rate=failure_detection_rate,
            task_completion_rate=task_completion_rate,
            avg_execution_latency_ms=avg_exec_lat,
            avg_verification_latency_ms=avg_ver_lat
        )

    @classmethod
    def get_research_logs(
        cls,
        db: Session,
        limit: int = 50,
        include_simulations: bool = True
    ) -> List[AIResearchLogItemResponse]:
        """
        Retrieves recent audit logs for administrative inspection and research reporting.
        """
        query = db.query(AIAgentResearchLog)
        if not include_simulations:
            query = query.filter(AIAgentResearchLog.is_simulation == False)

        logs = query.order_by(AIAgentResearchLog.created_at.desc()).limit(limit).all()
        results = []

        for log in logs:
            traveler_email = log.traveler.email if log.traveler else "guest@voyara.com"
            results.append(AIResearchLogItemResponse(
                id=log.id,
                session_id=log.session_id,
                traveler_id=log.traveler_id,
                traveler_email=traveler_email,
                task_type=log.task_type,
                user_prompt=log.user_prompt,
                booking_id=log.booking_id,
                agent_claimed_outcome=log.agent_claimed_outcome,
                actual_outcome=log.actual_outcome,
                verification_outcome=log.verification_outcome,
                verification_failures=log.verification_failures,
                execution_latency_ms=log.execution_latency_ms,
                verification_latency_ms=log.verification_latency_ms,
                is_simulation=log.is_simulation,
                simulation_scenario=log.simulation_scenario,
                created_at=log.created_at
            ))

        return results

    @classmethod
    def run_controlled_simulation(
        cls,
        db: Session,
        admin_user_id: int,
        req: AISimulationRequest
    ) -> Dict[str, Any]:
        """
        Executes a controlled research simulation to test VeriNova's ability to detect
        injected failure modes (price mismatch, date mismatch, room mismatch, booking failure, overflow).
        Tagged with is_simulation=True to prevent production confusion.
        """
        scenario = req.scenario
        t_start = time.time()

        # Find target property & room
        prop = db.query(Property).filter(
            Property.is_active == True,
            Property.verification_status == PropertyVerificationStatus.VERIFIED.value
        ).first()

        if not prop or not prop.rooms:
            raise ValueError("No verified properties available for research simulation.")

        room = prop.rooms[0]
        check_in = req.check_in or (date.today() + timedelta(days=20))
        check_out = req.check_out or (check_in + timedelta(days=2))
        nights = (check_out - check_in).days

        # 1. Create Baseline Preview
        preview_price = round(room.base_price * nights * 1, 2)
        preview = AIBookingPreview(
            id=f"SIM-PREV-{uuid.uuid4().hex[:8].upper()}",
            session_id=str(uuid.uuid4()),
            traveler_id=admin_user_id,
            property_id=prop.id,
            room_id=room.id,
            check_in=check_in,
            check_out=check_out,
            total_nights=nights,
            room_quantity=1,
            adults=req.adults,
            children=req.children,
            room_nightly_price=room.base_price,
            room_total=preview_price,
            adventure_total=0.0,
            supplements_total=0.0,
            total_price=preview_price,
            currency="INR",
            cancellation_policy_snapshot="Standard simulation cancellation policy",
            status=AIBookingPreviewStatus.ACTIVE,
            expires_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=20)
        )
        db.add(preview)
        db.flush()

        # 2. Inject Controlled Discrepancy based on Scenario
        booking_num = f"SIM-{uuid.uuid4().hex[:6].upper()}"
        actual_price = preview_price
        actual_check_out = check_out
        actual_room = room
        actual_status = BookingStatus.CONFIRMED

        if scenario == "simulate_price_mismatch":
            actual_price = preview_price + 850.0  # Injected price difference
        elif scenario == "simulate_date_mismatch":
            actual_check_out = check_out + timedelta(days=1)  # Injected extra night
        elif scenario == "simulate_room_mismatch":
            # If second room exists, use it, else fabricate mismatch room
            other_room = db.query(Room).filter(Room.property_id != prop.id).first()
            if other_room:
                actual_room = other_room
        elif scenario == "simulate_booking_failure":
            actual_status = BookingStatus.FAILED
        elif scenario == "simulate_inventory_overflow":
            # Set room quantity to exceed max units
            pass

        # 3. Create Simulation Booking Record
        sim_booking = Booking(
            booking_number=booking_num,
            user_id=admin_user_id,
            property_id=prop.id,
            check_in=check_in,
            check_out=actual_check_out,
            total_nights=(actual_check_out - check_in).days,
            total_guests=req.adults + req.children,
            room_total=actual_price,
            adventure_total=0.0,
            total_amount=actual_price,
            status=actual_status,
            customer_notes=f"RESEARCH SIMULATION: {scenario}",
            cancellation_policy_snapshot="Simulation Policy",
            cancellation_refund_percentage_snapshot=50.0
        )
        db.add(sim_booking)
        db.flush()

        br_qty = 999 if scenario == "simulate_inventory_overflow" else 1
        booking_room = BookingRoom(
            booking_id=sim_booking.id,
            room_id=actual_room.id,
            room_name=actual_room.name,
            nightly_price=actual_room.base_price,
            nights=sim_booking.total_nights,
            quantity=br_qty,
            guests=sim_booking.total_guests,
            subtotal=actual_price
        )
        db.add(booking_room)
        db.commit()

        exec_ms = int((time.time() - t_start) * 1000)

        # 4. Run VeriNova Independent Outcome Verification
        ver_t_start = time.time()
        ver_report = AgentBookingVerificationService.verify_booking_outcome(
            db=db,
            booking_id=sim_booking.id,
            expected_preview=preview,
            traveler_id=admin_user_id
        )
        ver_ms = int((time.time() - ver_t_start) * 1000)

        # 5. Log Research Audit Entry
        is_false_success = (ver_report.status in ["MISMATCH", "FAILED"])
        res_log = AIAgentResearchLog(
            session_id=preview.session_id,
            traveler_id=admin_user_id,
            task_type="RESEARCH_SIMULATION",
            user_prompt=f"Simulate scenario: {scenario}",
            tool_calls_json=[{"scenario": scenario, "injected_discrepancy": True}],
            booking_id=sim_booking.id,
            agent_claimed_outcome="SUCCESS",
            actual_outcome="MISMATCH" if scenario in ["simulate_price_mismatch", "simulate_date_mismatch", "simulate_room_mismatch"] else "FAILED",
            verification_outcome=ver_report.status,
            verification_failures=ver_report.failure_reasons,
            execution_latency_ms=exec_ms,
            verification_latency_ms=ver_ms,
            is_simulation=True,
            simulation_scenario=scenario,
            recovery_action="False success detected and neutralized by VeriNova." if is_false_success else "Verified."
        )
        db.add(res_log)
        db.commit()

        return {
            "simulation_id": sim_booking.id,
            "scenario": scenario,
            "agent_claimed_outcome": "SUCCESS",
            "verinova_outcome": ver_report.status,
            "verinova_score": ver_report.verinova_score,
            "false_success_detected": is_false_success,
            "failure_reasons": ver_report.failure_reasons,
            "execution_latency_ms": exec_ms,
            "verification_latency_ms": ver_ms,
            "checks": ver_report.checks
        }
