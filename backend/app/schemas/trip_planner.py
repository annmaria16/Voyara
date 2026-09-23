from datetime import date, datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator, model_validator

# Supported Interest Categories
VALID_INTERESTS = [
    "NATURE",
    "ADVENTURE",
    "BEACHES",
    "MOUNTAINS",
    "SIGHTSEEING",
    "LOCAL_FOOD",
    "CULTURE",
    "HISTORY",
    "SHOPPING",
    "PHOTOGRAPHY",
    "FAMILY",
    "RELAXATION",
    "WILDLIFE",
    "OUTDOOR_ACTIVITIES",
    "NIGHTLIFE",
    "SPIRITUAL_HERITAGE"
]

# Supported Travel Styles
VALID_TRAVEL_STYLES = [
    "RELAXED",
    "BALANCED",
    "PACKED",
    "FAMILY_FRIENDLY",
    "ADVENTURE",
    "ROMANTIC"
]

# Supported Stay Types
VALID_STAY_TYPES = [
    "ANY",
    "Hotel",
    "Homestay",
    "Resort",
    "Camp",
    "Cottage",
    "Villa"
]

class TripPlannerRequest(BaseModel):
    destination: str = Field(..., min_length=2, description="Target city or destination region")
    start_date: date = Field(..., description="Check-in / start date of the trip")
    end_date: date = Field(..., description="Check-out / departure date of the trip")
    
    adults: int = Field(default=1, ge=1, le=20, description="Number of adult travelers (18+)")
    children: int = Field(default=0, ge=0, le=10, description="Number of children (under 18)")
    child_ages: List[int] = Field(default_factory=list, description="Ages of children")
    infants: int = Field(default=0, ge=0, le=5, description="Number of infants (under 2)")
    
    budget: Optional[float] = Field(default=None, description="Optional target budget in INR")
    budget_type: str = Field(default="TOTAL", description="Budget scope: 'TOTAL', 'ACCOMMODATION', or 'FLEXIBLE'")
    
    interests: List[str] = Field(default_factory=list, description="Traveler interests")
    travel_style: str = Field(default="BALANCED", description="Travel pacing / style")
    stay_type: str = Field(default="ANY", description="Preferred accommodation type")
    experience_preferences: List[str] = Field(default_factory=list, description="Preferred experience categories")
    special_requests: Optional[str] = Field(default=None, max_length=1000, description="Additional notes or constraints")

    @field_validator("destination")
    @classmethod
    def validate_destination(cls, v: str) -> str:
        clean = v.strip()
        if len(clean) < 2:
            raise ValueError("Destination must be at least 2 characters long.")
        return clean

    @field_validator("budget")
    @classmethod
    def validate_budget(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v < 0:
            raise ValueError("Budget cannot be negative.")
        return v

    @model_validator(mode="after")
    def validate_dates_and_children(self):
        if self.end_date <= self.start_date:
            raise ValueError("Trip end date must be strictly after the start date (minimum 1 night).")
        
        if self.children > 0 and len(self.child_ages) != self.children:
            # Auto-fill sensible default ages if traveler did not provide exact ages
            # but ensure length matches
            if not self.child_ages:
                self.child_ages = [6] * self.children
            elif len(self.child_ages) < self.children:
                self.child_ages.extend([6] * (self.children - len(self.child_ages)))
            else:
                self.child_ages = self.child_ages[:self.children]

        for age in self.child_ages:
            if age < 0 or age > 17:
                raise ValueError("Child age must be between 0 and 17.")

        return self

class TripPlannerRoomOption(BaseModel):
    room_id: int
    room_name: str
    room_type: str
    description: Optional[str] = None
    capacity: int
    max_adults: Optional[int] = None
    max_children: Optional[int] = None
    price_per_night: float
    total_nights: int
    room_subtotal: float
    child_charge_subtotal: float = 0.0
    total_stay_cost: float
    is_suitable_for_group: bool = True
    unsuitability_reason: Optional[str] = None
    image_url: Optional[str] = None
    images: List[str] = []
    amenities: List[str] = []
    rules_summary: Optional[str] = None

class TripPlannerPropertyOption(BaseModel):
    property_id: int
    property_name: str
    property_type: str
    city: str
    state: str
    address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    image_url: Optional[str] = None
    images: List[str] = []
    rating: float = 0.0
    review_count: int = 0
    amenities: List[str] = []
    description: Optional[str] = None
    check_in_time: str = "14:00"
    check_out_time: str = "11:00"
    starting_price_per_night: float
    total_stay_cost: float
    available_rooms: List[TripPlannerRoomOption] = []
    selected_room_id: Optional[int] = None
    is_selected: bool = False
    why_this_stay: Optional[str] = None

class TripPlannerStayCandidate(BaseModel):
    property_id: int
    property_name: str
    property_type: str
    city: str
    state: str
    address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    image_url: Optional[str] = None
    images: List[str] = []
    rating: float = 0.0
    review_count: int = 0
    amenities: List[str] = []
    check_in_time: str = "14:00"
    check_out_time: str = "11:00"
    
    # Selected Room Details
    room_id: int
    room_name: str
    room_type: str
    capacity: int
    price_per_night: float
    total_nights: int
    room_subtotal: float
    child_charge_subtotal: float = 0.0
    total_stay_cost: float
    why_this_stay: str

class TripPlannerExperienceCandidate(BaseModel):
    experience_id: int
    property_id: int
    property_name: str
    title: str
    experience_type: str
    description: str
    price: float
    pricing_model: str  # "per_person" or "fixed"
    duration: str
    start_time: str
    end_time: str
    image_url: Optional[str] = None
    scheduled_date: str
    day_number: int
    participants: int
    total_experience_cost: float
    capacity_available: int

class ExternalPlaceCandidate(BaseModel):
    source: str = "VERIFIED_CATALOG"  # "GOOGLE_PLACES", "OPENSTREETMAP", "VERIFIED_CATALOG"
    external_place_id: str
    name: str
    category: str
    description: str
    latitude: float
    longitude: float
    estimated_duration: str = "1.5 Hours"
    opening_hours: Optional[str] = None
    rating: Optional[float] = None
    photo_url: Optional[str] = None

class DestinationInfo(BaseModel):
    name: str
    tagline: Optional[str] = None
    description: Optional[str] = None
    hero_image: Optional[str] = None
    gallery_images: List[str] = []
    weather_note: Optional[str] = None
    best_time_to_visit: Optional[str] = None
    highlights: List[str] = []

class ItineraryItemResponse(BaseModel):
    item_id: str
    time_slot: str  # "Morning", "Afternoon", "Evening"
    start_time: str
    end_time: str
    title: str
    item_type: str  # STAY_CHECKIN, STAY_CHECKOUT, VOYARA_EXPERIENCE, EXTERNAL_ATTRACTION, MEAL_RECOMMENDATION, LEISURE_NOTE
    description: str
    category: Optional[str] = None
    photo_url: Optional[str] = None
    
    internal_id: Optional[int] = None
    external_provider: Optional[str] = None
    external_place_id: Optional[str] = None
    
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    
    cost: float = 0.0
    pricing_note: Optional[str] = None
    travel_time_minutes: int = 0
    distance_km: float = 0.0
    action_type: Optional[str] = None  # "VIEW_STAY", "BOOK_STAY", "VIEW_EXPERIENCE", "VIEW_MAP"

class ItineraryDayResponse(BaseModel):
    day_number: int
    date: str
    theme: str
    items: List[ItineraryItemResponse] = []

class PricingSummaryResponse(BaseModel):
    accommodation_total: float
    experiences_total: float
    known_cost: float
    currency: str = "INR"
    disclaimer: str = "This estimate includes your selected Voyara stay and verified experiences. Food, local transport, and personal expenses are not included."
    budget_status: str = "WITHIN_BUDGET"  # "WITHIN_BUDGET", "EXCEEDS_BUDGET", "FLEXIBLE", "NO_BUDGET_SET"
    budget_target: Optional[float] = None
    budget_difference: Optional[float] = None

class TripPlanResponse(BaseModel):
    trip: Dict[str, Any]
    stay: Optional[TripPlannerStayCandidate] = None
    available_stays: List[TripPlannerPropertyOption] = []
    nearby_stays: List[TripPlannerPropertyOption] = []
    destination_info: Optional[DestinationInfo] = None
    experiences: List[TripPlannerExperienceCandidate] = []
    external_places: List[ExternalPlaceCandidate] = []
    days: List[ItineraryDayResponse] = []
    pricing_summary: PricingSummaryResponse
    explanation: str
    validation_status: str = "PASSED"
    validation_messages: List[str] = []

class RegenerateDayRequest(BaseModel):
    trip_id: Optional[int] = None
    plan: TripPlanResponse
    day_number: int
    user_notes: Optional[str] = None

class SelectStayRequest(BaseModel):
    session_id: Optional[str] = None
    current_plan: TripPlanResponse
    property_id: int
    room_id: Optional[int] = None
    current_context: Optional[Dict[str, Any]] = None

class RevalidateTripResponse(BaseModel):
    trip_id: int
    has_changes: bool
    changes_summary: List[str] = []
    is_stay_available: bool = True
    is_experience_available: bool = True
    updated_plan: TripPlanResponse

class SaveTripRequest(BaseModel):
    name: Optional[str] = None
    plan: TripPlanResponse

class SavedTripSummaryResponse(BaseModel):
    id: int
    name: str
    destination: str
    start_date: str
    end_date: str
    total_days: int
    total_nights: int
    adults: int
    children: int
    estimated_known_cost: float
    currency: str
    stay_name: Optional[str] = None
    created_at: str
    updated_at: str

class SavedTripDetailResponse(BaseModel):
    id: int
    name: str
    destination: str
    start_date: str
    end_date: str
    total_days: int
    total_nights: int
    adults: int
    children: int
    child_ages: List[int]
    infants: int
    budget: Optional[float]
    budget_type: str
    travel_style: str
    stay_type: str
    interests: List[str]
    experience_preferences: List[str]
    special_requests: Optional[str]
    estimated_known_cost: float
    currency: str
    full_plan: TripPlanResponse
    revalidation_status: Optional[Dict[str, Any]] = None
    created_at: str
    updated_at: str

class TripChatContext(BaseModel):
    destination: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    duration_days: Optional[int] = None
    adults: Optional[int] = None
    children: Optional[int] = None
    child_ages: List[int] = []
    infants: Optional[int] = None
    budget: Optional[float] = None
    budget_type: Optional[str] = "TOTAL"
    budget_known: bool = True
    interests: List[str] = []
    travel_style: Optional[str] = None
    stay_type: Optional[str] = None
    special_requests: Optional[str] = None
    mobility_notes: Optional[str] = None
    food_preferences: Optional[str] = None
    selected_property_id: Optional[int] = None
    selected_room_id: Optional[int] = None
    selected_experience_ids: List[int] = []

class BudgetAnalysis(BaseModel):
    requested_budget: Optional[float] = None
    estimated_known_cost: float
    budget_difference: Optional[float] = None
    realistic_starting_estimate: float
    why_higher_explanation: Optional[str] = None
    what_fits: List[str] = []
    what_compromises: List[str] = []

class TripChatRequest(BaseModel):
    session_id: Optional[str] = None
    conversation_id: Optional[str] = None
    message: str
    current_context: Optional[TripChatContext] = None
    current_plan: Optional[TripPlanResponse] = None
    selected_property_id: Optional[int] = None
    selected_room_id: Optional[int] = None

class TripChatResponse(BaseModel):
    session_id: Optional[str] = None
    reply: str
    requires_input: bool = True
    missing_field: Optional[str] = None
    input_type: Optional[str] = None  # DATES, TRAVELERS, BUDGET, NONE
    trip_context: TripChatContext
    plan_status: Optional[str] = None  # EXACT_MATCH, CLOSE_MATCH, ROUGH_PLAN, NO_BOOKABLE_STAY, COLLECTING_INFO
    budget_analysis: Optional[BudgetAnalysis] = None
    trip_plan: Optional[TripPlanResponse] = None
    suggested_actions: List[str] = []
    action_type: Optional[str] = None  # PROCEED_TO_BOOKING, SAVE_TRIP, REGENERATE_DAY, SELECT_STAY, NONE
    booking_payload: Optional[Dict[str, Any]] = None
    booking_handoff: Optional[Dict[str, Any]] = None
    
    # Structured convenience fields matching API specification
    stays: List[TripPlannerPropertyOption] = []
    selected_stay: Optional[TripPlannerStayCandidate] = None
    room_options: List[TripPlannerRoomOption] = []
    selected_rooms: List[Any] = []
    experiences: List[TripPlannerExperienceCandidate] = []
    selected_experiences: List[Any] = []
    places: List[ExternalPlaceCandidate] = []
    itinerary: List[ItineraryDayResponse] = []
    budget: Optional[PricingSummaryResponse] = None


# Chat Session History Schemas
class ChatMessageItem(BaseModel):
    id: int
    sender: str
    text: str
    suggestions: List[str] = []
    budget_analysis: Optional[Dict[str, Any]] = None
    plan_status: Optional[str] = None
    action_type: Optional[str] = None
    booking_payload: Optional[Dict[str, Any]] = None
    created_at: str

class ChatSessionSummaryResponse(BaseModel):
    id: str
    title: str
    destination: Optional[str] = None
    message_count: int = 0
    last_message: Optional[str] = None
    created_at: str
    updated_at: str

class ChatSessionDetailResponse(BaseModel):
    id: str
    title: str
    destination: Optional[str] = None
    current_context: Optional[TripChatContext] = None
    current_plan: Optional[TripPlanResponse] = None
    messages: List[ChatMessageItem] = []
    created_at: str
    updated_at: str

class CreateChatSessionRequest(BaseModel):
    title: Optional[str] = "New Trip Plan"
    destination: Optional[str] = None
    initial_context: Optional[TripChatContext] = None

