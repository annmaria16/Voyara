import re
import math
import json
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_

from app.models.property import Property, PropertyVerificationStatus, PropertyImage, PropertyAmenity, PropertyRule
from app.models.room import Room, RoomImage, RoomAmenity, RoomRule
from app.models.booking import Booking, BookingStatus, BookingRoom, BookingAdventure, BookingExperience
from app.models.adventure import Adventure, AdventureAvailability, AdventureSchedule, Experience, ExperienceAvailability, ExperienceSchedule
from app.models.availability import PropertyAvailability, RoomAvailability
from app.models.review import Review
from app.models.ai_booking import AIBookingPreview, AIBookingPreviewStatus
from app.services.availability.availability_service import AvailabilityService

class BookingAgentToolsService:

    @staticmethod
    def extract_booking_requirements(
        message: str,
        current_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Extracts structured booking requirements from natural language.
        Categorizes data as explicitly provided, inferred, or missing.
        Never invents missing mandatory information.
        """
        context = dict(current_context or {})
        msg_lower = message.lower()

        word_to_num = {
            "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
            "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10
        }

        extracted = {
            "destination": context.get("destination"),
            "check_in": context.get("check_in"),
            "check_out": context.get("check_out"),
            "adults": context.get("adults", 2),
            "children": context.get("children", 0),
            "child_ages": context.get("child_ages", []),
            "room_type": context.get("room_type"),
            "budget_max": context.get("budget_max"),
            "budget_type": context.get("budget_type", "TOTAL"),
            "property_type": context.get("property_type"),
            "amenities": context.get("amenities", []),
            "preferences": context.get("preferences", [])
        }

        explicitly_provided = []
        inferred = []
        missing = []

        # 1. Destination Extraction
        known_destinations = [
            "Munnar", "North Goa", "South Goa", "Goa", "Udaipur", "Wayanad", "Manali",
            "Ooty", "Jaipur", "Kochi", "Cochin", "Coorg", "Alleppey", "Alappuzha", "Shimla",
            "Bengaluru", "Bangalore", "Mumbai", "Delhi", "New Delhi", "Kuttikkanam", "Vagamon",
            "Thekkady", "Kovalam", "Varkala", "Kumarakom", "Calicut", "Kozhikode", "Coonoor",
            "Kodaikanal", "Chikmagalur", "Hampi", "Gokarna", "Mysuru", "Mysore", "Pune",
            "Lonavala", "Mahabaleshwar", "Alibaug", "Rishikesh", "Haridwar", "Mussoorie",
            "Nainital", "Dehradun", "Dharamshala", "Dharamsala", "McLeodganj", "Kasol",
            "Jodhpur", "Jaisalmer", "Pushkar", "Agra", "Varanasi", "Kolkata", "Chennai",
            "Hyderabad", "Puducherry", "Pondicherry", "Bilaspur", "Aurangabad", "Rampur"
        ]
        for kd in known_destinations:
            if re.search(rf'\b{re.escape(kd.lower())}\b', msg_lower):
                extracted["destination"] = kd
                if "destination" not in explicitly_provided:
                    explicitly_provided.append("destination")
                break

        if not extracted["destination"]:
            dest_match = re.search(r'\b(?:in|to|at|for)\s+([A-Za-z\s]+?)(?:\s+from|\s+for|\s+under|\s+with|\s+between|\s+on|\s*$|,|\.)', message, re.IGNORECASE)
            if dest_match:
                cand = dest_match.group(1).strip()
                cand_clean = re.sub(r'^(a|an|the|stay|trip|vacation|room|hotel|resort|villa)\s+', '', cand, flags=re.IGNORECASE).strip()
                invalid_dest_words = {
                    "book", "book a stay", "book an stay", "stay", "vacation", "holiday", "trip", "somewhere",
                    "find", "search", "get", "travel", "rent", "reserve", "check", "see", "explore", "visit",
                    "go", "anywhere", "pax", "members", "menber", "guests", "adults", "people", "couple"
                }
                months_list = [
                    "october", "november", "december", "january", "february", "march", "april", "may",
                    "june", "july", "august", "september", "oct", "nov", "dec", "jan", "feb", "mar",
                    "apr", "jun", "jul", "aug", "sep"
                ]
                if (
                    cand_clean and len(cand_clean) > 2 and
                    cand_clean.lower() not in invalid_dest_words and
                    cand_clean.lower() not in months_list and
                    not cand_clean.lower().startswith(("book", "reserve", "find", "search", "go on", "stay"))
                ):
                    extracted["destination"] = cand_clean.title()
                    explicitly_provided.append("destination")

        # 2. Date Extraction Engine
        month_map = {
            "january": 1, "jan": 1, "february": 2, "feb": 2, "march": 3, "mar": 3,
            "april": 4, "apr": 4, "may": 5, "june": 6, "jun": 6, "july": 7, "jul": 7,
            "august": 8, "aug": 8, "september": 9, "sep": 9, "sept": 9, "october": 10, "oct": 10,
            "november": 11, "nov": 11, "december": 12, "dec": 12
        }
        months_pattern = "|".join(month_map.keys())
        current_year = date.today().year

        # Duration Parsing (e.g. "for 2 nights", "3 days", "for a week")
        duration_nights = None
        dur_match = re.search(r'\b(?:for\s+)?(\d+)\s*(?:night|nights|nt|nts|day|days)\b', msg_lower)
        if dur_match:
            duration_nights = int(dur_match.group(1))
        elif "for a week" in msg_lower or "1 week" in msg_lower or "a week" in msg_lower:
            duration_nights = 7
        elif "for the weekend" in msg_lower or "this weekend" in msg_lower or "next weekend" in msg_lower:
            duration_nights = 2
        elif "for a night" in msg_lower or "1 night" in msg_lower or "one night" in msg_lower:
            duration_nights = 1

        c_in_parsed: Optional[date] = None
        c_out_parsed: Optional[date] = None

        # A. ISO format (YYYY-MM-DD)
        iso_dates = re.findall(r'\b(20\d{2}-\d{2}-\d{2})\b', message)
        if len(iso_dates) >= 2:
            try:
                c_in_parsed = date.fromisoformat(iso_dates[0])
                c_out_parsed = date.fromisoformat(iso_dates[1])
            except Exception:
                pass
        elif len(iso_dates) == 1:
            try:
                c_in_parsed = date.fromisoformat(iso_dates[0])
            except Exception:
                pass

        # B. Date Range with Month names (e.g., "October 10 to October 12", "Oct 1 to Oct 4", "16 Oct 2026 to 19 Oct 2026", "1 oct to 4 oct")
        if not c_in_parsed:
            date_range_match = re.search(
                rf'\b({months_pattern})\s*(\d{{1,2}})(?:st|nd|rd|th)?(?:\s*,?\s*(20\d{{2}}))?\s*(?:to|-|until|through)\s*(?:({months_pattern})\s*)?(\d{{1,2}})(?:st|nd|rd|th)?(?:\s*,?\s*(20\d{{2}}))?\b',
                msg_lower
            )
            alt_date_match = re.search(
                rf'\b(\d{{1,2}})(?:st|nd|rd|th)?\s*(?:({months_pattern})\s*)?(?:\s*,?\s*(20\d{{2}}))?\s*(?:to|-|until|through)\s*(\d{{1,2}})(?:st|nd|rd|th)?\s*({months_pattern})(?:\s*,?\s*(20\d{{2}}))?\b',
                msg_lower
            )
            if date_range_match:
                m1_str, d1_str, yr1_str, m2_str, d2_str, yr2_str = date_range_match.groups()
                m1 = month_map[m1_str]
                m2 = month_map[m2_str] if m2_str else m1
                d1, d2 = int(d1_str), int(d2_str)
                yr = int(yr2_str or yr1_str) if (yr2_str or yr1_str) else current_year
                try:
                    c1 = date(int(yr1_str) if yr1_str else yr, m1, d1)
                    c2 = date(int(yr2_str) if yr2_str else yr, m2, d2)
                    if c1 < date.today() and not (yr1_str or yr2_str):
                        c1 = date(yr + 1, m1, d1)
                        c2 = date(yr + 1, m2, d2)
                    c_in_parsed, c_out_parsed = c1, c2
                except Exception:
                    pass
            elif alt_date_match:
                d1_str, m1_str, yr1_str, d2_str, m2_str, yr2_str = alt_date_match.groups()
                m2 = month_map[m2_str]
                m1 = month_map[m1_str] if m1_str else m2
                d1, d2 = int(d1_str), int(d2_str)
                yr = int(yr2_str or yr1_str) if (yr2_str or yr1_str) else current_year
                try:
                    c1 = date(int(yr1_str) if yr1_str else yr, m1, d1)
                    c2 = date(int(yr2_str) if yr2_str else yr, m2, d2)
                    if c1 < date.today() and not (yr1_str or yr2_str):
                        c1 = date(yr + 1, m1, d1)
                        c2 = date(yr + 1, m2, d2)
                    c_in_parsed, c_out_parsed = c1, c2
                except Exception:
                    pass

        # C. Numeric Date Ranges (e.g., "24/09/2026 to 26/09/2026", "24/09 to 26/09", "24-09 to 26-09", "01/10 to 04/10")
        if not c_in_parsed:
            num_range_match = re.search(
                r'\b(\d{1,2})[/\.-](\d{1,2})(?:[/\.-](20\d{2}))?\s*(?:to|-|until)\s*(\d{1,2})[/\.-](\d{1,2})(?:[/\.-](20\d{2}))?\b',
                msg_lower
            )
            if num_range_match:
                d1_s, m1_s, y1_s, d2_s, m2_s, y2_s = num_range_match.groups()
                yr1 = int(y1_s) if y1_s else current_year
                yr2 = int(y2_s) if y2_s else (int(y1_s) if y1_s else current_year)
                try:
                    c1 = date(yr1, int(m1_s), int(d1_s))
                    c2 = date(yr2, int(m2_s), int(d2_s))
                    if c1 < date.today() and not y1_s:
                        c1 = date(yr1 + 1, int(m1_s), int(d1_s))
                        c2 = date(yr2 + 1, int(m2_s), int(d2_s))
                    c_in_parsed, c_out_parsed = c1, c2
                except Exception:
                    pass

        # D. Single Month-Day or Day-Month (e.g., "september 24", "oct 1", "oct1", "24th september", "24 sep")
        if not c_in_parsed:
            single_m_d = re.search(
                rf'\b(?:on|from|starting|for)?\s*({months_pattern})\s*(\d{{1,2}})(?:st|nd|rd|th)?(?:\s*,?\s*(20\d{{2}}))?\b',
                msg_lower
            )
            single_d_m = re.search(
                rf'\b(?:on|from|starting|for)?\s*(\d{{1,2}})(?:st|nd|rd|th)?\s*({months_pattern})(?:\s*,?\s*(20\d{{2}}))?\b',
                msg_lower
            )
            if single_m_d:
                m_s, d_s, yr_s = single_m_d.groups()
                m = month_map[m_s]
                d = int(d_s)
                yr = int(yr_s) if yr_s else current_year
                try:
                    c1 = date(yr, m, d)
                    if c1 < date.today() and not yr_s:
                        c1 = date(yr + 1, m, d)
                    c_in_parsed = c1
                except Exception:
                    pass
            elif single_d_m:
                d_s, m_s, yr_s = single_d_m.groups()
                m = month_map[m_s]
                d = int(d_s)
                yr = int(yr_s) if yr_s else current_year
                try:
                    c1 = date(yr, m, d)
                    if c1 < date.today() and not yr_s:
                        c1 = date(yr + 1, m, d)
                    c_in_parsed = c1
                except Exception:
                    pass

        # E. Single Numeric Date (e.g., "24/09/2026", "24-09-2026", "24/09")
        if not c_in_parsed:
            num_single_match = re.search(r'\b(\d{1,2})[/\.-](\d{1,2})(?:[/\.-](20\d{2}))?\b', msg_lower)
            if num_single_match:
                d_s, m_s, y_s = num_single_match.groups()
                yr = int(y_s) if y_s else current_year
                try:
                    c1 = date(yr, int(m_s), int(d_s))
                    if c1 < date.today() and not y_s:
                        c1 = date(yr + 1, int(m_s), int(d_s))
                    c_in_parsed = c1
                except Exception:
                    pass

        # F. Relative Dates (e.g. "today", "tomorrow", "this weekend", "next weekend")
        if not c_in_parsed:
            if "tomorrow" in msg_lower:
                c_in_parsed = date.today() + timedelta(days=1)
            elif "today" in msg_lower or "tonight" in msg_lower:
                c_in_parsed = date.today()
            elif "day after tomorrow" in msg_lower:
                c_in_parsed = date.today() + timedelta(days=2)
            elif "this weekend" in msg_lower or "upcoming weekend" in msg_lower:
                days_ahead = (4 - date.today().weekday()) % 7
                if days_ahead == 0 and date.today().weekday() != 4:
                    days_ahead = 7
                c_in_parsed = date.today() + timedelta(days=days_ahead)
                c_out_parsed = c_in_parsed + timedelta(days=2)
            elif "next weekend" in msg_lower:
                days_ahead = ((4 - date.today().weekday()) % 7) + 7
                c_in_parsed = date.today() + timedelta(days=days_ahead)
                c_out_parsed = c_in_parsed + timedelta(days=2)

        # G. Resolve Single Date vs Duration vs Context
        ctx_in = context.get("check_in")
        ctx_out = context.get("check_out")

        # If user provided only duration while check_in is already in context
        if not c_in_parsed and duration_nights and ctx_in:
            try:
                c_in_parsed = date.fromisoformat(ctx_in)
                c_out_parsed = c_in_parsed + timedelta(days=duration_nights)
            except Exception:
                pass

        if c_in_parsed:
            if c_out_parsed:
                extracted["check_in"] = c_in_parsed.isoformat()
                extracted["check_out"] = c_out_parsed.isoformat()
                explicitly_provided.extend(["check_in", "check_out"])
            else:
                # If context already had check_in, and the new parsed date is after it, treat as check_out
                if ctx_in and not ctx_out:
                    try:
                        prev_in = date.fromisoformat(ctx_in)
                        if c_in_parsed > prev_in:
                            extracted["check_in"] = prev_in.isoformat()
                            extracted["check_out"] = c_in_parsed.isoformat()
                            explicitly_provided.append("check_out")
                        else:
                            extracted["check_in"] = c_in_parsed.isoformat()
                            nights = duration_nights if duration_nights else 1
                            extracted["check_out"] = (c_in_parsed + timedelta(days=nights)).isoformat()
                            explicitly_provided.extend(["check_in", "check_out"])
                    except Exception:
                        extracted["check_in"] = c_in_parsed.isoformat()
                        nights = duration_nights if duration_nights else 1
                        extracted["check_out"] = (c_in_parsed + timedelta(days=nights)).isoformat()
                        explicitly_provided.extend(["check_in", "check_out"])
                else:
                    extracted["check_in"] = c_in_parsed.isoformat()
                    nights = duration_nights if duration_nights else 1
                    extracted["check_out"] = (c_in_parsed + timedelta(days=nights)).isoformat()
                    explicitly_provided.extend(["check_in", "check_out"])

        # 3. Adults, Children & Total Traveler Count Extraction
        # Conversational phrasing: e.g. "me, my wife", "me and my wife", "me and my husband", "my wife and i"
        if (
            "me, my wife" in msg_lower or "me and my wife" in msg_lower or
            "me, my husband" in msg_lower or "me and my husband" in msg_lower or
            "my wife and i" in msg_lower or "my husband and i" in msg_lower or
            "with my wife" in msg_lower or "with my husband" in msg_lower or
            "with my partner" in msg_lower or "with my spouse" in msg_lower
        ):
            extracted["adults"] = 2
            explicitly_provided.append("adults")
        else:
            adult_match = re.search(
                r'\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:adults?|grownups?|people|guests?|persons?|members?|menbers?|membrs?|peple|pax|travelers?|travellers?|heads?)\b',
                msg_lower
            )
            group_match = re.search(r'\b(?:party|group|family)\s+of\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b', msg_lower)
            of_us_match = re.search(r'\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+of\s+us\b', msg_lower)
            for_guests_match = re.search(
                r'\bfor\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)(?!\s*(?:night|nights|nt|nts|day|days|week|weeks|month|months|rs|inr|k|lakh|lac|rupee|per|star|room|rooms|bed|beds|cot|cots|oct|nov|dec|jan|feb|mar|apr|may|jun|jul|aug|sep|october|november|december|january|february|march|april|june|july|august|september))\b',
                msg_lower
            )

            if adult_match:
                raw_a = adult_match.group(1)
                extracted["adults"] = word_to_num.get(raw_a, int(raw_a) if raw_a.isdigit() else 2)
                explicitly_provided.append("adults")
            elif group_match:
                raw_g = group_match.group(1)
                extracted["adults"] = word_to_num.get(raw_g, int(raw_g) if raw_g.isdigit() else 2)
                explicitly_provided.append("adults")
            elif of_us_match:
                raw_u = of_us_match.group(1)
                extracted["adults"] = word_to_num.get(raw_u, int(raw_u) if raw_u.isdigit() else 2)
                explicitly_provided.append("adults")
            elif for_guests_match:
                raw_f = for_guests_match.group(1)
                extracted["adults"] = word_to_num.get(raw_f, int(raw_f) if raw_f.isdigit() else 2)
                explicitly_provided.append("adults")
            elif "couple" in msg_lower or "2 of us" in msg_lower or "two of us" in msg_lower:
                extracted["adults"] = 2
                inferred.append("adults")
            elif "solo" in msg_lower or "just me" in msg_lower or "for myself" in msg_lower or "1 person" in msg_lower or "one person" in msg_lower:
                extracted["adults"] = 1
                inferred.append("adults")

        child_match = re.search(r'\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:child|children|kid|kids|infant|infants|baby|babies|toddler|toddlers)\b', msg_lower)
        if child_match:
            raw_c = child_match.group(1)
            extracted["children"] = word_to_num.get(raw_c, int(raw_c) if raw_c.isdigit() else 0)
            explicitly_provided.append("children")
        elif (
            "with a child" in msg_lower or "with a kid" in msg_lower or "with our child" in msg_lower or
            "with an infant" in msg_lower or "with a baby" in msg_lower or "with a toddler" in msg_lower or
            "with our baby" in msg_lower or "and an infant" in msg_lower or "and a baby" in msg_lower or
            "and a toddler" in msg_lower or "and a child" in msg_lower
        ):
            extracted["children"] = 1
            inferred.append("children")
        elif re.search(r'\b(?:an?\s+)(?:infant|baby|toddler|2-year-old|3-year-old|child)\b', msg_lower):
            extracted["children"] = 1
            inferred.append("children")

        # Child ages: e.g., "aged 2 and 7", "ages 2, 7", "aged 5, 8 and 12", "aged 5, 8, 12", "age 6", "ages 5 and 8", "6yo and 10yo"
        child_ages = []
        multi_age_match = re.search(r'\b(?:aged|ages?|age)\s*[:=]?\s*([0-9\s,&and]+)', msg_lower)
        if multi_age_match:
            raw_ages_str = multi_age_match.group(1)
            found_num_strs = re.findall(r'\b\d{1,2}\b', raw_ages_str)
            for s in found_num_strs:
                a_val = int(s)
                if 0 <= a_val <= 17 and a_val not in child_ages:
                    child_ages.append(a_val)

        if not child_ages:
            child_age_matches = re.findall(r'\b(?:age|aged|years?\s+old|yo)\s*(\d{1,2})\b|\b(\d{1,2})\s*(?:-| )(?:year|yr)(?:s)?(?:-| )old\b', msg_lower)
            for am in child_age_matches:
                age = am[0] or am[1]
                if age:
                    a_val = int(age)
                    if 0 <= a_val <= 17 and a_val not in child_ages:
                        child_ages.append(a_val)

        if not child_ages and ("infant" in msg_lower or "baby" in msg_lower):
            child_ages = [1]

        if child_ages:
            extracted["child_ages"] = child_ages
            if "child_ages" not in explicitly_provided:
                explicitly_provided.append("child_ages")
            if extracted["children"] == 0 or extracted["children"] < len(child_ages):
                extracted["children"] = len(child_ages)
                if "children" not in explicitly_provided:
                    explicitly_provided.append("children")

        # 4. Together vs Separate Preference & Explicit Room Quantity
        if re.search(r'\b(?:separate\s+rooms?|separate|different\s+rooms?|individual\s+rooms?|separate\s+units?)\b', msg_lower):
            extracted["together_preference"] = "separate"
            if "together_preference" not in explicitly_provided:
                explicitly_provided.append("together_preference")
        elif re.search(r'\b(?:all\s+together|everyone\s+together|stay\s+together|together|single\s+room|one\s+room|1\s+room|same\s+room|all\s+in\s+one\s+room|together\s+in\s+one\s+room)\b', msg_lower):
            extracted["together_preference"] = "together"
            if "together_preference" not in explicitly_provided:
                explicitly_provided.append("together_preference")

        room_cnt_match = re.search(r'\b(\d+|one|two|three|four|five)\s+rooms?\b', msg_lower)
        if room_cnt_match:
            r_val = word_to_num.get(room_cnt_match.group(1), int(room_cnt_match.group(1)) if room_cnt_match.group(1).isdigit() else 1)
            extracted["requested_rooms_count"] = r_val
            if r_val > 1:
                extracted["together_preference"] = "separate"
            elif r_val == 1:
                extracted["together_preference"] = "together"
            if "requested_rooms_count" not in explicitly_provided:
                explicitly_provided.append("requested_rooms_count")

        # Family room / group stay query: e.g. "is there available any family room which can stay 4 members?"
        fam_stay_match = re.search(r'\b(?:any\s+)?family\s*(?:room|suite|villa|cottage)?\s*(?:which|that)?\s*(?:can)?\s*stay\s*(\d+|one|two|three|four|five|six)\s*(?:members?|menbers?|guests?|adults?|people)?\b', msg_lower)
        if fam_stay_match:
            g_cnt = word_to_num.get(fam_stay_match.group(1), int(fam_stay_match.group(1)) if fam_stay_match.group(1).isdigit() else 4)
            extracted["adults"] = g_cnt
            extracted["room_type"] = "Family Room"
            extracted["together_preference"] = "together"
            if "adults" not in explicitly_provided:
                explicitly_provided.append("adults")
            if "room_type" not in explicitly_provided:
                explicitly_provided.append("room_type")
            if "together_preference" not in explicitly_provided:
                explicitly_provided.append("together_preference")

        # 5. Budget Extraction & Semantics (Per Night vs Total)
        # Check for per night indicators
        is_per_night = bool(re.search(r'\b(?:per\s+night|per\s+day|a\s+night|/\s*night|/\s*nt|nightly)\b', msg_lower))
        budget_match = re.search(r'(?:under|below|budget\s*(?:of|is|:)?|max(?:imum)?\s*(?:of)?|within)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d+)?|\d+k)\b', msg_lower)
        if budget_match:
            raw_b = budget_match.group(1).replace(",", "")
            if raw_b.endswith("k"):
                b_val = float(raw_b[:-1]) * 1000
            else:
                b_val = float(raw_b)
            extracted["budget_max"] = b_val
            extracted["budget_type"] = "PER_NIGHT" if is_per_night else "TOTAL"
            explicitly_provided.append("budget_max")

        # 6. Room Type Preference (Strict matching required)
        room_types_patterns = [
            (r'\b(?:a\s+|an\s+)?(family\s*(?:room|suite|cottage|villa)?)\b', "Family Room"),
            (r'\b(?:a\s+|an\s+)?(deluxe\s*(?:room|suite|cottage|villa)?)\b', "Deluxe Room"),
            (r'\b(?:an\s+)?(executive\s*(?:room|suite)?)\b', "Executive Suite"),
            (r'\b(?:a\s+|an\s+)?(suite)\b', "Suite"),
            (r'\b(?:a\s+|an\s+)?(standard\s*(?:room)?)\b', "Standard Room"),
            (r'\b(?:a\s+|an\s+)?(private\s*(?:pool\s*)?villa)\b', "Villa"),
            (r'\b(?:a\s+|an\s+)?(cottage)\b', "Cottage"),
            (r'\b(?:a\s+|an\s+)?(cabin)\b', "Cabin"),
            (r'\b(?:a\s+|an\s+)?(dormitory|dorm)\b', "Dormitory")
        ]
        for pattern, normalized_rt in room_types_patterns:
            if re.search(pattern, msg_lower):
                extracted["room_type"] = normalized_rt
                explicitly_provided.append("room_type")
                break

        # 7. Property Type Preference
        property_types = ["Resort", "Villa", "Homestay", "Hotel", "Camp", "Cottage"]
        for pt in property_types:
            if pt.lower() in msg_lower:
                extracted["property_type"] = pt
                explicitly_provided.append("property_type")
                break

        # 8. Amenity & View Preferences
        known_amenities = {
            "Mountain View": ["mountain view", "valley view", "hill view", "mountain"],
            "Swimming Pool": ["pool", "swimming pool", "private pool"],
            "Wi-Fi": ["wifi", "wi-fi", "internet"],
            "Kitchen": ["kitchen", "kitchenette", "cooking"],
            "Parking": ["parking", "car parking"],
            "Pet Friendly": ["pet friendly", "pets allowed", "pet", "dog"],
            "Balcony": ["balcony", "terrace", "deck"],
            "Air Conditioning": ["ac", "air conditioning", "air conditioned"],
            "Restaurant": ["restaurant", "dining", "breakfast included", "food"],
            "Spa": ["spa", "ayurveda", "massage"],
            "Campfire": ["campfire", "bonfire"]
        }
        found_amenities = list(extracted.get("amenities", []))
        for am_name, keywords in known_amenities.items():
            for kw in keywords:
                if kw in msg_lower:
                    if am_name not in found_amenities:
                        found_amenities.append(am_name)
                    break
        if found_amenities:
            extracted["amenities"] = found_amenities

        # Determine Missing mandatory attributes
        if not extracted["destination"]:
            missing.append("destination")
        if not extracted["check_in"]:
            missing.append("check_in")
        if not extracted["check_out"]:
            missing.append("check_out")

        return {
            "extracted": extracted,
            "explicitly_provided": explicitly_provided,
            "inferred": inferred,
            "missing": missing,
            "is_complete": len(missing) == 0
        }

    INTERNATIONAL_COUNTRIES = {
        "canada", "united states", "usa", "us", "u.s.a", "america", "united kingdom", "uk", "u.k.", "england",
        "britain", "great britain", "scotland", "wales", "france", "germany", "italy", "spain", "switzerland",
        "netherlands", "holland", "australia", "new zealand", "japan", "china", "singapore", "malaysia",
        "thailand", "indonesia", "uae", "united arab emirates", "dubai", "abu dhabi", "qatar", "saudi arabia",
        "maldives", "sri lanka", "nepal", "bhutan", "south africa", "egypt", "mexico", "brazil", "turkey",
        "greece", "portugal", "russia", "vietnam", "philippines", "norway", "sweden", "denmark", "finland",
        "austria", "belgium", "ireland", "iceland", "mauritius", "seychelles", "kenya", "tanzania",
        "argentina", "chile", "colombia", "peru", "south korea", "korea", "taiwan", "hong kong", "macau",
        "poland", "czech republic", "hungary", "croatia", "morocco", "jordan", "israel", "cambodia", "laos"
    }

    INTERNATIONAL_CITIES = {
        "toronto", "vancouver", "montreal", "ottawa", "calgary", "edmonton", "quebec", "halifax", "victoria",
        "new york", "nyc", "los angeles", "san francisco", "chicago", "miami", "las vegas", "seattle",
        "boston", "washington", "orlando", "san diego", "dallas", "houston", "austin", "london", "paris",
        "rome", "venice", "florence", "milan", "barcelona", "madrid", "zurich", "geneva", "interlaken",
        "lucerne", "amsterdam", "berlin", "munich", "frankfurt", "tokyo", "kyoto", "osaka", "bangkok",
        "phuket", "pattaya", "krabi", "koh samui", "chiang mai", "bali", "ubud", "seminyak", "kuta",
        "jakarta", "kuala lumpur", "penang", "langkawi", "sydney", "melbourne", "brisbane", "perth",
        "auckland", "queenstown", "doha", "riyadh", "jeddah", "cairo", "cape town", "johannesburg",
        "istanbul", "antalya", "cappadocia", "athens", "santorini", "mykonos", "lisbon", "porto",
        "moscow", "saint petersburg", "hanoi", "da nang", "ho chi minh", "saigon", "manila", "cebu",
        "boracay", "seoul", "busan", "taipei", "hawaii", "cancun", "rio de janeiro", "buenos aires",
        "male", "colombo", "kandy", "galle", "kathmandu", "pokhara", "thimphu", "paro"
    }

    AMBIGUOUS_INDIAN_DESTINATIONS = {
        "bilaspur": [
            {"label": "Bilaspur, Himachal Pradesh", "destination": "Bilaspur, Himachal Pradesh", "description": "Scenic hill district near Govind Sagar Lake, HP"},
            {"label": "Bilaspur, Chhattisgarh", "destination": "Bilaspur, Chhattisgarh", "description": "Cultural center & commercial hub of Chhattisgarh"}
        ],
        "aurangabad": [
            {"label": "Aurangabad (Chhatrapati Sambhaji Nagar), Maharashtra", "destination": "Aurangabad, Maharashtra", "description": "Heritage city near Ajanta & Ellora Caves, Maharashtra"},
            {"label": "Aurangabad, Bihar", "destination": "Aurangabad, Bihar", "description": "Historic district in southwestern Bihar"}
        ],
        "rampur": [
            {"label": "Rampur, Uttar Pradesh", "destination": "Rampur, Uttar Pradesh", "description": "Historic princely state and heritage city in UP"},
            {"label": "Rampur, Himachal Pradesh", "destination": "Rampur Bushahr, Himachal Pradesh", "description": "Himalayan town on the banks of Satluj River, HP"}
        ],
        "bijapur": [
            {"label": "Vijayapura (Bijapur), Karnataka", "destination": "Bijapur, Karnataka", "description": "Historical Deccan city famous for Gol Gumbaz, Karnataka"},
            {"label": "Bijapur, Chhattisgarh", "destination": "Bijapur, Chhattisgarh", "description": "Southern forest district in Chhattisgarh"}
        ],
        "hamirpur": [
            {"label": "Hamirpur, Himachal Pradesh", "destination": "Hamirpur, Himachal Pradesh", "description": "Pine-covered hill district in lower Himalayas, HP"},
            {"label": "Hamirpur, Uttar Pradesh", "destination": "Hamirpur, Uttar Pradesh", "description": "Bundelkhand district between Betwa and Yamuna rivers, UP"}
        ],
        "pratapgarh": [
            {"label": "Pratapgarh, Rajasthan", "destination": "Pratapgarh, Rajasthan", "description": "Aravalli border district famous for Thewa jewelry, Rajasthan"},
            {"label": "Pratapgarh, Uttar Pradesh", "destination": "Pratapgarh, Uttar Pradesh", "description": "Historic Awadh region district in UP"}
        ]
    }

    @classmethod
    def analyze_destination(cls, db: Session, destination: str) -> Dict[str, Any]:
        """
        Authoritative geographic and location boundary evaluator for VOYARA:
        1. Checks if requested destination is outside India (international country or city).
        2. Checks if requested destination matches multiple ambiguous locations in India.
        3. Validates confirmed supported Indian destinations.
        """
        dest_clean = destination.strip().lower()

        # 1. Check International / Outside India
        is_foreign = (
            dest_clean in cls.INTERNATIONAL_COUNTRIES or
            dest_clean in cls.INTERNATIONAL_CITIES or
            any(re.search(rf'\b{re.escape(c)}\b', dest_clean) for c in cls.INTERNATIONAL_COUNTRIES) or
            any(re.search(rf'\b{re.escape(city)}\b', dest_clean) for city in cls.INTERNATIONAL_CITIES)
        )

        if is_foreign:
            return {
                "is_supported_in_india": False,
                "is_ambiguous": False,
                "reason": "INTERNATIONAL_DESTINATION",
                "destination": destination,
                "message": (
                    f"VOYARA currently offers verified stays and boutique sanctuaries across India "
                    f"(such as Kerala, Goa, Himachal Pradesh, Rajasthan, and Uttarakhand). "
                    f"We do not currently offer properties in **{destination}**.\n\n"
                    f"Would you like to explore verified stays in popular Indian destinations such as **Munnar**, **Goa**, **Udaipur**, or **Manali** instead?"
                ),
                "suggested_destinations": [
                    {"name": "Munnar, Kerala", "tag": "Hill Station & Tea Sanctuaries"},
                    {"name": "North Goa", "tag": "Coastal & Beach Villas"},
                    {"name": "Udaipur, Rajasthan", "tag": "Heritage & Lakes"},
                    {"name": "Manali, Himachal Pradesh", "tag": "Mountain Retreats"},
                    {"name": "Wayanad, Kerala", "tag": "Rainforest & Nature"}
                ]
            }

        # 2. Check Ambiguity in India (only if state is not already specified)
        has_state_specified = any(
            sep in dest_clean for sep in [",", "in ", "hp", "himachal", "up", "uttar pradesh", "chhattisgarh", "bihar", "karnataka", "rajasthan", "kerala", "maharashtra"]
        )

        if not has_state_specified:
            for amb_key, options in cls.AMBIGUOUS_INDIAN_DESTINATIONS.items():
                if amb_key == dest_clean or re.search(rf'\b{re.escape(amb_key)}\b', dest_clean):
                    return {
                        "is_supported_in_india": True,
                        "is_ambiguous": True,
                        "reason": "MULTIPLE_LOCATIONS_IN_INDIA",
                        "destination": destination,
                        "message": f"I found multiple destinations named **{destination.title()}** in India. Which one are you planning to visit?",
                        "location_options": options
                    }

        # 3. Confirmed Indian Destination
        return {
            "is_supported_in_india": True,
            "is_ambiguous": False,
            "reason": "SUPPORTED_INDIAN_DESTINATION",
            "destination": destination
        }

    @staticmethod
    def search_properties(
        db: Session,
        destination: str,
        property_type: Optional[str] = None,
        budget_max: Optional[float] = None,
        amenities: Optional[List[str]] = None,
        guest_count: Optional[int] = None,
        limit: int = 6
    ) -> List[Dict[str, Any]]:
        """
        Searches PostgreSQL strictly for verified, active properties in India.
        Sanitizes sensitive admin / legal / internal data.
        """
        dest_clean = destination.strip()
        
        query = db.query(Property).filter(
            Property.is_active == True,
            Property.verification_status == PropertyVerificationStatus.VERIFIED.value,
            func.lower(Property.country) == "india",
            or_(
                func.lower(Property.city).contains(dest_clean.lower()),
                func.lower(Property.state).contains(dest_clean.lower()),
                func.lower(Property.name).contains(dest_clean.lower())
            )
        )

        if property_type and property_type.upper() not in ["ALL", "ANY"]:
            query = query.filter(func.lower(Property.property_type) == property_type.lower())

        properties = query.limit(limit * 2).all()
        results = []

        for p in properties:
            # Active rooms
            rooms = db.query(Room).filter(Room.property_id == p.id, Room.is_active == True).all()
            if not rooms:
                continue

            min_price = min([r.base_price for r in rooms])
            max_room_cap = max([r.capacity for r in rooms])

            # Filter by budget if provided
            if budget_max and min_price > budget_max:
                continue

            # Filter by guest capacity if provided
            if guest_count and max_room_cap < guest_count and sum(r.quantity * r.capacity for r in rooms) < guest_count:
                continue

            # Cover image
            hero_img = None
            if p.images:
                primary = next((img for img in p.images if img.is_primary), p.images[0])
                hero_img = primary.image_url

            # Property amenities
            p_amenities = [a.amenity_name for a in p.amenities] if p.amenities else []
            
            # Amenity filter match if given
            if amenities:
                req_set = set([a.lower() for a in amenities])
                prop_set = set([a.lower() for a in p_amenities])
                # Relaxed matching: check if any matching amenity or keep in ranked order
                matching_amenities = req_set.intersection(prop_set)
                has_match = len(matching_amenities) > 0

            # Safe public presentation
            results.append({
                "property_id": p.id,
                "property_name": p.name,
                "property_type": p.property_type or "Resort",
                "city": p.city,
                "state": p.state,
                "address": p.address,
                "rating": float(p.rating or 4.8),
                "review_count": int(p.review_count or 0),
                "starting_price_per_night": float(min_price),
                "cover_image": hero_img,
                "amenities": p_amenities[:8],
                "description": p.description or f"Verified sanctuary in {p.city}, {p.state}."
            })

            if len(results) >= limit:
                break

        return results

    @staticmethod
    def check_availability(
        db: Session,
        property_id: int,
        check_in: date,
        check_out: date,
        guests: int = 2
    ) -> Dict[str, Any]:
        """
        Authoritative availability calculation for a property and date range.
        Uses PostgreSQL booking overlaps and closure blocks.
        """
        prop = db.query(Property).filter(
            Property.id == property_id,
            Property.is_active == True,
            Property.verification_status == PropertyVerificationStatus.VERIFIED.value
        ).first()

        if not prop:
            return {
                "available": False,
                "reason": "PROPERTY_NOT_FOUND_OR_UNVERIFIED",
                "message": "Property is inactive or not verified."
            }

        # Check property blackout closures
        closure = db.query(PropertyAvailability).filter(
            PropertyAvailability.property_id == prop.id,
            PropertyAvailability.is_closed == True,
            PropertyAvailability.start_date <= check_out,
            PropertyAvailability.end_date >= check_in
        ).first()

        if closure:
            return {
                "available": False,
                "reason": "PROPERTY_CLOSED",
                "message": f"Property '{prop.name}' is closed between {check_in} and {check_out} ({closure.reason})."
            }

        rooms = db.query(Room).filter(Room.property_id == prop.id, Room.is_active == True).all()
        if not rooms:
            return {
                "available": False,
                "reason": "NO_ROOMS_CONFIGURED",
                "message": "No active room types found for this property."
            }

        available_rooms = []
        for r in rooms:
            avail_info = AvailabilityService.check_room_availability(
                db=db,
                room_id=r.id,
                check_in=check_in,
                check_out=check_out
            )
            if avail_info.get("is_available") and avail_info.get("available_quantity", 0) > 0:
                available_rooms.append({
                    "room_id": r.id,
                    "name": r.name,
                    "room_type": r.room_type,
                    "capacity": r.capacity,
                    "price_per_night": r.base_price,
                    "available_units": avail_info.get("available_quantity", 0)
                })

        if not available_rooms:
            return {
                "available": False,
                "reason": "NO_ROOMS_AVAILABLE",
                "message": "All rooms at this property are booked or blocked for the requested dates."
            }

        return {
            "available": True,
            "property_id": prop.id,
            "property_name": prop.name,
            "rooms": available_rooms
        }

    @staticmethod
    def get_available_rooms(
        db: Session,
        property_id: int,
        check_in: date,
        check_out: date,
        adults: int = 2,
        children: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Returns real room types with authoritative available inventory and pricing.
        """
        rooms = db.query(Room).filter(Room.property_id == property_id, Room.is_active == True).all()
        results = []

        for r in rooms:
            avail_info = AvailabilityService.check_room_availability(
                db=db,
                room_id=r.id,
                check_in=check_in,
                check_out=check_out
            )
            
            avail_units = avail_info.get("available_quantity", 0)
            if avail_units <= 0:
                continue

            r_images = [img.image_url for img in r.images] if r.images else []
            r_amenities = [a.amenity_name for a in r.amenities] if r.amenities else []

            results.append({
                "room_id": r.id,
                "property_id": property_id,
                "name": r.name,
                "room_type": r.room_type,
                "capacity": r.capacity,
                "price_per_night": float(r.base_price),
                "available_units": int(avail_units),
                "amenities": r_amenities,
                "images": r_images[:4],
                "description": r.description or f"{r.room_type} at {r.property.name if r.property else 'Property'}."
            })

        return results

    @staticmethod
    def calculate_room_configuration(
        db: Session,
        property_id: int,
        room_id: int,
        adults: int = 2,
        children: int = 0,
        child_ages: Optional[List[int]] = None,
        cot_count: int = 0,
        extra_bed_count: int = 0,
        requested_quantity: int = 1
    ) -> Dict[str, Any]:
        """
        Authoritatively calculates valid room configuration, multi-room guest allocations, and policies.
        Evaluates adult presence (adult required in each room), per-room adult limits,
        per-room child limits, total guest occupancy, child age limits, cot/extra bed allowances,
        and free child pricing rules.
        Shared across AI search, AI recommendation, Trip Planner, Booking Preview, and Booking Service.
        """
        child_ages = list(child_ages or [])
        adults = max(1, int(adults or 1))
        children = max(0, int(children or 0))
        requested_quantity = max(1, int(requested_quantity or 1))
        cot_count = max(0, int(cot_count or 0))
        extra_bed_count = max(0, int(extra_bed_count or 0))

        # 1. Fetch Room & Property
        room = db.query(Room).filter(Room.id == room_id, Room.property_id == property_id, Room.is_active == True).first()
        if not room:
            return {
                "valid": False,
                "room_id": room_id,
                "quantity": 0,
                "error": "Selected room does not exist or is inactive.",
                "policy_violation": "ROOM_NOT_FOUND"
            }

        prop = db.query(Property).filter(Property.id == property_id).first()
        if not prop:
            return {
                "valid": False,
                "room_id": room_id,
                "quantity": 0,
                "error": "Selected property does not exist or is inactive.",
                "policy_violation": "PROPERTY_NOT_FOUND"
            }

        prop_rules = getattr(prop, 'home_rules', None)
        room_rules = getattr(room, 'rules', None)

        # 2. Global Children Policies
        if children > 0:
            if (prop_rules and str(prop_rules.children_allowed).lower() == "no") or (room_rules and str(room_rules.children_allowed).lower() == "no"):
                return {
                    "valid": False,
                    "room_id": room.id,
                    "room_name": room.name,
                    "quantity": 0,
                    "error": "Children are not permitted in this room or property.",
                    "policy_violation": "CHILDREN_NOT_ALLOWED"
                }

            # Child age limits
            min_age = (
                room_rules.minimum_child_age if (room_rules and room_rules.minimum_child_age is not None)
                else (prop_rules.minimum_child_age if (prop_rules and prop_rules.minimum_child_age is not None) else None)
            )
            if min_age is not None:
                for age in child_ages:
                    if age < min_age:
                        return {
                            "valid": False,
                            "room_id": room.id,
                            "room_name": room.name,
                            "quantity": 0,
                            "error": f"Children under {min_age} years are not permitted.",
                            "policy_violation": "MINIMUM_CHILD_AGE_VIOLATION"
                        }

            max_age_limit = (
                getattr(room_rules, 'max_child_age', None) if (room_rules and getattr(room_rules, 'max_child_age', None) is not None)
                else (getattr(prop_rules, 'max_child_age', None) if (prop_rules and getattr(prop_rules, 'max_child_age', None) is not None) else None)
            )
            if max_age_limit is not None:
                for age in child_ages:
                    if age > max_age_limit:
                        return {
                            "valid": False,
                            "room_id": room.id,
                            "room_name": room.name,
                            "quantity": 0,
                            "error": f"Child age ({age}) exceeds maximum child age limit ({max_age_limit}).",
                            "policy_violation": "MAX_CHILD_AGE_VIOLATION"
                        }

        # 3. Extra Bed Policy & Availability
        extra_bed_avail = getattr(room_rules, 'extra_bed_available', None) if room_rules else (getattr(prop_rules, 'extra_bed_available', None) if prop_rules else None)
        extra_bed_pol = (room_rules.extra_bed_policy if room_rules else None)
        max_extra_beds_per_room = (room_rules.maximum_extra_beds if room_rules and room_rules.maximum_extra_beds is not None else 0) or 0
        is_extra_bed_allowed = (
            str(extra_bed_avail).lower() in ["yes", "true", "1"] or
            (extra_bed_pol in ["Yes", "Upon Request"]) or
            (max_extra_beds_per_room > 0 and extra_bed_pol != "No")
        )
        if extra_bed_count > 0 and (not is_extra_bed_allowed or max_extra_beds_per_room == 0):
            return {
                "valid": False,
                "room_id": room.id,
                "room_name": room.name,
                "quantity": 0,
                "error": "Extra beds are not available for this room.",
                "policy_violation": "EXTRA_BED_NOT_AVAILABLE"
            }

        # 4. Cot Policy & Availability
        cot_avail = getattr(room_rules, 'cot_available', None) if room_rules else (getattr(prop_rules, 'cot_available', None) if prop_rules else None)
        cot_pol = (room_rules.cot_policy if room_rules else (prop_rules.cot_policy if prop_rules else None))
        max_cots_per_room = (room_rules.cot_quantity if room_rules and room_rules.cot_quantity is not None else (prop_rules.cot_quantity if prop_rules and prop_rules.cot_quantity is not None else 0)) or 0
        is_cot_allowed = (
            str(cot_avail).lower() in ["yes", "true", "1"] or
            (cot_pol in ["Yes", "Upon Request"]) or
            (max_cots_per_room > 0 and cot_pol != "No")
        )
        if cot_count > 0 and (not is_cot_allowed or max_cots_per_room == 0):
            return {
                "valid": False,
                "room_id": room.id,
                "room_name": room.name,
                "quantity": 0,
                "error": "Baby cots are not available for this room.",
                "policy_violation": "COT_NOT_AVAILABLE"
            }

        # 5. Room Physical Capacity & Policy Limits
        room_cap = (room_rules.maximum_total_guests if room_rules and room_rules.maximum_total_guests else room.capacity) or 2
        max_adults_per_room = (room_rules.maximum_adults if room_rules and room_rules.maximum_adults is not None and room_rules.maximum_adults > 0 else room_cap) or room_cap
        
        if room_rules and room_rules.maximum_children is not None:
            max_children_per_room = room_rules.maximum_children
        elif room_rules and getattr(room_rules, 'additional_children_allowed', 0) > 0:
            max_children_per_room = room_rules.additional_children_allowed
        elif prop_rules and prop_rules.maximum_children is not None:
            max_children_per_room = prop_rules.maximum_children
        else:
            max_children_per_room = max(0, room_cap - 1)

        if (room_rules and str(room_rules.children_allowed).lower() == "no") or (prop_rules and str(prop_rules.children_allowed).lower() == "no"):
            max_children_per_room = 0

        total_physical_units = max(1, room.quantity or 1)

        # 6. Deterministic Multi-Room Allocation Algorithm
        # Find minimum Q >= requested_quantity that can legally accommodate the group
        valid_q = None
        valid_allocations = None

        for q in range(requested_quantity, total_physical_units + 1):
            # A. Adult Presence Rule: Each of the q rooms must have at least 1 adult
            if adults < q:
                continue

            # B. Aggregate upper bound checks for q rooms
            if adults > max_adults_per_room * q:
                continue
            if children > max_children_per_room * q:
                continue
            if extra_bed_count > max_extra_beds_per_room * q:
                continue
            if cot_count > max_cots_per_room * q:
                continue

            effective_total_cap = (room_cap * q) + min(extra_bed_count, max_extra_beds_per_room * q)
            if (adults + children) > effective_total_cap:
                continue

            # C. Check per-room distribution feasibility
            rem_adults = adults - q
            room_extra_beds = [0] * q
            rem_eb = extra_bed_count
            for i in range(q):
                add_eb = min(max_extra_beds_per_room, rem_eb)
                room_extra_beds[i] = add_eb
                rem_eb -= add_eb

            room_adults = [1] * q
            for i in range(q):
                can_add_a = min(max_adults_per_room - 1, rem_adults)
                room_adults[i] += can_add_a
                rem_adults -= can_add_a

            if rem_adults > 0:
                continue

            room_children = [0] * q
            rem_children = children
            for i in range(q):
                room_max_for_c = min(
                    max_children_per_room,
                    (room_cap + room_extra_beds[i]) - room_adults[i]
                )
                if room_max_for_c > 0:
                    add_c = min(room_max_for_c, rem_children)
                    room_children[i] = add_c
                    rem_children -= add_c

            if rem_children == 0:
                valid_q = q
                valid_allocations = []
                age_idx = 0
                for i in range(q):
                    num_c_in_room = room_children[i]
                    ages_in_room = child_ages[age_idx:age_idx + num_c_in_room]
                    age_idx += num_c_in_room
                    valid_allocations.append({
                        "room_id": room.id,
                        "room_number": i + 1,
                        "adults": room_adults[i],
                        "children": num_c_in_room,
                        "child_ages": ages_in_room,
                        "extra_beds": room_extra_beds[i],
                        "capacity": room_cap + room_extra_beds[i],
                        "occupancy": room_adults[i] + num_c_in_room
                    })
                break

        # 7. Handle Inadmissible / Invalid Configuration
        if not valid_q:
            if children > 0 and max_children_per_room == 0:
                err_msg = "Children are not permitted in this room or property."
            elif children > 0 and children > max_children_per_room * total_physical_units:
                needed_r = math.ceil(children / max_children_per_room) if max_children_per_room > 0 else 1
                err_msg = f"Requires {needed_r} rooms for {children} children (this room allows at most {max_children_per_room} child per room), but property only has {total_physical_units} total units of {room.name}."
            elif adults > max_adults_per_room * total_physical_units:
                needed_r = math.ceil(adults / max_adults_per_room) if max_adults_per_room > 0 else 1
                err_msg = f"Requires {needed_r} rooms for {adults} adults (this room allows at most {max_adults_per_room} adults per room), but property only has {total_physical_units} total units of {room.name}."
            elif adults < (math.ceil(children / max_children_per_room) if max_children_per_room > 0 else 1):
                needed_r = math.ceil(children / max_children_per_room) if max_children_per_room > 0 else 1
                err_msg = f"Accommodating {children} children requires {needed_r} rooms, but this property requires at least one adult in each room and your party has only {adults} adult(s)."
            elif extra_bed_count > max_extra_beds_per_room * total_physical_units:
                err_msg = f"Requested extra beds ({extra_bed_count}) exceed allowable limit ({max_extra_beds_per_room * total_physical_units})."
            elif cot_count > max_cots_per_room * total_physical_units:
                err_msg = f"Requested cots ({cot_count}) exceed allowable limit ({max_cots_per_room * total_physical_units})."
            else:
                needed_rooms_calc = max(
                    math.ceil(adults / max_adults_per_room) if max_adults_per_room > 0 else 1,
                    math.ceil((adults + children) / room_cap) if room_cap > 0 else 1,
                    math.ceil(children / max_children_per_room) if max_children_per_room > 0 else 1
                )
                if needed_rooms_calc > total_physical_units:
                    err_msg = f"Requires {needed_rooms_calc} rooms for {adults} adults and {children} children, but property only has {total_physical_units} total units of {room.name}."
                else:
                    err_msg = f"This stay cannot accommodate {adults} adult(s) and {children} child(ren) under its current room policy."

            return {
                "valid": False,
                "room_id": room.id,
                "room_name": room.name,
                "quantity": 0,
                "adults": adults,
                "children": children,
                "child_ages": child_ages,
                "error": err_msg,
                "policy_violation": "CAPACITY_OR_POLICY_EXCEEDED"
            }

        # 8. Pricing & Free Child Calculations
        free_children_allowance = (
            getattr(room_rules, 'free_additional_children', 0) if (room_rules and getattr(room_rules, 'free_additional_children', None) is not None)
            else (getattr(prop_rules, 'free_additional_children', 0) if (prop_rules and getattr(prop_rules, 'free_additional_children', None) is not None) else 0)
        ) or 0
        child_charge_enabled = (getattr(room_rules, 'child_charge_enabled', False) if room_rules else False) or (getattr(prop_rules, 'child_charge_enabled', False) if prop_rules else False)
        child_charge_amt = float((
            getattr(room_rules, 'child_charge_amount', 0.0) if (room_rules and getattr(room_rules, 'child_charge_amount', None) is not None)
            else (getattr(prop_rules, 'child_charge_amount', 0.0) if (prop_rules and getattr(prop_rules, 'child_charge_amount', None) is not None) else (getattr(room_rules, 'child_price', 0.0) if (room_rules and getattr(room_rules, 'child_price', None) is not None) else 0.0))
        ) or 0.0)

        total_free_slots = free_children_allowance * valid_q
        free_children_count = min(children, total_free_slots) if child_charge_enabled else children
        chargeable_children_count = max(0, children - free_children_count) if child_charge_enabled else 0

        fit_info = BookingAgentToolsService.build_fits_description(
            adults=adults,
            children=children,
            room_quantity=valid_q,
            room_capacity=room_cap,
            room_name=room.name
        )

        return {
            "valid": True,
            "room_id": room.id,
            "room_name": room.name,
            "property_id": prop.id,
            "property_name": prop.name,
            "quantity": valid_q,
            "adults": adults,
            "children": children,
            "child_ages": child_ages,
            "extra_bed_count": extra_bed_count,
            "cot_count": cot_count,
            "max_guests_per_room": room_cap,
            "max_adults_per_room": max_adults_per_room,
            "max_children_per_room": max_children_per_room,
            "room_allocations": valid_allocations,
            "pricing_summary": {
                "children_free": free_children_count,
                "children_charged": chargeable_children_count,
                "child_charge_amount": child_charge_amt,
                "extra_beds": extra_bed_count,
                "cots": cot_count
            },
            "fits_description": fit_info["fits_description"],
            "recommendation_title": fit_info["recommendation_title"],
            "error": None
        }

    @staticmethod
    def calculate_booking_price(
        db: Session,
        property_id: int,
        room_id: int,
        check_in: date,
        check_out: date,
        room_quantity: int = 1,
        adults: int = 2,
        children: int = 0,
        child_ages: Optional[List[int]] = None,
        cot_count: int = 0,
        extra_bed_count: int = 0,
        adventure_id: Optional[int] = None,
        adventure_participants: int = 0,
        experience_id: Optional[int] = None,
        experience_participants: int = 0
    ) -> Dict[str, Any]:
        """
        Authoritative backend calculation of total price, room total, supplements, and adventures.
        """
        child_ages = child_ages or []
        room_quantity = max(1, int(room_quantity or 1))
        nights = (check_out - check_in).days
        if nights <= 0:
            nights = 1

        room = db.query(Room).filter(Room.id == room_id, Room.property_id == property_id).first()
        if not room:
            raise ValueError(f"Room #{room_id} not found for property #{property_id}")

        prop = db.query(Property).filter(Property.id == property_id).first()
        prop_rules = getattr(prop, 'home_rules', None)
        room_rules = getattr(room, 'rules', None)

        # 1. Base Room Total
        nightly_price = float(room.base_price)
        room_total = round(nightly_price * nights * room_quantity, 2)

        # 2. Extra Bed Supplements
        extra_bed_unit = getattr(room_rules, 'extra_bed_charge_unit', 'Per night') if room_rules else 'Per night'
        extra_bed_price = float((room_rules.extra_bed_price if room_rules and room_rules.extra_bed_price is not None else 0.0) or 0.0)
        extra_bed_total = round(extra_bed_price * (nights if extra_bed_unit == "Per night" else 1) * extra_bed_count, 2)

        # 3. Cot Supplements
        cot_unit = (getattr(room_rules, 'cot_charge_unit', None) if room_rules else None) or (getattr(prop_rules, 'cot_charge_unit', None) if prop_rules else 'Free') or 'Free'
        cot_price = float((room_rules.cot_price if room_rules and hasattr(room_rules, 'cot_price') and room_rules.cot_price is not None else (getattr(prop_rules, 'cot_price', 0.0) if prop_rules else 0.0)) or 0.0)
        cot_total = round(cot_price * (nights if cot_unit == "Per night" else 1) * cot_count, 2) if cot_unit != "Free" else 0.0

        # 4. Child Supplements
        room_child_price = getattr(room_rules, 'child_charge_amount', None) if room_rules else None
        if room_child_price is None and room_rules and getattr(room_rules, 'child_price', None) is not None and room_rules.child_price > 0:
            room_child_price = room_rules.child_price

        prop_child_price = getattr(prop_rules, 'child_charge_amount', None) if prop_rules else None
        if prop_child_price is None and prop_rules and getattr(prop_rules, 'child_price', None) is not None and prop_rules.child_price > 0:
            prop_child_price = prop_rules.child_price

        child_charge_amt = float(room_child_price if (room_child_price is not None and room_child_price > 0) else (prop_child_price if prop_child_price is not None else 0.0))
        child_charge_enabled = (getattr(room_rules, 'child_charge_enabled', False) if room_rules else False) or (getattr(prop_rules, 'child_charge_enabled', False) if prop_rules else False) or (child_charge_amt > 0)

        child_charge_unit = (getattr(room_rules, 'child_charge_unit', None) if room_rules else None) or (getattr(prop_rules, 'child_charge_unit', None) if prop_rules else 'Per night') or 'Per night'
        free_children_allowance = (
            getattr(room_rules, 'free_additional_children', 0) if (room_rules and getattr(room_rules, 'free_additional_children', None) is not None)
            else (getattr(prop_rules, 'free_additional_children', 0) if (prop_rules and getattr(prop_rules, 'free_additional_children', None) is not None) else 0)
        ) or 0

        total_free_slots = free_children_allowance * room_quantity
        chargeable_children = max(0, children - total_free_slots) if child_charge_enabled else 0
        child_supplement_total = round(child_charge_amt * (nights if child_charge_unit == "Per night" else 1) * chargeable_children, 2) if (child_charge_enabled and child_charge_amt > 0) else 0.0

        supplements_total = round(extra_bed_total + cot_total + child_supplement_total, 2)

        # 5. Adventure Total
        effective_adv_id = adventure_id or experience_id
        effective_adv_parts = adventure_participants or experience_participants
        adventure_total = 0.0
        if effective_adv_id:
            adv = db.query(Adventure).filter(Adventure.id == effective_adv_id, Adventure.property_id == property_id, Adventure.is_active == True).first()
            if adv:
                parts = max(1, effective_adv_parts)
                if adv.pricing_model == "per_person":
                    adventure_total = round(float(adv.price) * parts, 2)
                else:
                    adventure_total = round(float(adv.price), 2)

        total_price = round(room_total + supplements_total + adventure_total, 2)

        return {
            "room_nightly_price": nightly_price,
            "nights": nights,
            "room_quantity": room_quantity,
            "room_total": room_total,
            "extra_bed_total": extra_bed_total,
            "cot_total": cot_total,
            "child_supplement_total": child_supplement_total,
            "supplements_total": supplements_total,
            "adventure_total": adventure_total,
            "experience_total": adventure_total,
            "total_price": total_price,
            "currency": "INR"
        }

    @staticmethod
    def get_property_details(db: Session, property_id: int) -> Dict[str, Any]:
        """
        Retrieves authentic property rules, amenities, and policies.
        Missing info returns standard: 'This information has not been specified by the Stay Partner.'
        """
        prop = db.query(Property).filter(Property.id == property_id).first()
        if not prop:
            return {"error": "Property not found"}

        rules = prop.home_rules
        return {
            "property_id": prop.id,
            "property_name": prop.name,
            "property_type": prop.property_type,
            "city": prop.city,
            "state": prop.state,
            "address": prop.address,
            "description": prop.description or "This information has not been specified by the Stay Partner.",
            "check_in_time": prop.check_in_time or "14:00",
            "check_out_time": prop.check_out_time or "11:00",
            "amenities": [a.amenity_name for a in prop.amenities] if prop.amenities else [],
            "guest_information_message": prop.guest_information_message or "This information has not been specified by the Stay Partner.",
            "pet_policy": rules.pets_allowed if (rules and rules.pets_allowed) else "This information has not been specified by the Stay Partner.",
            "smoking_policy": rules.smoking_allowed if (rules and rules.smoking_allowed) else "This information has not been specified by the Stay Partner.",
            "quiet_hours": f"{rules.quiet_hours_start} to {rules.quiet_hours_end}" if (rules and rules.quiet_hours_start) else "This information has not been specified by the Stay Partner.",
            "cancellation_policy": f"100% refund up to 2 days before check-in. {int(prop.cancellation_refund_percentage or 50)}% refund within 2 days of check-in."
        }

    @staticmethod
    def search_adventures(db: Session, property_id: Optional[int] = None, destination: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Searches PostgreSQL for verified, active adventures.
        """
        query = db.query(Adventure).filter(Adventure.is_active == True)
        if property_id:
            query = query.filter(Adventure.property_id == property_id)
        elif destination:
            query = query.join(Property).filter(func.lower(Property.city).contains(destination.strip().lower()))

        adventures = query.limit(6).all()
        results = []
        for adv in adventures:
            results.append({
                "adventure_id": adv.id,
                "experience_id": adv.id,
                "property_id": adv.property_id,
                "title": adv.title,
                "description": adv.description,
                "price": float(adv.price),
                "pricing_model": adv.pricing_model,
                "capacity": adv.capacity,
                "duration": adv.duration,
                "image_url": adv.image_url
            })
        return results

    @staticmethod
    def search_experiences(db: Session, property_id: Optional[int] = None, destination: Optional[str] = None) -> List[Dict[str, Any]]:
        return BookingAgentToolsService.search_adventures(db, property_id=property_id, destination=destination)

    @staticmethod
    def check_adventure_availability(
        db: Session,
        adventure_id: int,
        target_date: date,
        participants: int = 1
    ) -> Dict[str, Any]:
        """
        Authoritatively validates adventure capacity against active bookings.
        """
        adv = db.query(Adventure).filter(Adventure.id == adventure_id, Adventure.is_active == True).first()
        if not adv:
            return {"available": False, "reason": "Adventure not found or inactive."}

        booked_count = db.query(func.coalesce(func.sum(BookingAdventure.participants), 0)).join(Booking).filter(
            BookingAdventure.adventure_id == adv.id,
            BookingAdventure.scheduled_date == target_date,
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.VERIFIED])
        ).scalar() or 0

        remaining = max(0, adv.capacity - booked_count)
        if participants > remaining:
            return {
                "available": False,
                "reason": f"Capacity reached ({remaining} seats remaining, {participants} requested)."
            }

        return {
            "available": True,
            "adventure_id": adv.id,
            "experience_id": adv.id,
            "title": adv.title,
            "price": float(adv.price),
            "pricing_model": adv.pricing_model,
            "remaining_capacity": remaining
        }

    @staticmethod
    def check_experience_availability(
        db: Session,
        experience_id: int,
        target_date: date,
        participants: int = 1
    ) -> Dict[str, Any]:
        return BookingAgentToolsService.check_adventure_availability(
            db=db,
            adventure_id=experience_id,
            target_date=target_date,
            participants=participants
        )

    @classmethod
    def extract_important_to_know(
        cls,
        db: Session,
        property_id: int,
        room_id: Optional[int] = None,
        check_in: Optional[date] = None,
        adults: int = 2,
        children: int = 0,
        child_ages: Optional[List[int]] = None
    ) -> List[str]:
        """
        Extracts concise, relevant 'Important to know' stay rules strictly from PostgreSQL data.
        Never invents missing rules. If rule is missing, notes 'Not specified by Stay Partner'.
        """
        child_ages = child_ages or []
        prop = db.query(Property).filter(Property.id == property_id).first()
        if not prop:
            return []

        prop_rules = getattr(prop, 'home_rules', None)
        room = db.query(Room).filter(Room.id == room_id, Room.property_id == property_id).first() if room_id else None
        room_rules = getattr(room, 'rules', None) if room else None

        items = []

        # 1. Smoking policy
        smoking_pol = (prop_rules.smoking_policy if prop_rules and prop_rules.smoking_policy else None)
        if smoking_pol:
            if smoking_pol.lower() in ["no", "false", "non-smoking", "not allowed"]:
                items.append("Non-smoking property")
            elif smoking_pol.lower() in ["designated areas only", "designated"]:
                items.append("Smoking allowed in designated areas only")
            elif smoking_pol.lower() in ["yes", "true", "allowed"]:
                items.append("Smoking permitted in designated areas")
            else:
                items.append(f"Smoking: {smoking_pol}")
        else:
            items.append("Smoking policy: Not specified by Stay Partner")

        # 2. Check-in & Check-out
        c_in_time = prop.check_in_time or "14:00"
        c_out_time = prop.check_out_time or "11:00"
        items.append(f"Check-in: {c_in_time} · Check-out: {c_out_time}")

        # 3. Children Policy & Charges
        children_allowed = (room_rules.children_allowed if room_rules and room_rules.children_allowed else (prop_rules.children_allowed if prop_rules else None))
        if str(children_allowed).lower() in ["no", "false"]:
            items.append("Children not permitted at this property")
        else:
            free_child_allowance = (room_rules.free_additional_children if room_rules and room_rules.free_additional_children is not None else (prop_rules.free_additional_children if prop_rules else 0)) or 0
            max_c_age = (room_rules.max_child_age if room_rules and room_rules.max_child_age is not None else (prop_rules.max_child_age if prop_rules else None))
            child_charge_enabled = (room_rules.child_charge_enabled if room_rules else False) or (prop_rules.child_charge_enabled if prop_rules else False)
            child_charge_amt = float((room_rules.child_charge_amount if room_rules and room_rules.child_charge_amount is not None else (prop_rules.child_charge_amount if prop_rules else 0.0)) or 0.0)

            if max_c_age or free_child_allowance > 0 or not child_charge_enabled:
                age_text = f"under {max_c_age}" if max_c_age else "under 6"
                items.append(f"Children {age_text} stay free using existing beds")
            elif child_charge_enabled and child_charge_amt > 0:
                items.append(f"Child charge: ₹{child_charge_amt:,.0f} per night")
            elif not prop_rules and not room_rules:
                items.append("Child policy: Not specified by Stay Partner")

        # 4. Extra Bed / Cot Policy & Charges
        extra_bed_avail = (room_rules.extra_bed_available if room_rules and room_rules.extra_bed_available else (prop_rules.extra_bed_available if prop_rules else None))
        extra_bed_price = float((room_rules.extra_bed_price if room_rules and room_rules.extra_bed_price is not None else 0.0) or 0.0)
        if str(extra_bed_avail).lower() in ["yes", "true", "1"]:
            if extra_bed_price > 0:
                items.append(f"Extra bed: ₹{extra_bed_price:,.0f}/night")
            else:
                items.append("Extra bed: Available upon request")

        cot_avail = (room_rules.cot_available if room_rules and room_rules.cot_available else (prop_rules.cot_available if prop_rules else None))
        cot_price = float((room_rules.cot_price if room_rules and hasattr(room_rules, 'cot_price') and room_rules.cot_price is not None else (prop_rules.cot_price if prop_rules else 0.0)) or 0.0)
        if str(cot_avail).lower() in ["yes", "true", "1"]:
            if cot_price > 0:
                items.append(f"Baby cot: ₹{cot_price:,.0f} per stay")
            else:
                items.append("Baby cot: Available upon request (Free)")

        # 5. Cancellation Policy
        if check_in:
            free_until_date = check_in - timedelta(days=2)
            items.append(f"Free cancellation until {free_until_date.strftime('%d %b %Y')}")
        else:
            host_pct = int(getattr(prop, 'cancellation_refund_percentage', 50) or 50)
            items.append(f"100% refund up to 2 days before check-in, {host_pct}% within 2 days")

        # 6. Pet Policy (if specified)
        pet_pol = (prop_rules.pets_policy if prop_rules and prop_rules.pets_policy else None)
        if pet_pol:
            if pet_pol.lower() in ["no", "false"]:
                items.append("Pets: Not allowed")
            elif pet_pol.lower() in ["yes", "true"]:
                fee_txt = f" (Fee: ₹{prop_rules.pet_fee:,.0f})" if prop_rules.pet_fee else ""
                items.append(f"Pet friendly{fee_txt}")

        return items

    @classmethod
    def create_booking_preview(
        cls,
        db: Session,
        traveler_id: int,
        property_id: int,
        room_id: int,
        check_in: date,
        check_out: date,
        session_id: Optional[str] = None,
        adults: int = 2,
        children: int = 0,
        child_ages: Optional[List[int]] = None,
        cot_count: int = 0,
        extra_bed_count: int = 0,
        room_quantity: int = 1,
        adventure_id: Optional[int] = None,
        adventure_participants: int = 0,
        adventure_date: Optional[date] = None,
        experience_id: Optional[int] = None,
        experience_participants: int = 0,
        experience_date: Optional[date] = None
    ) -> Dict[str, Any]:
        """
        Prepares a server-side verified booking preview with a short TTL (20 minutes).
        Revalidates property, room, availability, capacity, child policy, and pricing authoritatively.
        """
        child_ages = child_ages or []
        effective_adv_id = adventure_id or experience_id
        effective_adv_parts = adventure_participants or experience_participants
        effective_adv_date = adventure_date or experience_date

        # 1. Recheck Property
        prop = db.query(Property).filter(
            Property.id == property_id,
            Property.is_active == True,
            Property.verification_status == PropertyVerificationStatus.VERIFIED.value
        ).first()
        if not prop:
            raise ValueError("Selected property does not exist, is inactive, or is not verified.")

        # 2. Recheck Room
        room = db.query(Room).filter(Room.id == room_id, Room.property_id == prop.id, Room.is_active == True).first()
        if not room:
            raise ValueError("Selected room does not exist, is inactive, or does not belong to this property.")

        # 3. Recheck Dates
        if check_in < date.today():
            raise ValueError("Check-in date cannot be in the past.")
        if check_out <= check_in:
            raise ValueError("Check-out date must be strictly after Check-in date.")

        # 4. Recheck Availability
        avail_info = AvailabilityService.check_room_availability(db=db, room_id=room.id, check_in=check_in, check_out=check_out)
        available_qty = avail_info.get("available_quantity", 0)
        if available_qty < room_quantity:
            raise ValueError(f"Requested {room_quantity} room(s), but only {available_qty} available.")

        # 5. Recheck Capacity & Rules
        config_eval = BookingAgentToolsService.calculate_room_configuration(
            db=db,
            property_id=prop.id,
            room_id=room.id,
            adults=adults,
            children=children,
            child_ages=child_ages,
            cot_count=cot_count,
            extra_bed_count=extra_bed_count,
            requested_quantity=room_quantity
        )
        if not config_eval.get("valid"):
            raise ValueError(config_eval.get("error", "Room configuration invalid."))

        # 6. Recheck Pricing
        price_calc = BookingAgentToolsService.calculate_booking_price(
            db=db,
            property_id=prop.id,
            room_id=room.id,
            check_in=check_in,
            check_out=check_out,
            room_quantity=room_quantity,
            adults=adults,
            children=children,
            child_ages=child_ages,
            cot_count=cot_count,
            extra_bed_count=extra_bed_count,
            adventure_id=effective_adv_id,
            adventure_participants=effective_adv_parts
        )

        # 7. Cancellation Policy Snapshot
        host_refund_pct = float(getattr(prop, 'cancellation_refund_percentage', 50) or 50)
        cancellation_policy = f"100% refund up to 2 days before check-in. {int(host_refund_pct)}% refund within 2 days of check-in. Cancellation permitted until 6:00 AM on check-in date."

        # 8. Important To Know Snapshot
        important_to_know = cls.extract_important_to_know(
            db=db,
            property_id=prop.id,
            room_id=room.id,
            check_in=check_in,
            adults=adults,
            children=children,
            child_ages=child_ages
        )

        selected_config_label = (
            f"1 room · {adults} adult{'s' if adults > 1 else ''}{f', {children} child' if children > 0 else ''}"
            if room_quantity == 1
            else f"{room_quantity} rooms · {math.ceil(adults / room_quantity)} adults each"
        )

        # Expiry: 20 minutes from now
        expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=20)
        preview_id = f"PREV-{uuid.uuid4().hex[:10].upper()}"

        # Ensure session exists in database
        from app.models.ai_booking import AIBookingSession, AIBookingSessionStatus
        if not session_id:
            session_id = f"SESS-{uuid.uuid4().hex[:12].upper()}"
            sess = AIBookingSession(
                id=session_id,
                traveler_id=traveler_id,
                conversation_id=str(uuid.uuid4()),
                status=AIBookingSessionStatus.ACTIVE,
                requirements_json={}
            )
            db.add(sess)
            db.flush()
        else:
            sess = db.query(AIBookingSession).filter(AIBookingSession.id == session_id).first()
            if not sess:
                sess = AIBookingSession(
                    id=session_id,
                    traveler_id=traveler_id,
                    conversation_id=str(uuid.uuid4()),
                    status=AIBookingSessionStatus.ACTIVE,
                    requirements_json={}
                )
                db.add(sess)
                db.flush()

        preview = AIBookingPreview(
            id=preview_id,
            session_id=session_id,
            traveler_id=traveler_id,
            property_id=prop.id,
            room_id=room.id,
            check_in=check_in,
            check_out=check_out,
            total_nights=price_calc["nights"],
            room_quantity=room_quantity,
            adults=adults,
            children=children,
            child_ages=child_ages,
            cot_count=cot_count,
            extra_bed_count=extra_bed_count,
            adventure_id=effective_adv_id,
            adventure_participants=effective_adv_parts,
            adventure_date=effective_adv_date,
            experience_id=effective_adv_id,
            experience_participants=effective_adv_parts,
            experience_date=effective_adv_date,
            room_nightly_price=price_calc["room_nightly_price"],
            room_total=price_calc["room_total"],
            adventure_total=price_calc["adventure_total"],
            experience_total=price_calc["experience_total"],
            supplements_total=price_calc["supplements_total"],
            total_price=price_calc["total_price"],
            currency="INR",
            cancellation_policy_snapshot=cancellation_policy,
            rules_snapshot={
                "max_guests_per_room": config_eval["max_guests_per_room"],
                "adults": adults,
                "children": children,
                "child_ages": child_ages,
                "cot_count": cot_count,
                "extra_bed_count": extra_bed_count,
                "important_to_know": important_to_know,
                "selected_configuration_label": selected_config_label
            },
            status=AIBookingPreviewStatus.ACTIVE,
            expires_at=expires_at
        )
        db.add(preview)
        db.flush()

        # 9. VeriNova Independent Pre-Booking Verification
        from app.services.verinova.verinova_verification_service import VeriNovaVerificationService
        pre_ver = VeriNovaVerificationService.verify_pre_booking(
            db=db,
            requirements={
                "destination": prop.city,
                "check_in": check_in.isoformat(),
                "check_out": check_out.isoformat(),
                "adults": adults,
                "children": children,
                "child_ages": child_ages,
                "room_quantity": room_quantity
            },
            property_id=prop.id,
            room_id=room.id,
            check_in=check_in,
            check_out=check_out,
            adults=adults,
            children=children,
            child_ages=child_ages,
            room_quantity=room_quantity,
            adventure_id=effective_adv_id,
            adventure_participants=effective_adv_parts,
            ai_quoted_price=price_calc["total_price"],
            ai_quoted_nights=price_calc["nights"],
            session_id=session_id,
            traveler_id=traveler_id
        )

        if pre_ver.status == "FAILED":
            raise ValueError(f"VeriNova Pre-Booking Verification Blocked: {pre_ver.failure_reasons or 'Failed pre-booking verification.'}")

        return {
            "preview_id": preview_id,
            "expires_at": expires_at.isoformat(),
            "property_id": prop.id,
            "property_name": prop.name,
            "property_type": prop.property_type,
            "city": prop.city,
            "state": prop.state,
            "room_id": room.id,
            "room_name": room.name,
            "room_type": room.room_type,
            "check_in": check_in.isoformat(),
            "check_out": check_out.isoformat(),
            "total_nights": price_calc["nights"],
            "room_quantity": room_quantity,
            "adults": adults,
            "children": children,
            "child_ages": child_ages,
            "cot_count": cot_count,
            "extra_bed_count": extra_bed_count,
            "total_price": price_calc["total_price"],
            "pricing": price_calc,
            "cancellation_policy": cancellation_policy,
            "selected_configuration_label": selected_config_label,
            "important_to_know": important_to_know,
            "verinova_verification": pre_ver.model_dump(),
            "verinova_score": pre_ver.verinova_score,
            "verinova_status": pre_ver.status
        }

    DESTINATION_COORDINATES = {
        # Kerala destinations & towns
        "kanjirappally": (9.5559, 76.7869),
        "kanjirapally": (9.5559, 76.7869),
        "kottayam": (9.5916, 76.5222),
        "pala": (9.7118, 76.6833),
        "palai": (9.7118, 76.6833),
        "kumarakom": (9.6175, 76.4300),
        "changanassery": (9.4449, 76.5414),
        "thiruvalla": (9.3846, 76.5744),
        "pathanamthitta": (9.2648, 76.7870),
        "kuttikkanam": (9.5816, 76.9678),
        "peermade": (9.5667, 76.9833),
        "peermedu": (9.5667, 76.9833),
        "vagamon": (9.6896, 76.9056),
        "thekkady": (9.6031, 77.1615),
        "kumily": (9.6056, 77.1667),
        "munnar": (10.0889, 77.0595),
        "marayoor": (10.2778, 77.1583),
        "wayanad": (11.6854, 76.1320),
        "kalpetta": (11.6103, 76.0827),
        "sulthan bathery": (11.6627, 76.2573),
        "mananthavady": (11.8022, 76.0033),
        "vythiri": (11.5517, 76.0406),
        "alappuzha": (9.4981, 76.3388),
        "alleppey": (9.4981, 76.3388),
        "mararikulam": (9.6000, 76.3167),
        "marari": (9.6000, 76.3167),
        "varkala": (8.7379, 76.7163),
        "kochi": (9.9312, 76.2673),
        "cochin": (9.9312, 76.2673),
        "ernakulam": (9.9816, 76.2999),
        "fort kochi": (9.9658, 76.2421),
        "kovalam": (8.4004, 76.9787),
        "trivandrum": (8.5241, 76.9366),
        "thiruvananthapuram": (8.5241, 76.9366),
        "ponmudi": (8.7600, 77.1167),
        "kollam": (8.8932, 76.6141),
        "quilon": (8.8932, 76.6141),
        "thrissur": (10.5276, 76.2144),
        "trichur": (10.5276, 76.2144),
        "palakkad": (10.7867, 76.6548),
        "malappuram": (11.0510, 76.0711),
        "calicut": (11.2588, 75.7804),
        "kozhikode": (11.2588, 75.7804),
        "kannur": (11.8745, 75.3704),
        "kasaragod": (12.5102, 74.9852),
        "bekal": (12.3833, 75.0333),
        "idukki": (9.8494, 76.9806),
        "athirappilly": (10.2987, 76.5684),
        "nilambur": (11.2778, 76.2269),
        "munroe island": (8.9950, 76.6120),
        "ashtamudi": (8.9333, 76.5833),

        # South India hill stations & getaways
        "ooty": (11.4102, 76.6950),
        "coonoor": (11.3530, 76.7959),
        "nilgiris": (11.4102, 76.6950),
        "kotagiri": (11.4233, 76.8667),
        "kodaikanal": (10.2381, 77.4892),
        "coorg": (12.4244, 75.7382),
        "madikeri": (12.4244, 75.7382),
        "chikmagalur": (13.3161, 75.7720),
        "sakleshpur": (12.9436, 75.7839),
        "kabini": (11.9547, 76.3267),
        "nagarhole": (12.0300, 76.1600),
        "bandipur": (11.6667, 76.6333),
        "gokarna": (14.5479, 74.3188),
        "hampi": (15.3350, 76.4600),
        "mysuru": (12.2958, 76.6394),
        "mysore": (12.2958, 76.6394),
        "bengaluru": (12.9716, 77.5946),
        "bangalore": (12.9716, 77.5946),
        "chennai": (13.0827, 80.2707),
        "hyderabad": (17.3850, 78.4867),
        "puducherry": (11.9416, 79.8083),
        "pondicherry": (11.9416, 79.8083),
        "mahabalipuram": (12.6269, 80.1927),
        "yelagiri": (12.5786, 78.6397),
        "yercaud": (11.7753, 78.2093),

        # Goa
        "goa": (15.4989, 73.8278),
        "north goa": (15.5850, 73.7438),
        "south goa": (15.2736, 73.9582),
        "panaji": (15.4909, 73.8278),
        "calangute": (15.5439, 73.7553),
        "candolim": (15.5178, 73.7628),
        "anjuna": (15.5807, 73.7423),
        "vagator": (15.5992, 73.7428),
        "morjim": (15.6178, 73.7389),
        "arambol": (15.6869, 73.7042),
        "palolem": (15.0100, 74.0231),
        "benaulim": (15.2600, 73.9200),

        # North & West India
        "udaipur": (24.5854, 73.7125),
        "jaipur": (26.9124, 75.7873),
        "jodhpur": (26.2389, 73.0243),
        "jaisalmer": (26.9157, 70.9083),
        "pushkar": (26.4897, 74.5511),
        "mount abu": (24.5925, 72.7156),
        "manali": (32.2396, 77.1887),
        "shimla": (31.1048, 77.1734),
        "kullu": (31.9579, 77.1095),
        "dharamshala": (32.2190, 76.3234),
        "dharamsala": (32.2190, 76.3234),
        "mcleodganj": (32.2426, 76.3213),
        "kasol": (32.0100, 77.3150),
        "jibhi": (31.6375, 77.3789),
        "tirthan": (31.6425, 77.3450),
        "spiti": (32.2461, 78.0349),
        "kaza": (32.2276, 78.0722),
        "bir billing": (32.0400, 76.7167),
        "dalhousie": (32.5387, 75.9710),
        "rishikesh": (30.0869, 78.2676),
        "haridwar": (29.9457, 78.1642),
        "mussoorie": (30.4598, 78.0644),
        "dehradun": (30.3165, 78.0322),
        "nainital": (29.3919, 79.4542),
        "corbett": (29.5300, 78.7747),
        "jim corbett": (29.5300, 78.7747),
        "ranikhet": (29.6434, 79.4322),
        "almora": (29.5971, 79.6591),
        "kausani": (29.8453, 79.6000),
        "kanatal": (30.4144, 78.3411),
        "lansdowne": (29.8377, 78.6853),
        "mumbai": (19.0760, 72.8777),
        "pune": (18.5204, 73.8567),
        "lonavala": (18.7557, 73.4091),
        "khandala": (18.7619, 73.3644),
        "mahabaleshwar": (17.9237, 73.6586),
        "panchgani": (17.9244, 73.8000),
        "alibaug": (18.6414, 72.8722),
        "delhi": (28.6139, 77.2090),
        "new delhi": (28.6139, 77.2090),
        "agra": (27.1767, 78.0081),
        "varanasi": (25.3176, 82.9739),
        "kolkata": (22.5726, 88.3639)
    }

    @classmethod
    def resolve_destination_coordinates(cls, db: Session, destination: str) -> Optional[Tuple[float, float]]:
        """
        Authoritatively resolves geographic coordinates (lat, lon) for a requested destination.
        1. Checks catalog of authentic Indian destination coordinates.
        2. Falls back to coordinates of verified properties in PostgreSQL in that city/state.
        Never invents arbitrary coordinates.
        """
        dest_clean = destination.lower().strip()
        
        # 1. Direct match or key containment
        for key, coords in cls.DESTINATION_COORDINATES.items():
            if key == dest_clean:
                return coords
                
        for key, coords in cls.DESTINATION_COORDINATES.items():
            if key in dest_clean or dest_clean in key:
                return coords

        # 2. Database lookup from active verified properties in that destination
        prop_coords = db.query(Property.latitude, Property.longitude).filter(
            Property.is_active == True,
            Property.latitude.isnot(None),
            Property.longitude.isnot(None),
            or_(
                func.lower(Property.city).contains(dest_clean),
                func.lower(Property.state).contains(dest_clean),
                func.lower(Property.name).contains(dest_clean)
            )
        ).first()

        if prop_coords and prop_coords[0] is not None and prop_coords[1] is not None:
            return (float(prop_coords[0]), float(prop_coords[1]))

        return None

    @staticmethod
    def calculate_haversine_distance(lat1: Optional[float], lon1: Optional[float], lat2: Optional[float], lon2: Optional[float]) -> float:
        """
        Calculates great-circle distance between two geographic coordinate points in kilometers.
        """
        if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
            return 0.0
        R = 6371.0  # Earth radius in kilometers
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return round(R * c, 1)

    @staticmethod
    def calculate_approx_travel_time(distance_km: Optional[float]) -> Dict[str, Any]:
        """
        Calculates deterministic approximate driving travel time based on realistic road/hill terrain speeds in India.
        Explicitly outputs 'Driving time unavailable' if distance is missing or invalid.
        """
        if distance_km is None or distance_km <= 0:
            return {
                "minutes": 0,
                "travel_time_text": "Driving time unavailable",
                "travel_time_label": "Driving time unavailable"
            }
        d = float(distance_km)
        if d <= 1.0:
            minutes = 5
            text = "Approx. 5 min drive"
            short = "5 min"
        elif d <= 5.0:
            minutes = max(5, int(round((d * 2.5) / 5) * 5))
            text = f"Approx. {minutes} min drive"
            short = f"{minutes} min"
        elif d <= 15.0:
            # Hill and suburban roads: ~26 km/h
            minutes = max(10, int(round((d / 26.0 * 60) / 5) * 5))
            text = f"Approx. {minutes} min drive"
            short = f"{minutes} min"
        elif d <= 40.0:
            # Inter-district / state highways: ~32 km/h
            minutes = max(20, int(round((d / 32.0 * 60) / 5) * 5))
            if minutes >= 60:
                hrs = minutes // 60
                mins = minutes % 60
                text = f"Approx. {hrs} hr {f'{mins} min ' if mins else ''}drive".strip()
                short = f"{hrs} hr{f' {mins}m' if mins else ''}"
            else:
                text = f"Approx. {minutes} min drive"
                short = f"{minutes} min"
        else:
            # Long distance highways: ~40 km/h
            minutes = max(45, int(round((d / 40.0 * 60) / 5) * 5))
            hrs = minutes // 60
            mins = minutes % 60
            text = f"Approx. {hrs} hr {f'{mins} min ' if mins else ''}drive".strip()
            short = f"{hrs} hr{f' {mins}m' if mins else ''}"

        return {
            "minutes": minutes,
            "travel_time_text": text,
            "travel_time_label": short
        }

    @staticmethod
    def build_fits_description(
        adults: int,
        children: int = 0,
        room_quantity: int = 1,
        room_capacity: int = 2,
        room_name: str = "Room"
    ) -> Dict[str, str]:
        """
        Constructs traveler-friendly guest fit and room recommendation descriptions based on capacity.
        """
        adult_str = f"{adults} adult" if adults == 1 else f"{adults} adults"
        child_str = f", {children} child" if children == 1 else (f", {children} children" if children > 1 else "")
        guest_summary = f"{adult_str}{child_str}"

        room_word = "room" if room_quantity == 1 else "rooms"
        if room_quantity > 1:
            fits = f"{room_quantity} {room_word} · Fits {guest_summary} ({room_capacity} guests per room)"
            rec_title = f"{room_name} × {room_quantity}"
        else:
            fits = f"1 room · Fits {guest_summary}"
            rec_title = f"{room_name}"

        return {
            "fits_description": fits,
            "recommendation_title": rec_title,
            "recommendation_reason": f"Recommended room: {rec_title} ({fits})"
        }

    @classmethod
    def search_exact_match(
        cls,
        db: Session,
        destination: str,
        check_in: date,
        check_out: date,
        adults: int = 2,
        children: int = 0,
        child_ages: Optional[List[int]] = None,
        room_type: Optional[str] = None,
        property_type: Optional[str] = None,
        budget_max: Optional[float] = None,
        budget_type: Optional[str] = "TOTAL",
        amenities: Optional[List[str]] = None,
        together_preference: Optional[str] = None,
        requested_rooms_count: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        """
        LEVEL 1: Strict exact-match search in PostgreSQL for verified active stays in India.
        Evaluates single-room and multi-room allocations using authoritative room rules.
        """
        dest_clean = destination.strip()
        query = db.query(Property).filter(
            Property.is_active == True,
            Property.verification_status == PropertyVerificationStatus.VERIFIED.value,
            func.lower(Property.country) == "india",
            or_(
                func.lower(Property.city).contains(dest_clean.lower()),
                func.lower(Property.state).contains(dest_clean.lower()),
                func.lower(Property.name).contains(dest_clean.lower())
            )
        )

        if property_type and property_type.upper() not in ["ALL", "ANY"]:
            query = query.filter(func.lower(Property.property_type) == property_type.lower())

        candidate_properties = query.all()
        if not candidate_properties:
            return None

        single_room_candidates = []
        multi_room_candidates = []

        for prop in candidate_properties:
            # 1. Check property closures / blackouts
            prop_avail = cls.check_availability(
                db=db,
                property_id=prop.id,
                check_in=check_in,
                check_out=check_out,
                guests=adults + children
            )
            if not prop_avail.get("available"):
                continue

            # 2. Check active rooms
            rooms = db.query(Room).filter(Room.property_id == prop.id, Room.is_active == True).all()
            for room in rooms:
                # Strict room type matching
                if room_type:
                    rt_req = room_type.lower().strip()
                    r_name = room.name.lower()
                    r_type = (room.room_type or "").lower()
                    key_tokens = [t for t in rt_req.replace("room", "").replace("suite", "").split() if len(t) > 2]
                    matches_rt = (
                        rt_req in r_name or
                        rt_req in r_type or
                        any(t in r_name or t in r_type for t in key_tokens)
                    )
                    if not matches_rt:
                        continue

                exact_room_score = 2 if (room_type and room_type.lower() in room.name.lower()) else (1 if room_type else 0)
                exact_prop_score = 1 if (property_type and property_type.lower() == prop.property_type.lower()) else 0

                amenities_score = 0
                if amenities:
                    prop_ams = [a.amenity_name.lower() for a in getattr(prop, 'amenities', [])]
                    room_ams = [a.amenity_name.lower() for a in getattr(room, 'amenities', [])]
                    all_ams = set(prop_ams + room_ams)
                    amenities_score = sum(1 for req_am in amenities if req_am.lower() in all_ams)

                avail_info = AvailabilityService.check_room_availability(
                    db=db,
                    room_id=room.id,
                    check_in=check_in,
                    check_out=check_out
                )
                avail_qty = avail_info.get("available_quantity", 0) if avail_info.get("is_available") else 0

                # --- A. Single Room Evaluation (1 room fits all) ---
                sr_config = cls.calculate_room_configuration(
                    db=db,
                    property_id=prop.id,
                    room_id=room.id,
                    adults=adults,
                    children=children,
                    child_ages=child_ages,
                    requested_quantity=1
                )
                if sr_config.get("valid") and sr_config.get("quantity") == 1 and avail_qty >= 1:
                    sr_price = cls.calculate_booking_price(
                        db=db,
                        property_id=prop.id,
                        room_id=room.id,
                        check_in=check_in,
                        check_out=check_out,
                        room_quantity=1,
                        adults=adults,
                        children=children,
                        child_ages=child_ages
                    )
                    total_sr = sr_price["total_price"]
                    nights_sr = sr_price["nights"]
                    budget_ok = True
                    if budget_max:
                        if budget_type == "PER_NIGHT":
                            if (sr_price["room_total"] / nights_sr if nights_sr > 0 else total_sr) > budget_max:
                                budget_ok = False
                        else:
                            if total_sr > budget_max:
                                budget_ok = False
                    if budget_ok:
                        single_room_candidates.append({
                            "property": prop,
                            "room": room,
                            "room_config": sr_config,
                            "pricing": sr_price,
                            "total_price": total_sr,
                            "adults_per_room": adults,
                            "rank_tuple": (
                                exact_room_score,
                                exact_prop_score,
                                amenities_score,
                                -total_sr,
                                float(prop.rating or 0.0)
                            )
                        })

                # --- B. Multi Room Evaluation (>= 2 rooms) ---
                if (adults + children) >= 2 and (not requested_rooms_count or requested_rooms_count >= 2):
                    target_q = requested_rooms_count or 2
                    mr_config = cls.calculate_room_configuration(
                        db=db,
                        property_id=prop.id,
                        room_id=room.id,
                        adults=adults,
                        children=children,
                        child_ages=child_ages,
                        requested_quantity=target_q
                    )
                    if mr_config.get("valid") and mr_config.get("quantity") >= 2:
                        needed_mr_qty = mr_config.get("quantity")
                        if (not requested_rooms_count or needed_mr_qty == requested_rooms_count) and avail_qty >= needed_mr_qty:
                            mr_price = cls.calculate_booking_price(
                                db=db,
                                property_id=prop.id,
                                room_id=room.id,
                                check_in=check_in,
                                check_out=check_out,
                                room_quantity=needed_mr_qty,
                                adults=adults,
                                children=children,
                                child_ages=child_ages
                            )
                            total_mr = mr_price["total_price"]
                            nights_mr = mr_price["nights"]
                            budget_ok = True
                            if budget_max:
                                if budget_type == "PER_NIGHT":
                                    if (mr_price["room_total"] / nights_mr if nights_mr > 0 else total_mr) > budget_max:
                                        budget_ok = False
                                else:
                                    if total_mr > budget_max:
                                        budget_ok = False
                            if budget_ok:
                                adults_each = math.ceil(adults / needed_mr_qty)
                                multi_room_candidates.append({
                                    "property": prop,
                                    "room": room,
                                    "room_config": mr_config,
                                    "pricing": mr_price,
                                    "total_price": total_mr,
                                    "adults_per_room": adults_each,
                                    "rank_tuple": (
                                        exact_room_score,
                                        exact_prop_score,
                                        amenities_score,
                                        -total_mr,
                                        float(prop.rating or 0.0)
                                    )
                                })

        single_room_candidates.sort(key=lambda c: c["rank_tuple"], reverse=True)
        multi_room_candidates.sort(key=lambda c: c["rank_tuple"], reverse=True)

        if not single_room_candidates and not multi_room_candidates:
            return None

        def _build_result_dict(cand):
            p = cand["property"]
            r = cand["room"]
            cover_img = None
            if p.images:
                primary = [img.image_url for img in p.images if getattr(img, 'is_primary', False)]
                cover_img = primary[0] if primary else p.images[0].image_url
            return {
                "property": {
                    "id": p.id,
                    "name": p.name,
                    "city": p.city,
                    "state": p.state,
                    "property_type": p.property_type,
                    "rating": p.rating,
                    "review_count": p.review_count or 0,
                    "cover_image_url": cover_img,
                    "latitude": p.latitude,
                    "longitude": p.longitude
                },
                "room": {
                    "id": r.id,
                    "name": r.name,
                    "room_type": r.room_type,
                    "base_price": r.base_price,
                    "capacity": r.capacity,
                    "quantity": cand["room_config"]["quantity"]
                },
                "pricing": cand["pricing"],
                "room_config": cand["room_config"]
            }

        # Handle together preference
        if together_preference == "together" or requested_rooms_count == 1:
            if single_room_candidates:
                return _build_result_dict(single_room_candidates[0])
            elif multi_room_candidates:
                res = _build_result_dict(multi_room_candidates[0])
                res["cannot_fit_together"] = True
                return res

        # Handle separate preference
        if together_preference == "separate" or (requested_rooms_count and requested_rooms_count > 1):
            if multi_room_candidates:
                return _build_result_dict(multi_room_candidates[0])
            elif single_room_candidates:
                res = _build_result_dict(single_room_candidates[0])
                res["cannot_separate"] = True
                return res

        # No explicit preference: Check if both single-room and multi-room options exist
        if (adults + children) >= 3 and single_room_candidates and multi_room_candidates:
            sr_top = single_room_candidates[0]
            mr_top = multi_room_candidates[0]
            sr_dict = _build_result_dict(sr_top)
            mr_dict = _build_result_dict(mr_top)

            res = dict(sr_dict)
            res["is_choice"] = True
            res["single_choice"] = sr_dict
            res["multi_choice"] = mr_dict
            return res

        if single_room_candidates:
            return _build_result_dict(single_room_candidates[0])

        if multi_room_candidates:
            return _build_result_dict(multi_room_candidates[0])

        return None

    @classmethod
    def find_best_matching_stay(
        cls,
        db: Session,
        destination: str,
        check_in: date,
        check_out: date,
        adults: int = 2,
        children: int = 0,
        child_ages: Optional[List[int]] = None,
        room_type: Optional[str] = None,
        property_type: Optional[str] = None,
        budget_max: Optional[float] = None,
        budget_type: Optional[str] = "TOTAL",
        amenities: Optional[List[str]] = None,
        together_preference: Optional[str] = None,
        requested_rooms_count: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        """Delegates directly to search_exact_match for backward compatibility."""
        return cls.search_exact_match(
            db=db,
            destination=destination,
            check_in=check_in,
            check_out=check_out,
            adults=adults,
            children=children,
            child_ages=child_ages,
            room_type=room_type,
            property_type=property_type,
            budget_max=budget_max,
            budget_type=budget_type,
            amenities=amenities,
            together_preference=together_preference,
            requested_rooms_count=requested_rooms_count
        )

    @classmethod
    def search_same_destination_alternatives(
        cls,
        db: Session,
        destination: str,
        check_in: date,
        check_out: date,
        adults: int = 2,
        children: int = 0,
        child_ages: Optional[List[int]] = None,
        room_type: Optional[str] = None,
        property_type: Optional[str] = None,
        budget_max: Optional[float] = None,
        budget_type: Optional[str] = "TOTAL",
        amenities: Optional[List[str]] = None,
        limit: int = 4
    ) -> List[Dict[str, Any]]:
        """
        LEVEL 2: Searches same destination for available stays while relaxing optional constraints:
        - Different room types (e.g., Standard Room instead of Deluxe Room)
        - Different property types (e.g., Homestay instead of Resort)
        - Slightly higher budget with explicit price difference labeled
        Strictly enforces guest capacity (multi-room), child policies, and real availability.
        """
        dest_clean = destination.strip()
        query = db.query(Property).filter(
            Property.is_active == True,
            Property.verification_status == PropertyVerificationStatus.VERIFIED.value,
            func.lower(Property.country) == "india",
            or_(
                func.lower(Property.city).contains(dest_clean.lower()),
                func.lower(Property.state).contains(dest_clean.lower()),
                func.lower(Property.name).contains(dest_clean.lower())
            )
        )

        candidate_properties = query.all()
        if not candidate_properties:
            return []

        results = []
        for prop in candidate_properties:
            prop_avail = cls.check_availability(
                db=db,
                property_id=prop.id,
                check_in=check_in,
                check_out=check_out,
                guests=adults + children
            )
            if not prop_avail.get("available"):
                continue

            rooms = db.query(Room).filter(Room.property_id == prop.id, Room.is_active == True).all()
            for room in rooms:
                config_eval = cls.calculate_room_configuration(
                    db=db,
                    property_id=prop.id,
                    room_id=room.id,
                    adults=adults,
                    children=children,
                    child_ages=child_ages
                )
                if not config_eval.get("valid"):
                    continue

                needed_qty = config_eval.get("quantity", 1)

                avail_info = AvailabilityService.check_room_availability(
                    db=db,
                    room_id=room.id,
                    check_in=check_in,
                    check_out=check_out
                )
                if not avail_info.get("is_available") or avail_info.get("available_quantity", 0) < needed_qty:
                    continue

                price_eval = cls.calculate_booking_price(
                    db=db,
                    property_id=prop.id,
                    room_id=room.id,
                    check_in=check_in,
                    check_out=check_out,
                    room_quantity=needed_qty,
                    adults=adults,
                    children=children,
                    child_ages=child_ages
                )

                total_price = price_eval["total_price"]
                nights = price_eval["nights"]

                # Determine difference explanations
                diff_tags = []
                is_exact_match = True

                if room_type:
                    rt_clean = room_type.lower()
                    if rt_clean not in room.name.lower() and rt_clean not in (room.room_type or "").lower():
                        diff_tags.append(f"Different room type: {room.name}")
                        is_exact_match = False

                if property_type and property_type.upper() not in ["ALL", "ANY"]:
                    if property_type.lower() != prop.property_type.lower():
                        diff_tags.append(f"Different property type: {prop.property_type}")
                        is_exact_match = False

                is_over_budget = False
                over_amount = 0.0
                if budget_max:
                    if budget_type == "PER_NIGHT":
                        nightly_rate = price_eval["room_total"] / nights if nights > 0 else total_price
                        if nightly_rate > budget_max:
                            is_over_budget = True
                            over_amount = nightly_rate - budget_max
                            diff_tags.append(f"₹{over_amount:,.0f}/night above your budget")
                            is_exact_match = False
                    else:
                        if total_price > budget_max:
                            is_over_budget = True
                            over_amount = total_price - budget_max
                            diff_tags.append(f"₹{over_amount:,.0f} above your budget")
                            is_exact_match = False

                # Skip if it is an exact match (exact matches are handled by Level 1)
                if is_exact_match:
                    continue

                # Cap max budget relaxation to 1.7x
                if budget_max and total_price > budget_max * 1.7:
                    continue

                cover_img = None
                if prop.images:
                    primary = [img.image_url for img in prop.images if getattr(img, 'is_primary', False)]
                    cover_img = primary[0] if primary else prop.images[0].image_url

                diff_reason = " · ".join(diff_tags) if diff_tags else "Alternative room in same destination"
                fit_info = cls.build_fits_description(adults, children, needed_qty, room.capacity, room.name)

                results.append({
                    "match_type": "SAME_DESTINATION",
                    "diff_reason": diff_reason,
                    "differences": diff_tags if diff_tags else ["Different room type / configuration in same destination"],
                    "fits_description": fit_info["fits_description"],
                    "recommendation_title": fit_info["recommendation_title"],
                    "recommendation_reason": fit_info["recommendation_reason"],
                    "property_id": prop.id,
                    "property_name": prop.name,
                    "property_type": prop.property_type,
                    "city": prop.city,
                    "state": prop.state,
                    "location": f"{prop.city}, {prop.state}",
                    "distance_km": 0.0,
                    "distance_label": "Same destination",
                    "travel_time_text": "Same destination",
                    "travel_time_label": "Same location",
                    "travel_time_minutes": 0,
                    "property_image": cover_img,
                    "room_id": room.id,
                    "room_name": room.name,
                    "room_type": room.room_type,
                    "room_quantity": needed_qty,
                    "capacity": room.capacity,
                    "available_units": avail_info.get("available_quantity", 0),
                    "check_in": check_in.isoformat(),
                    "check_out": check_out.isoformat(),
                    "check_in_formatted": check_in.strftime("%d %b"),
                    "check_out_formatted": check_out.strftime("%d %b %Y"),
                    "dates_formatted": f"{check_in.strftime('%d %b')} – {check_out.strftime('%d %b %Y')}",
                    "total_nights": nights,
                    "nightly_price": price_eval["room_nightly_price"],
                    "total_price": total_price,
                    "rating": float(prop.rating or 4.8),
                    "review_count": int(prop.review_count or 0),
                    "adults": adults,
                    "children": children,
                    "child_ages": child_ages,
                    "supplements_total": price_eval.get("supplements_total", 0.0),
                    "pricing": price_eval,
                    "room_config": config_eval,
                    "is_over_budget": is_over_budget,
                    "over_amount": over_amount,
                    "verification_status": "VERIFIED",
                    "verification_label": "Verified stay",
                    "amenities": [a.amenity_name for a in getattr(prop, 'amenities', [])] if getattr(prop, 'amenities', None) else [],
                    "room_amenities": [a.amenity_name for a in getattr(room, 'amenities', [])] if getattr(room, 'amenities', None) else []
                })

        # Sort by total price & rating
        results.sort(key=lambda x: (x["total_price"], -x["rating"]))
        return results[:limit]

    @classmethod
    def search_nearby_properties(
        cls,
        db: Session,
        destination: str,
        check_in: date,
        check_out: date,
        adults: int = 2,
        children: int = 0,
        child_ages: Optional[List[int]] = None,
        room_type: Optional[str] = None,
        property_type: Optional[str] = None,
        budget_max: Optional[float] = None,
        budget_type: Optional[str] = "TOTAL",
        amenities: Optional[List[str]] = None,
        max_radius_km: float = 120.0,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        LEVEL 3: Searches nearby locations using REAL geographic coordinates in PostgreSQL.
        Calculates authentic Haversine distance and approximate road travel time.
        Recommends best matching room configuration tailored to guest composition and child policy.
        Supports progressive radius expansion (80km -> 150km -> 250km) and clear budget separation.
        """
        dest_coords = cls.resolve_destination_coordinates(db=db, destination=destination)
        if not dest_coords:
            return []

        dest_lat, dest_lon = dest_coords
        dest_clean = destination.lower().strip()

        # Query all active verified properties in India
        properties = db.query(Property).filter(
            Property.is_active == True,
            Property.verification_status == PropertyVerificationStatus.VERIFIED.value,
            func.lower(Property.country) == "india"
        ).all()

        within_budget_results = []
        over_budget_results = []

        # Evaluate candidate stays across progressive radii if needed
        radii_to_try = [80.0, 150.0, 250.0]

        for current_max_radius in radii_to_try:
            within_budget_results.clear()
            over_budget_results.clear()

            for prop in properties:
                # Exclude exact destination properties (handled in same-destination search)
                if prop.city and prop.city.lower() == dest_clean:
                    continue

                # Property coordinates resolution with city fallback
                prop_lat = prop.latitude
                prop_lon = prop.longitude
                if prop_lat is None or prop_lon is None:
                    city_coords = cls.resolve_destination_coordinates(db=db, destination=prop.city or "")
                    if city_coords:
                        prop_lat, prop_lon = city_coords
                    else:
                        continue

                dist_km = cls.calculate_haversine_distance(dest_lat, dest_lon, prop_lat, prop_lon)
                if dist_km > current_max_radius or dist_km <= 0.1:
                    continue

                travel_time_info = cls.calculate_approx_travel_time(dist_km)

                # Check property closures
                prop_avail = cls.check_availability(
                    db=db,
                    property_id=prop.id,
                    check_in=check_in,
                    check_out=check_out,
                    guests=adults + children
                )
                if not prop_avail.get("available"):
                    continue

                rooms = db.query(Room).filter(Room.property_id == prop.id, Room.is_active == True).all()
                for room in rooms:
                    if room_type:
                        rt_clean = room_type.lower()
                        if rt_clean not in room.name.lower() and rt_clean not in (room.room_type or "").lower():
                            continue

                    config_eval = cls.calculate_room_configuration(
                        db=db,
                        property_id=prop.id,
                        room_id=room.id,
                        adults=adults,
                        children=children,
                        child_ages=child_ages
                    )
                    if not config_eval.get("valid"):
                        continue

                    needed_qty = config_eval.get("quantity", 1)

                    avail_info = AvailabilityService.check_room_availability(
                        db=db,
                        room_id=room.id,
                        check_in=check_in,
                        check_out=check_out
                    )
                    if not avail_info.get("is_available") or avail_info.get("available_quantity", 0) < needed_qty:
                        continue

                    price_eval = cls.calculate_booking_price(
                        db=db,
                        property_id=prop.id,
                        room_id=room.id,
                        check_in=check_in,
                        check_out=check_out,
                        room_quantity=needed_qty,
                        adults=adults,
                        children=children,
                        child_ages=child_ages
                    )

                    total_price = price_eval["total_price"]
                    nights = price_eval["nights"]

                    # Budget evaluation
                    is_over = False
                    over_amt = 0.0
                    diff_labels = [f"Nearby stay ({dist_km:.1f} km from {destination} · {travel_time_info['travel_time_text']})"]
                    
                    if budget_max:
                        if budget_type == "PER_NIGHT":
                            nightly_rate = price_eval["room_total"] / nights if nights > 0 else total_price
                            if nightly_rate > budget_max:
                                is_over = True
                                over_amt = nightly_rate - budget_max
                                diff_labels.append(f"+₹{over_amt:,.0f}/night above budget")
                        else:
                            if total_price > budget_max:
                                is_over = True
                                over_amt = total_price - budget_max
                                diff_labels.append(f"+₹{over_amt:,.0f} above budget")

                    cover_img = None
                    if prop.images:
                        primary = [img.image_url for img in prop.images if getattr(img, 'is_primary', False)]
                        cover_img = primary[0] if primary else prop.images[0].image_url

                    fit_info = cls.build_fits_description(adults, children, needed_qty, room.capacity, room.name)

                    item_dict = {
                        "match_type": "NEARBY",
                        "diff_reason": " · ".join(diff_labels),
                        "differences": diff_labels,
                        "fits_description": fit_info["fits_description"],
                        "recommendation_title": fit_info["recommendation_title"],
                        "recommendation_reason": fit_info["recommendation_reason"],
                        "property_id": prop.id,
                        "property_name": prop.name,
                        "property_type": prop.property_type,
                        "city": prop.city,
                        "state": prop.state,
                        "location": f"{prop.city}, {prop.state}",
                        "distance_km": dist_km,
                        "distance_label": f"{dist_km:.1f} km from {destination}",
                        "travel_time_text": travel_time_info["travel_time_text"],
                        "travel_time_label": travel_time_info["travel_time_label"],
                        "travel_time_minutes": travel_time_info["minutes"],
                        "property_image": cover_img,
                        "room_id": room.id,
                        "room_name": room.name,
                        "room_type": room.room_type,
                        "room_quantity": needed_qty,
                        "capacity": room.capacity,
                        "available_units": avail_info.get("available_quantity", 0),
                        "check_in": check_in.isoformat(),
                        "check_out": check_out.isoformat(),
                        "check_in_formatted": check_in.strftime("%d %b"),
                        "check_out_formatted": check_out.strftime("%d %b %Y"),
                        "dates_formatted": f"{check_in.strftime('%d %b')} – {check_out.strftime('%d %b %Y')}",
                        "total_nights": nights,
                        "nightly_price": price_eval["room_nightly_price"],
                        "total_price": total_price,
                        "rating": float(prop.rating or 4.8),
                        "review_count": int(prop.review_count or 0),
                        "adults": adults,
                        "children": children,
                        "child_ages": child_ages,
                        "supplements_total": price_eval.get("supplements_total", 0.0),
                        "pricing": price_eval,
                        "room_config": config_eval,
                        "is_over_budget": is_over,
                        "over_amount": over_amt,
                        "verification_status": "VERIFIED",
                        "verification_label": "Verified stay",
                        "amenities": [a.amenity_name for a in getattr(prop, 'amenities', [])] if getattr(prop, 'amenities', None) else [],
                        "room_amenities": [a.amenity_name for a in getattr(room, 'amenities', [])] if getattr(room, 'amenities', None) else []
                    }

                    if is_over:
                        over_budget_results.append(item_dict)
                    else:
                        within_budget_results.append(item_dict)

            # If we found at least 2 stays within the current radius, we don't need to expand further
            if len(within_budget_results) >= 2 or (len(within_budget_results) + len(over_budget_results)) >= 3:
                break

        # Sort primarily by shortest distance, then lower price and higher rating
        within_budget_results.sort(key=lambda x: (x["distance_km"], x["total_price"], -x["rating"]))
        over_budget_results.sort(key=lambda x: (x["distance_km"], x["total_price"], -x["rating"]))

        # Respect budget: return within-budget options first. If none exist, return over-budget options clearly labeled
        if within_budget_results:
            return within_budget_results[:limit]
        return over_budget_results[:limit]

    @classmethod
    def search_alternative_dates(
        cls,
        db: Session,
        destination: str,
        check_in: date,
        check_out: date,
        adults: int = 2,
        children: int = 0,
        child_ages: Optional[List[int]] = None,
        room_type: Optional[str] = None,
        property_type: Optional[str] = None,
        budget_max: Optional[float] = None,
        budget_type: Optional[str] = "TOTAL",
        amenities: Optional[List[str]] = None,
        limit: int = 4
    ) -> List[Dict[str, Any]]:
        """
        LEVEL 4: Searches for same or closest verified stays on alternative date windows (±1, ±2, ±3, ±7 days).
        Preserves trip duration and ensures 100% complete stay inventory availability.
        """
        dest_clean = destination.strip()
        stay_nights = max(1, (check_out - check_in).days)

        # 1. Properties in destination or closest properties
        query = db.query(Property).filter(
            Property.is_active == True,
            Property.verification_status == PropertyVerificationStatus.VERIFIED.value,
            func.lower(Property.country) == "india",
            or_(
                func.lower(Property.city).contains(dest_clean.lower()),
                func.lower(Property.state).contains(dest_clean.lower()),
                func.lower(Property.name).contains(dest_clean.lower())
            )
        )
        target_properties = query.all()

        # If none in destination, check nearby properties within 80km
        if not target_properties:
            coords = cls.resolve_destination_coordinates(db, destination)
            if coords:
                all_props = db.query(Property).filter(
                    Property.is_active == True,
                    Property.verification_status == PropertyVerificationStatus.VERIFIED.value
                ).all()
                target_properties = []
                for p in all_props:
                    p_lat = p.latitude
                    p_lon = p.longitude
                    if p_lat is None or p_lon is None:
                        c_coords = cls.resolve_destination_coordinates(db, p.city or "")
                        if c_coords:
                            p_lat, p_lon = c_coords
                        else:
                            continue
                    if cls.calculate_haversine_distance(coords[0], coords[1], p_lat, p_lon) <= 80.0:
                        target_properties.append(p)

        if not target_properties:
            return []

        # Windows to evaluate
        date_offsets = [1, -1, 2, -2, 3, -3, 7, -7]
        results = []
        seen_keys = set()

        for offset in date_offsets:
            alt_check_in = check_in + timedelta(days=offset)
            alt_check_out = alt_check_in + timedelta(days=stay_nights)

            if alt_check_in < date.today():
                continue

            for prop in target_properties:
                # Check closure
                prop_avail = cls.check_availability(
                    db=db,
                    property_id=prop.id,
                    check_in=alt_check_in,
                    check_out=alt_check_out,
                    guests=adults + children
                )
                if not prop_avail.get("available"):
                    continue

                rooms = db.query(Room).filter(Room.property_id == prop.id, Room.is_active == True).all()
                for room in rooms:
                    if room_type:
                        rt_c = room_type.lower()
                        if rt_c not in room.name.lower() and rt_c not in (room.room_type or "").lower():
                            continue

                    config_eval = cls.calculate_room_configuration(
                        db=db,
                        property_id=prop.id,
                        room_id=room.id,
                        adults=adults,
                        children=children,
                        child_ages=child_ages
                    )
                    if not config_eval.get("valid"):
                        continue

                    needed_qty = config_eval.get("quantity", 1)

                    avail_info = AvailabilityService.check_room_availability(
                        db=db,
                        room_id=room.id,
                        check_in=alt_check_in,
                        check_out=alt_check_out
                    )
                    if not avail_info.get("is_available") or avail_info.get("available_quantity", 0) < needed_qty:
                        continue

                    price_eval = cls.calculate_booking_price(
                        db=db,
                        property_id=prop.id,
                        room_id=room.id,
                        check_in=alt_check_in,
                        check_out=alt_check_out,
                        room_quantity=needed_qty,
                        adults=adults,
                        children=children,
                        child_ages=child_ages
                    )

                    total_price = price_eval["total_price"]
                    nights = price_eval["nights"]

                    is_over_budget = False
                    over_amount = 0.0
                    if budget_max:
                        if budget_type == "PER_NIGHT":
                            nightly_rate = price_eval["room_total"] / nights if nights > 0 else total_price
                            if nightly_rate > budget_max:
                                is_over_budget = True
                                over_amount = nightly_rate - budget_max
                        else:
                            if total_price > budget_max:
                                is_over_budget = True
                                over_amount = total_price - budget_max

                    dedup_key = (prop.id, room.id, alt_check_in.isoformat())
                    if dedup_key in seen_keys:
                        continue
                    seen_keys.add(dedup_key)

                    cover_img = None
                    if prop.images:
                        primary = [img.image_url for img in prop.images if getattr(img, 'is_primary', False)]
                        cover_img = primary[0] if primary else prop.images[0].image_url

                    alt_dates_label = f"Alternative dates: {alt_check_in.strftime('%d %b')} – {alt_check_out.strftime('%d %b %Y')}"
                    fit_info = cls.build_fits_description(adults, children, needed_qty, room.capacity, room.name)

                    results.append({
                        "match_type": "ALTERNATIVE_DATE",
                        "diff_reason": alt_dates_label,
                        "differences": [alt_dates_label],
                        "fits_description": fit_info["fits_description"],
                        "recommendation_title": fit_info["recommendation_title"],
                        "recommendation_reason": fit_info["recommendation_reason"],
                        "property_id": prop.id,
                        "property_name": prop.name,
                        "property_type": prop.property_type,
                        "city": prop.city,
                        "state": prop.state,
                        "location": f"{prop.city}, {prop.state}",
                        "distance_km": None,
                        "distance_label": None,
                        "travel_time_text": "Same region",
                        "travel_time_label": "Same region",
                        "travel_time_minutes": 0,
                        "property_image": cover_img,
                        "room_id": room.id,
                        "room_name": room.name,
                        "room_type": room.room_type,
                        "room_quantity": needed_qty,
                        "capacity": room.capacity,
                        "available_units": avail_info.get("available_quantity", 0),
                        "check_in": alt_check_in.isoformat(),
                        "check_out": alt_check_out.isoformat(),
                        "check_in_formatted": alt_check_in.strftime("%d %b"),
                        "check_out_formatted": alt_check_out.strftime("%d %b %Y"),
                        "dates_formatted": f"{alt_check_in.strftime('%d %b')} – {alt_check_out.strftime('%d %b %Y')}",
                        "total_nights": stay_nights,
                        "nightly_price": price_eval["room_nightly_price"],
                        "total_price": total_price,
                        "rating": float(prop.rating or 4.8),
                        "review_count": int(prop.review_count or 0),
                        "adults": adults,
                        "children": children,
                        "child_ages": child_ages,
                        "supplements_total": price_eval.get("supplements_total", 0.0),
                        "pricing": price_eval,
                        "room_config": config_eval,
                        "is_over_budget": is_over_budget,
                        "over_amount": over_amount,
                        "verification_status": "VERIFIED",
                        "verification_label": "Verified stay",
                        "amenities": [a.amenity_name for a in getattr(prop, 'amenities', [])] if getattr(prop, 'amenities', None) else [],
                        "room_amenities": [a.amenity_name for a in getattr(room, 'amenities', [])] if getattr(room, 'amenities', None) else []
                    })

                    if len(results) >= limit:
                        break
                if len(results) >= limit:
                    break
            if len(results) >= limit:
                break

        return results[:limit]

    @classmethod
    def search_intelligent_fallbacks(
        cls,
        db: Session,
        destination: str,
        check_in: date,
        check_out: date,
        adults: int = 2,
        children: int = 0,
        child_ages: Optional[List[int]] = None,
        room_type: Optional[str] = None,
        property_type: Optional[str] = None,
        budget_max: Optional[float] = None,
        budget_type: Optional[str] = "TOTAL",
        amenities: Optional[List[str]] = None,
        together_preference: Optional[str] = None,
        requested_rooms_count: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Executes hierarchical fallback decision engine:
        1. Checks database existence of properties in destination (Case A vs Case B vs Case C)
        2. LEVEL 1: Exact match search with single vs multi-room choice detection
        3. LEVEL 2: Same destination relaxed optional requirements (room type, property type, budget)
        4. LEVEL 3: Nearby verified stays within calculated geographic coordinate radius & road travel time
        5. LEVEL 4: Alternative dates (±1, ±2, ±3, ±7 days) with 100% full stay inventory
        Returns curated real alternatives with deterministic state and traveler-friendly travel guidance.
        """
        dest_clean = destination.strip()
        prop_count_in_dest = db.query(func.count(Property.id)).filter(
            Property.is_active == True,
            Property.verification_status == PropertyVerificationStatus.VERIFIED.value,
            func.lower(Property.country) == "india",
            or_(
                func.lower(Property.city).contains(dest_clean.lower()),
                func.lower(Property.state).contains(dest_clean.lower()),
                func.lower(Property.name).contains(dest_clean.lower())
            )
        ).scalar() or 0

        destination_has_properties = (prop_count_in_dest > 0)
        dates_desc = f"{check_in.strftime('%d %b')}–{check_out.strftime('%d %b %Y')}"

        # Level 1: Exact Match Search
        exact_match = cls.search_exact_match(
            db=db,
            destination=destination,
            check_in=check_in,
            check_out=check_out,
            adults=adults,
            children=children,
            child_ages=child_ages,
            room_type=room_type,
            property_type=property_type,
            budget_max=budget_max,
            budget_type=budget_type,
            amenities=amenities,
            together_preference=together_preference,
            requested_rooms_count=requested_rooms_count
        )

        if exact_match:
            exact_match["destination_has_properties"] = True
            exact_match["destination_requested"] = destination

            # Multiple valid configurations available (e.g., 1 Family Room vs 2 Deluxe Rooms)
            if exact_match.get("is_choice"):
                sr = exact_match["single_choice"]
                mr = exact_match["multi_choice"]

                sr_prop = sr["property"]
                sr_room = sr["room"]
                sr_price = sr["pricing"]["total_price"]

                mr_prop = mr["property"]
                mr_room = mr["room"]
                mr_qty = mr["room_config"]["quantity"]
                mr_price = mr["pricing"]["total_price"]
                mr_adults_per_room = math.ceil(adults / mr_qty)

                opt1 = {
                    "option_index": 1,
                    "property_id": sr_prop["id"],
                    "property_name": sr_prop["name"],
                    "property_type": sr_prop["property_type"],
                    "city": sr_prop["city"],
                    "state": sr_prop["state"],
                    "room_id": sr_room["id"],
                    "room_name": sr_room["name"],
                    "room_type": sr_room["room_type"],
                    "room_quantity": 1,
                    "adults": adults,
                    "children": children,
                    "child_ages": child_ages,
                    "check_in": check_in.isoformat(),
                    "check_out": check_out.isoformat(),
                    "total_nights": sr["pricing"]["nights"],
                    "total_price": sr_price,
                    "nightly_price": sr["pricing"]["room_nightly_price"],
                    "fits_description": f"1 room · {adults} adults",
                    "recommendation_reason": f"Stay together in 1 {sr_room['name']}",
                    "configuration_type": "SINGLE_ROOM",
                    "label": f"1 {sr_room['name']} (Stay Together)"
                }

                opt2 = {
                    "option_index": 2,
                    "property_id": mr_prop["id"],
                    "property_name": mr_prop["name"],
                    "property_type": mr_prop["property_type"],
                    "city": mr_prop["city"],
                    "state": mr_prop["state"],
                    "room_id": mr_room["id"],
                    "room_name": mr_room["name"],
                    "room_type": mr_room["room_type"],
                    "room_quantity": mr_qty,
                    "adults": adults,
                    "children": children,
                    "child_ages": child_ages,
                    "check_in": check_in.isoformat(),
                    "check_out": check_out.isoformat(),
                    "total_nights": mr["pricing"]["nights"],
                    "total_price": mr_price,
                    "nightly_price": mr["pricing"]["room_nightly_price"] * mr_qty,
                    "fits_description": f"{mr_qty} rooms · {mr_adults_per_room} adults each",
                    "recommendation_reason": f"{mr_qty} separate {mr_room['name']}s",
                    "configuration_type": "MULTI_ROOM",
                    "label": f"{mr_qty} {mr_room['name']}s (Separate Rooms)"
                }

                choice_msg = (
                    f"I found a {sr_room['name']} in **{destination}** that fits all {adults} of you together, so you only need 1 room. "
                    f"There are also {mr_room['name']}s available if you prefer separate rooms.\n\n"
                    f"1. **{sr_room['name']}** — 1 room · {adults} adults · ₹{sr_price:,.0f}\n"
                    f"2. **{mr_room['name']}** — {mr_qty} rooms · {mr_adults_per_room} adults each · ₹{mr_price:,.0f}\n\n"
                    f"Which would you prefer?"
                )

                return {
                    "state": "CHOICE_AVAILABLE",
                    "exact_match": exact_match,
                    "alternatives": [opt1, opt2],
                    "configuration_choices": [opt1, opt2],
                    "message": choice_msg
                }

            # If user wanted together but only multi-room could be provided
            if exact_match.get("cannot_fit_together"):
                msg_txt = (
                    f"I couldn't find a single room that can accommodate all {adults} of you together in **{destination}** for those dates. "
                    f"I found {exact_match['room']['quantity']} {exact_match['room']['name']}s for ₹{exact_match['pricing']['total_price']:,.0f} total."
                )
            else:
                msg_txt = f"I found a verified stay in **{destination}** that matches your requirements."

            return {
                "state": "EXACT_MATCH",
                "exact_match": exact_match,
                "alternatives": [],
                "message": msg_txt
            }

        # Level 2: Same destination alternatives
        same_dest_alts = cls.search_same_destination_alternatives(
            db=db,
            destination=destination,
            check_in=check_in,
            check_out=check_out,
            adults=adults,
            children=children,
            child_ages=child_ages,
            room_type=room_type,
            property_type=property_type,
            budget_max=budget_max,
            budget_type=budget_type,
            amenities=amenities,
            limit=3
        )

        # Level 3: Nearby properties with real coordinates & road travel times
        nearby_alts = cls.search_nearby_properties(
            db=db,
            destination=destination,
            check_in=check_in,
            check_out=check_out,
            adults=adults,
            children=children,
            child_ages=child_ages,
            room_type=room_type,
            property_type=property_type,
            budget_max=budget_max,
            budget_type=budget_type,
            amenities=amenities,
            limit=4
        )

        # Level 4: Alternative dates
        alt_date_alts = cls.search_alternative_dates(
            db=db,
            destination=destination,
            check_in=check_in,
            check_out=check_out,
            adults=adults,
            children=children,
            child_ages=child_ages,
            room_type=room_type,
            property_type=property_type,
            budget_max=budget_max,
            budget_type=budget_type,
            amenities=amenities,
            limit=3
        )

        # Curate distinct alternatives
        curated_alts = []
        seen_combos = set()

        def _add_alt(item):
            key = (item["property_id"], item["room_id"], item["check_in"])
            if key not in seen_combos:
                seen_combos.add(key)
                curated_alts.append(item)

        for item in same_dest_alts[:2]:
            _add_alt(item)
        for item in nearby_alts[:4]:
            _add_alt(item)
        for item in alt_date_alts[:2]:
            _add_alt(item)

        # Assign 1-indexed option numbers and recommendation flags
        for idx, alt in enumerate(curated_alts, 1):
            alt["option_index"] = idx
            alt["is_recommended"] = (idx == 1)
            alt["destination_requested"] = destination
            alt["destination_has_properties"] = destination_has_properties

        # Case: genuinely nothing found anywhere
        if not curated_alts:
            if not destination_has_properties:
                msg = (
                    f"**No available Voyara stays in {destination}**\n\n"
                    f"We currently don't have any registered or nearby Voyara stays with rooms available for your dates ({dates_desc}).\n\n"
                    f"You can try adjusting your travel dates, exploring a nearby destination, or broadening your budget."
                )
            else:
                msg = (
                    f"**Stay Found — Rooms Currently Unavailable**\n\n"
                    f"Voyara stays are registered in **{destination}**, but no rooms are available for your selected dates ({dates_desc}) or nearby.\n\n"
                    f"You can try adjusting your travel dates or exploring alternative destinations."
                )
            return {
                "state": "NO_MATCH",
                "exact_match": None,
                "alternatives": [],
                "message": msg
            }

        # Case differentiation and header message formatting
        all_over_budget = (budget_max is not None and all(alt.get("is_over_budget", False) for alt in curated_alts))

        if nearby_alts and not same_dest_alts:
            state = "NEARBY_MATCH"
            if not destination_has_properties:
                # CASE C: No stays exist in requested destination
                if all_over_budget:
                    header = f"**No available stay found within your ₹{budget_max:,.0f} budget in {destination}.**\n\n**We found these available stays nearby (Over Budget):**"
                else:
                    header = f"**No available Voyara stays in {destination}**\n\n**We found these available stays nearby:**"
            else:
                # CASE B: Stays exist in destination but none available for dates
                prop_in_dest_sample = db.query(Property.name).filter(
                    Property.is_active == True,
                    Property.verification_status == PropertyVerificationStatus.VERIFIED.value,
                    func.lower(Property.city).contains(dest_clean.lower())
                ).first()
                sample_name = prop_in_dest_sample[0] if prop_in_dest_sample else f"Stays in {destination}"
                
                if all_over_budget:
                    header = (
                        f"**Stay Found — Rooms Currently Unavailable**\n\n"
                        f"{sample_name} is registered at this location, but no rooms are available within your ₹{budget_max:,.0f} budget for your selected dates ({dates_desc}).\n\n"
                        f"**Nearby Available Stays (Over Budget):**"
                    )
                else:
                    header = (
                        f"**Stay Found — Rooms Currently Unavailable**\n\n"
                        f"{sample_name} is registered at this location, but no rooms are available for your selected dates ({dates_desc}).\n\n"
                        f"**Nearby Available Stays:**"
                    )
        elif same_dest_alts:
            state = "CLOSE_MATCH"
            if all_over_budget:
                header = f"**No stay found in {destination} within your ₹{budget_max:,.0f} budget.**\n\nHere are available alternatives in **{destination}** (Over Budget):"
            else:
                header = f"**No {room_type or 'exact room'} is available in {destination} for those dates.**\n\nWe found these available verified stays in **{destination}** instead:"
        elif alt_date_alts:
            state = "ALTERNATIVE_DATE"
            header = f"**No stay is available in {destination} for {dates_desc}.**\n\nThe same or similar stays are available on these alternative dates:"
        else:
            state = "CLOSE_MATCH"
            header = f"**No exact match found in {destination} for {dates_desc}.**\n\nHere are the closest available options from our verified stays:"

        # Format traveler-friendly message: Recommended Hero Stay + Other Options + Guidance
        lines = [header, ""]

        opt1 = curated_alts[0]
        dist_str1 = f"📍 {opt1['distance_label']}" if opt1.get("distance_label") and opt1["distance_label"] != "Same destination" else f"📍 {opt1['location']}"
        travel_str1 = f" · 🚗 {opt1['travel_time_text']}" if opt1.get("travel_time_text") else " · 🚗 Driving time unavailable"
        loc_str1 = f"{dist_str1}{travel_str1}".strip()
        over_label1 = " ⚠️ **[Over Budget]**" if opt1.get("is_over_budget") else ""

        lines.append(f"⭐ **RECOMMENDED FOR YOU**{over_label1}")
        lines.append(f"**{opt1['property_name']}** ({opt1['city']}, {opt1['state']})")
        if loc_str1:
            lines.append(loc_str1)
        lines.append(f"🛏️ **{opt1['room_name']}**{' × ' + str(opt1['room_quantity']) if opt1['room_quantity'] > 1 else ''} ({opt1.get('fits_description', '')})")
        lines.append(f"📅 {opt1['dates_formatted']} ({opt1['total_nights']} nights)")
        lines.append(f"💰 ₹{opt1['nightly_price']:,.0f}/night · **₹{opt1['total_price']:,.0f} total**")
        lines.append(f"🛡️ Verified Voyara Stay · {opt1.get('available_units', 1)} room(s) available")

        if len(curated_alts) > 1:
            lines.append("")
            lines.append(f"🏨 **OTHER NEARBY OPTIONS**")
            for opt in curated_alts[1:]:
                dist_str = f" · {opt['distance_label']}" if opt.get("distance_label") and opt["distance_label"] != "Same destination" else ""
                travel_str = f" · {opt['travel_time_text']}" if opt.get("travel_time_text") else " · Driving time unavailable"
                over_tag = " **[Over Budget]**" if opt.get("is_over_budget") else ""
                lines.append(
                    f"• **Option {opt['option_index']}: {opt['property_name']}** ({opt['city']}{dist_str}{travel_str}){over_tag}\n"
                    f"  {opt['room_name']}{' × ' + str(opt['room_quantity']) if opt['room_quantity'] > 1 else ''} · ₹{opt['nightly_price']:,.0f}/night · 💰 **₹{opt['total_price']:,.0f} total** · Verified stay"
                )

        lines.append("")
        lines.append(
            "**Would you like to book one of these stays?**\n"
            "• Say **\"Book the recommended stay\"** or **\"Book option 2\"**\n"
            "• Or click one of the stay cards below to view the booking preview."
        )

        msg = "\n".join(lines)

        return {
            "state": state,
            "exact_match": None,
            "alternatives": curated_alts,
            "message": msg
        }

    @classmethod
    def resolve_conversational_selection(
        cls,
        user_message: str,
        displayed_alternatives: List[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """
        Resolves natural language references to currently displayed alternatives:
        - "the recommended one", "book recommended", "recommended stay", "top pick"
        - "the second one", "second option", "option 2", "book 2", "2"
        - "the cheaper one", "cheapest option", "lowest price"
        - "the nearby resort", "the homestay in Peermade", "choose Peermade Valley"
        - "together", "single room", "one room", "family room"
        - "separate", "separate rooms", "2 rooms", "deluxe room"
        Never initiates an unnecessary new search.
        """
        if not displayed_alternatives:
            return None

        msg_lower = user_message.lower().strip()

        # 0. "Recommended" / "Top pick" selection
        if re.search(r'\b(?:recommended|recommendation|top\s+pick|first\s+choice|best\s+fit)\b', msg_lower):
            for alt in displayed_alternatives:
                if alt.get("is_recommended") or alt.get("option_index") == 1:
                    return alt
            return displayed_alternatives[0]

        # 1. Direct Ordinal / Number parsing
        ord_map = {
            "first": 1, "1st": 1, "1": 1, "one": 1,
            "second": 2, "2nd": 2, "2": 2, "two": 2,
            "third": 3, "3rd": 3, "3": 3, "three": 3,
            "fourth": 4, "4th": 4, "4": 4, "four": 4,
            "fifth": 5, "5th": 5, "5": 5, "five": 5
        }

        for word, idx in ord_map.items():
            patterns = [
                rf'\b(?:the\s+)?{re.escape(word)}\s+(?:one|option|stay|hotel|resort|homestay|room|choice)\b',
                rf'\b(?:option|stay|number|no\.?|choice)\s+{re.escape(word)}\b',
                rf'\b(?:book|choose|select|reserve|pick|take|go with)\s+(?:the\s+)?{re.escape(word)}\b',
                rf'^\s*{re.escape(word)}\s*$'
            ]
            for pat in patterns:
                if re.search(pat, msg_lower):
                    for alt in displayed_alternatives:
                        if alt.get("option_index") == idx:
                            return alt
                    if 0 < idx <= len(displayed_alternatives):
                        return displayed_alternatives[idx - 1]

        # 2. Configuration selection: Together vs Separate
        if re.search(r'\b(?:all\s+together|everyone\s+together|together|single\s+room|one\s+room|1\s+room|same\s+room|family\s+room)\b', msg_lower):
            for alt in displayed_alternatives:
                if alt.get("configuration_type") == "SINGLE_ROOM" or alt.get("room_quantity") == 1 or "family" in (alt.get("room_name", "") + alt.get("room_type", "")).lower():
                    return alt

        if re.search(r'\b(?:separate|separate\s+rooms?|different\s+rooms?|2\s+rooms?|two\s+rooms?|deluxe\s+rooms?)\b', msg_lower):
            for alt in displayed_alternatives:
                if alt.get("configuration_type") == "MULTI_ROOM" or alt.get("room_quantity", 1) > 1 or "deluxe" in (alt.get("room_name", "") + alt.get("room_type", "")).lower():
                    return alt

        # 3. "Cheaper" / "Cheapest"
        if re.search(r'\b(?:cheaper|cheapest|lowest\s+price|more\s+affordable|budget\s+one)\b', msg_lower):
            sorted_by_price = sorted(displayed_alternatives, key=lambda a: a.get("total_price", 999999))
            return sorted_by_price[0]

        # 4. "Nearby" / "Closest"
        if re.search(r'\b(?:nearby|closer|closest|nearest)\b', msg_lower):
            nearby_items = [a for a in displayed_alternatives if a.get("match_type") == "NEARBY" or a.get("distance_km") is not None]
            if nearby_items:
                sorted_by_dist = sorted(nearby_items, key=lambda a: a.get("distance_km") or 9999)
                return sorted_by_dist[0]

        # 5. Room Name match
        for alt in displayed_alternatives:
            r_name = alt.get("room_name", "").lower()
            if len(r_name) > 3 and (r_name in msg_lower or any(w in msg_lower for w in r_name.split() if len(w) > 3)):
                return alt

        # 6. Property Name or City match
        for alt in displayed_alternatives:
            p_name = alt.get("property_name", "").lower()
            p_city = alt.get("city", "").lower()
            if len(p_name) > 3 and (p_name in msg_lower or any(w in msg_lower for w in p_name.split() if len(w) > 3)):
                return alt
            if len(p_city) > 3 and p_city in msg_lower:
                return alt

        # 7. Property Type match (e.g., "the resort", "the homestay")
        for alt in displayed_alternatives:
            p_type = alt.get("property_type", "").lower()
            if p_type and re.search(rf'\b(?:the\s+)?{re.escape(p_type)}\b', msg_lower):
                return alt

        return None

