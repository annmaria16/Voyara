from datetime import date, datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class AIBookingChatRequest(BaseModel):
    message: str = Field(..., description="Natural language prompt or response from traveler")
    conversation_id: Optional[str] = Field(None, description="Client conversation tracking UUID")
    session_id: Optional[str] = Field(None, description="Existing AI booking session UUID")
    selected_property_id: Optional[int] = Field(None, description="Explicitly chosen property ID")
    selected_room_id: Optional[int] = Field(None, description="Explicitly chosen room ID")
    selected_alternative_index: Optional[int] = Field(None, description="Explicitly chosen alternative option number (1-based)")
    selected_adventure_ids: Optional[List[int]] = Field(default=[], description="Selected optional adventure IDs")
    selected_experience_ids: Optional[List[int]] = Field(default=[], description="Compatibility alias for selected adventure IDs")
    trip_context: Optional[Dict[str, Any]] = Field(default={}, description="Client-side journey context")
    action: Optional[str] = Field(None, description="Interactive client action e.g. CONFIRM_BOOKING, CHOOSE_PROPERTY, SELECT_ROOM, SELECT_ALTERNATIVE")

    def model_post_init(self, __context):
        if self.selected_experience_ids and not self.selected_adventure_ids:
            self.selected_adventure_ids = self.selected_experience_ids

class AIBookingPropertyCard(BaseModel):
    property_id: int
    property_name: str
    property_type: str
    city: str
    state: str
    address: str
    rating: float
    review_count: int
    starting_price_per_night: float
    cover_image: Optional[str] = None
    amenities: List[str] = []
    description: str

class AIBookingRoomCard(BaseModel):
    room_id: int
    property_id: int
    name: str
    room_type: str
    capacity: int
    price_per_night: float
    available_units: int
    amenities: List[str] = []
    images: List[str] = []
    description: Optional[str] = None

class AIBookingPreviewDetails(BaseModel):
    preview_id: str
    expires_at: datetime
    property_id: int
    property_name: str
    property_type: str
    city: str
    room_id: int
    room_name: str
    room_type: Optional[str] = None
    check_in: date
    check_out: date
    total_nights: int
    room_quantity: int
    adults: int
    children: int
    child_ages: List[int] = []
    cot_count: int = 0
    extra_bed_count: int = 0
    room_nightly_price: float
    room_total: float
    adventure_total: float = 0.0
    experience_total: float = 0.0
    supplements_total: float = 0.0
    total_price: float
    currency: str = "INR"
    cancellation_policy: str
    selected_configuration_label: Optional[str] = None
    important_to_know: List[str] = []
    rules_summary: Optional[Dict[str, Any]] = None

class VeriNovaVerificationReport(BaseModel):
    status: str  # VERIFIED, FAILED, MISMATCH, FALSE_SUCCESS_DETECTED, REQUIRES_REVIEW, WARNING
    booking_id: Optional[int] = None
    preview_id: Optional[str] = None
    verification_id: Optional[str] = None
    verinova_score: int = 100
    summary: str
    checks: Dict[str, Any] = {}
    detailed_checks: Optional[List[Dict[str, Any]]] = None
    blocking_failures: List[str] = []
    failure_reasons: Optional[str] = None
    verified_at: Optional[datetime] = None
    stage: str = "POST_BOOKING"  # PRE_BOOKING, POST_BOOKING, PAYMENT

class AIBookingChatResponse(BaseModel):
    session_id: str
    conversation_id: str
    message: str
    intent: str  # SEARCH, AWAITING_INFO, SELECTION_REQUIRED, BOOKING_CONFIRMATION_REQUIRED, BOOKING_VERIFIED, BOOKING_FAILED, MISMATCH, NO_AVAILABILITY
    requires_user_action: bool = False
    action: Optional[str] = None  # CONFIRM_BOOKING, SELECT_PROPERTY, SELECT_ROOM, PROVIDE_DATES, SELECT_ALTERNATIVE, SELECT_CONFIGURATION, MODIFY_REQUIREMENTS
    progress_step: Optional[str] = None
    search_state: Optional[str] = None  # EXACT_MATCH, CLOSE_MATCH, NEARBY_MATCH, ALTERNATIVE_DATE, NO_MATCH, CHOICE_AVAILABLE
    alternatives: List[Dict[str, Any]] = []
    configuration_choices: List[Dict[str, Any]] = []
    room_options: List[Dict[str, Any]] = []
    properties: List[Dict[str, Any]] = []
    rooms: List[Dict[str, Any]] = []
    booking_preview: Optional[Dict[str, Any]] = None
    booking: Optional[Dict[str, Any]] = None
    verification: Optional[Dict[str, Any]] = None
    context_snapshot: Optional[Dict[str, Any]] = None
    extracted_requirements: Optional[Dict[str, Any]] = None
    ai_verification_score: Optional[Dict[str, Any]] = None
    agent_status: Optional[Dict[str, Any]] = None
    step_progress: Optional[Dict[str, Any]] = None
    verinova_verification: Optional[Dict[str, Any]] = None
    suggested_destinations: List[Dict[str, Any]] = []
    location_options: List[Dict[str, Any]] = []

class AIBookingCreatePaymentOrderRequest(BaseModel):
    preview_id: str = Field(..., description="Server generated preview ID")
    idempotency_key: Optional[str] = Field(None, description="Unique idempotency key")
    customer_notes: Optional[str] = Field(None, description="Optional special requests")
    rules_accepted: bool = Field(True, description="Property and home rules acceptance")

class AIBookingVerifyPaymentRequest(BaseModel):
    preview_id: str = Field(..., description="Server generated preview ID")
    booking_id: int = Field(..., description="Booking ID returned by payment order")
    razorpay_order_id: str = Field(..., description="Razorpay order ID")
    razorpay_payment_id: str = Field(..., description="Razorpay payment ID")
    razorpay_signature: str = Field(..., description="Cryptographic HMAC-SHA256 signature from Razorpay")
    payment_method: Optional[str] = Field(None, description="Payment method used (upi, card, netbanking)")
    idempotency_key: Optional[str] = Field(None, description="Unique idempotency key")

class AIBookingConfirmRequest(BaseModel):
    preview_id: str = Field(..., description="Server generated preview ID to confirm")
    idempotency_key: Optional[str] = Field(None, description="Unique idempotency key preventing double booking on retries")
    rules_accepted: bool = Field(True, description="Must accept home rules before final booking")
    customer_notes: Optional[str] = Field(None, description="Optional special requests from traveler")
    razorpay_order_id: Optional[str] = Field(None, description="Optional Razorpay Order ID for verified payment")
    razorpay_payment_id: Optional[str] = Field(None, description="Optional Razorpay Payment ID for verified payment")
    razorpay_signature: Optional[str] = Field(None, description="Optional Razorpay Signature for verified payment")
    payment_method: Optional[str] = Field(None, description="Optional payment method")

class AIBookingConfirmResponse(BaseModel):
    success: bool
    status: str  # VERIFIED, MISMATCH, FAILED, BOOKING_REVALIDATION_REQUIRED, PAYMENT_VERIFICATION_FAILED
    message: str
    booking: Optional[Dict[str, Any]] = None
    verification: Optional[Dict[str, Any]] = None
    revalidation_error: Optional[str] = None

class AIResearchMetricsResponse(BaseModel):
    total_sessions: int
    total_bookings_attempted: int
    verified_count: int
    failed_count: int
    mismatch_count: int
    false_success_detected_count: int
    false_success_rate: float
    verification_accuracy: float
    failure_detection_rate: float
    task_completion_rate: float
    avg_execution_latency_ms: float
    avg_verification_latency_ms: float

class AIResearchLogItemResponse(BaseModel):
    id: int
    session_id: Optional[str] = None
    traveler_id: int
    traveler_email: Optional[str] = None
    task_type: str
    user_prompt: str
    booking_id: Optional[int] = None
    agent_claimed_outcome: str
    actual_outcome: str
    verification_outcome: str
    verification_failures: Optional[str] = None
    execution_latency_ms: int
    verification_latency_ms: int
    is_simulation: bool
    simulation_scenario: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AISimulationRequest(BaseModel):
    scenario: str  # simulate_price_mismatch, simulate_date_mismatch, simulate_room_mismatch, simulate_booking_failure, simulate_inventory_overflow
    destination: Optional[str] = None
    property_id: Optional[int] = None
    room_id: Optional[int] = None
    check_in: Optional[date] = None
    check_out: Optional[date] = None
    adults: int = 2
    children: int = 0
