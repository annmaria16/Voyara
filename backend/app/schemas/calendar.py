from datetime import date, datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel

class CalendarBookingDetail(BaseModel):
    booking_id: int
    booking_number: str
    customer_name: str
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    room_id: int
    room_name: str
    quantity: int
    check_in: date
    check_out: date
    status: str

class CalendarRoomInventoryDetail(BaseModel):
    room_id: int
    room_name: str
    room_type: str
    total_units: int
    booked_units: int
    blocked_units: int
    available_units: int
    price_per_night: float
    is_available: bool

class CalendarClosureDetail(BaseModel):
    id: int
    property_id: int
    start_date: date
    end_date: date
    reason: Optional[str] = "Property seasonal closure"

class CalendarBlockDetail(BaseModel):
    id: int
    room_id: int
    room_name: str
    start_date: date
    end_date: date
    reason: Optional[str] = "Room maintenance"

class CalendarDayDetail(BaseModel):
    date: str  # YYYY-MM-DD
    day: int   # 1..31
    day_of_week: int  # 0=Sun, 1=Mon, ..., 6=Sat
    status: str  # "AVAILABLE" | "PARTIALLY_BOOKED" | "BOOKED" | "PARTIALLY_BLOCKED" | "BLOCKED"
    booking_count: int
    booked_units: int
    blocked_units: int
    total_units: int
    available_units: int
    is_available: bool
    is_blocked: bool
    is_fully_booked: bool
    bookings: List[CalendarBookingDetail] = []
    room_inventory: List[CalendarRoomInventoryDetail] = []
    closures: List[CalendarClosureDetail] = []
    room_blocks: List[CalendarBlockDetail] = []

class CalendarSummary(BaseModel):
    total_days: int
    available_days: int
    booked_days_count: int
    blocked_days_count: int
    total_units: int
    total_rooms: int

class PropertyCalendarResponse(BaseModel):
    property_id: Optional[int] = None
    property_name: str
    year: int
    month: int
    month_name: str
    days: List[CalendarDayDetail] = []
    booked_dates: List[int] = []
    blocked_dates: List[int] = []
    summary: CalendarSummary
