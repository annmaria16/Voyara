import os
import json
import urllib.request
import urllib.parse
import logging
import uuid
from datetime import datetime
from dotenv import load_dotenv
load_dotenv(override=True)
from services.shopping.normalization_service import normalize_product, are_products_equivalent

logger = logging.getLogger("verinova.providers")


# ============================================================
# PROVIDER ADAPTER ARCHITECTURE
# ============================================================
class ProviderAdapter:
    def search(self, *args, **kwargs):
        raise NotImplementedError()
    def getDetails(self, *args, **kwargs):
        raise NotImplementedError()
    def execute(self, *args, **kwargs):
        raise NotImplementedError()
    def verify(self, *args, **kwargs):
        raise NotImplementedError()
    def normalize(self, data):
        return data


class ShoppingAdapter(ProviderAdapter):
    def __init__(self, provider_name: str):
        self.provider_name = provider_name
        
    def search(self, query: str) -> list:
        offers = ShoppingProvider.search_offers(query)
        normalized = []
        for o in offers:
            normalized.append(self.normalize(o))
        return normalized
        
    def normalize(self, data: dict) -> dict:
        return {
            "provider": self.provider_name,
            "productId": data.get("id"),
            "title": data.get("title"),
            "price": data.get("price"),
            "shipping": data.get("shipping", 0),
            "discount": data.get("discount", 0),
            "availability": data.get("availability", "IN_STOCK"),
            "url": data.get("url"),
            "seller": data.get("seller", "Seller"),
            "checkedAt": datetime.utcnow().isoformat()
        }


class GoogleCalendarAdapter(ProviderAdapter):
    def search(self) -> list:
        return CalendarProvider.list_events()
        
    def execute(self, title: str, start_time: str, description: str) -> dict:
        return CalendarProvider.create_event(title, start_time, description)
        
    def verify(self, event_id: str) -> bool:
        return CalendarProvider.verify_event(event_id)


# ============================================================
# SEARCH PROVIDER & NORMALIZATION
# ============================================================
class SearchProvider:
    @staticmethod
    def search_via_gemini(query: str, max_results: int = 5) -> list:
        gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
        if not gemini_key:
            raise RuntimeError("Gemini API key is not configured.")
            
        model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash").strip()
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={gemini_key}"
        
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": f"Search the web for: {query}"}]
                }
            ],
            "tools": [{"googleSearch": {}}]
        }
        
        headers = {"Content-Type": "application/json"}
        req_data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=req_data, headers=headers, method="POST")
        
        try:
            with urllib.request.urlopen(req, timeout=20) as response:
                res_data = json.loads(response.read().decode("utf-8"))
        except Exception as e:
            logger.error(f"Gemini search grounding request failed: {str(e)}")
            raise RuntimeError(f"Gemini search failed: {str(e)}")
            
        candidates = res_data.get("candidates", [])
        grounding_metadata = candidates[0].get("groundingMetadata", {}) if candidates else {}
        grounding_chunks = grounding_metadata.get("groundingChunks", [])
        
        results = []
        retrieved_at = datetime.utcnow().isoformat()
        for idx, chunk in enumerate(grounding_chunks):
            web = chunk.get("web", {})
            if web and web.get("uri"):
                title = web.get("title", f"Source {idx + 1}")
                uri = web.get("uri", "")
                results.append({
                    "title": title,
                    "url": uri,
                    "content": title,
                    "snippet": title,
                    "source": urllib.parse.urlparse(uri).netloc or "google.com",
                    "retrievedAt": retrieved_at,
                    "provider": "google_search_grounding"
                })
                if len(results) >= max_results:
                    break
                    
        if not results:
            content_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "") if candidates else ""
            if content_text:
                results.append({
                    "title": "Google Search Grounding Results",
                    "url": "https://google.com",
                    "content": content_text[:300],
                    "snippet": content_text[:300],
                    "source": "google.com",
                    "retrievedAt": retrieved_at,
                    "provider": "google_search_grounding"
                })
        return results

    @staticmethod
    def search(query: str, max_results: int = 5) -> list:
        api_key = os.getenv("TAVILY_API_KEY", "").strip()
        retrieved_at = datetime.utcnow().isoformat()
        
        if not api_key:
            gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
            if gemini_key:
                logger.info("Tavily API key is missing. Using Gemini Search Grounding as fallback.")
                return SearchProvider.search_via_gemini(query, max_results)
            raise RuntimeError("Search provider unavailable (Tavily API key is missing).")
        
        url = "https://api.tavily.com/search"
        headers = {"Content-Type": "application/json"}
        payload = {"api_key": api_key, "query": query, "max_results": max_results}
        try:
            req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=10) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                results = []
                for item in res_data.get("results", []):
                    results.append({
                        "title": item.get("title", ""),
                        "url": item.get("url", ""),
                        "snippet": item.get("content", ""),
                        "source": urllib.parse.urlparse(item.get("url", "")).netloc or "tavily.com",
                        "retrievedAt": retrieved_at,
                        "provider": "tavily"
                    })
                return results
        except Exception as e:
            logger.error(f"SearchProvider Tavily query failed: {str(e)}")
            # Try Gemini fallback even if Tavily was configured but failed
            gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
            if gemini_key:
                logger.info("Tavily query failed. Trying Gemini Search Grounding fallback.")
                return SearchProvider.search_via_gemini(query, max_results)
            raise RuntimeError(f"Search provider failed: {str(e)}")


# ============================================================
# BOOKING PROVIDER (MOCKED FOR DEMO MODE SAFETY)
# ============================================================
class BookingProvider:
    @staticmethod
    def search(destination: str) -> list:
        logger.info(f"[BookingProvider] Searching properties in {destination} (Simulated)")
        return [
            {"id": "prop_1", "name": "Cozy Center Suite", "price": 4500, "availability": "AVAILABLE"},
            {"id": "prop_2", "name": "Ocean Vista Deluxe", "price": 8900, "availability": "AVAILABLE"},
            {"id": "prop_3", "name": "Transit Inn", "price": 2200, "availability": "OUT_OF_STOCK"}
        ]

    @staticmethod
    def getAvailability(property_id: str) -> dict:
        return {"property_id": property_id, "available": True, "price": 4500}

    @staticmethod
    def getDetails(property_id: str) -> dict:
        return {"property_id": property_id, "name": "Cozy Center Suite", "rating": 4.7, "policy": "Free cancel"}

    @staticmethod
    def createBooking(property_id: str, guest_name: str, checkin_date: str) -> dict:
        booking_id = f"bk_{uuid.uuid4().hex[:8]}"
        logger.info(f"[BookingProvider] Created booking {booking_id} for {guest_name}")
        return {
            "success": True,
            "booking_id": booking_id,
            "property_id": property_id,
            "guest": guest_name,
            "checkin": checkin_date,
            "status": "COMPLETED",
            "reference": f"REF-{booking_id.upper()}"
        }

    @staticmethod
    def cancelBooking(booking_id: str) -> bool:
        logger.info(f"[BookingProvider] Cancelled booking {booking_id}")
        return True

    @staticmethod
    def getBookingStatus(booking_id: str) -> str:
        return "COMPLETED"


# ============================================================
# EMAIL PROVIDER
# ============================================================
class EmailProvider:
    @staticmethod
    def draft_email(to_email: str, subject: str, body: str) -> dict:
        draft_id = f"draft_{uuid.uuid4().hex[:8]}"
        return {
            "draft_id": draft_id,
            "to": to_email,
            "subject": subject,
            "body": body,
            "status": "DRAFTED"
        }

    @staticmethod
    def send_email(draft_id: str) -> bool:
        logger.info(f"[EmailProvider] Sent email draft {draft_id} to recipient (SMTP Mocked)")
        return True

    @staticmethod
    def reply(email_id: str, message: str) -> bool:
        logger.info(f"[EmailProvider] Replying to email {email_id} (Simulated)")
        return True


# ============================================================
# CALENDAR PROVIDER
# ============================================================
class CalendarProvider:
    @staticmethod
    def list_events() -> list:
        return [
            {"event_id": "evt_1", "title": "Team Standup", "start_time": "10:00 AM", "duration": "30m"},
            {"event_id": "evt_2", "title": "Client Review", "start_time": "2:00 PM", "duration": "1h"}
        ]

    @staticmethod
    def find_available_time(date_query: str) -> list:
        return ["11:00 AM", "3:30 PM", "4:00 PM"]

    @staticmethod
    def create_event(title: str, start_time: str, description: str) -> dict:
        event_id = f"evt_{uuid.uuid4().hex[:8]}"
        logger.info(f"[CalendarProvider] Created calendar event '{title}' at {start_time}")
        return {
            "event_id": event_id,
            "title": title,
            "start_time": start_time,
            "description": description,
            "status": "CREATED"
        }

    @staticmethod
    def update_event(event_id: str, new_time: str) -> bool:
        logger.info(f"[CalendarProvider] Updated event {event_id} to time {new_time}")
        return True

    @staticmethod
    def cancel_event(event_id: str) -> bool:
        logger.info(f"[CalendarProvider] Cancelled event {event_id}")
        return True

    @staticmethod
    def verify_event(event_id: str) -> bool:
        return True


# ============================================================
# MAPS PROVIDER
# ============================================================
class MapsProvider:
    @staticmethod
    def location_search(query: str) -> list:
        return [
            {"name": f"{query} Plaza", "latitude": 9.9312, "longitude": 76.2673},
            {"name": f"South {query} Junction", "latitude": 9.9340, "longitude": 76.2690}
        ]

    @staticmethod
    def distance(origin: str, destination: str) -> str:
        return "12.4 km"

    @staticmethod
    def route(origin: str, destination: str) -> list:
        return [f"Start at {origin}", "Merge onto Highway 66", f"Arrive at {destination}"]

    @staticmethod
    def travel_time(origin: str, destination: str) -> str:
        return "25 mins"


# ============================================================
# WEATHER PROVIDER
# ============================================================
class WeatherProvider:
    @staticmethod
    def get_weather(location: str, date: str) -> dict:
        logger.info(f"[WeatherProvider] Fetching weather forecast for {location} on {date}")
        return {
            "location": location,
            "date": date,
            "temperature_celsius": 29.5,
            "condition": "Partly Cloudy",
            "humidity": "78%",
            "source": "weather_simulated_api",
            "retrievedAt": datetime.utcnow().isoformat()
        }


# ============================================================
# BACKWARD COMPATIBLE SPECIFIC WRAPPERS
# ============================================================
class ShoppingProvider:
    @staticmethod
    def search_offers(query: str) -> list:
        import re
        import urllib.parse

        # 1. Parse budget and requested stores from the query
        budget = None
        under_match = re.search(r'(?:under|below|budget|max|maximum|rs\.?|₹)\s*([\d,]+)', query.lower())
        if under_match:
            try:
                val = float(under_match.group(1).replace(",", ""))
                if val > 1000:
                    budget = val
            except ValueError:
                pass

        stores = []
        for s in ["flipkart", "meesho", "amazon"]:
            if s in query.lower():
                stores.append(s.capitalize())
        if not stores:
            # Default to all three sources when none is specified
            stores = ["Flipkart", "Meesho", "Amazon"]

        # Clean product title
        t = query.lower()
        t = re.sub(r'\b(compare|prices|for|find|search|show|get|tell me|which is the best value|show me the sources|across|and|sources)\b', '', t)
        t = re.sub(r'(?:under|below|budget|max|maximum|rs\.?|₹)\s*[\d,]+', '', t)
        t = re.sub(r'\b(flipkart|meesho|amazon)\b', '', t)
        t = re.sub(r'\s+', ' ', t).strip()
        words = [w.capitalize() for w in t.split()]
        product_title = " ".join(words) if words else "Product"

        # 2. Run real web search using SearchProvider
        raw_results = []
        try:
            raw_results = SearchProvider.search(query, max_results=5)
        except Exception as e:
            logger.error(f"Search failed inside ShoppingProvider: {str(e)}")

        offers = []
        for idx, r in enumerate(raw_results):
            title = r.get("title") or r.get("snippet") or f"Product Match #{idx + 1}"
            snippet = r.get("snippet") or ""
            
            # Extract price using regex
            price = None
            price_match = re.search(r'(?:Rs\.?|₹|INR)\s*([\d,]+)', title + " " + snippet, re.IGNORECASE)
            if price_match:
                try:
                    price = float(price_match.group(1).replace(",", ""))
                except ValueError:
                    pass

            # Determine seller / store
            seller = r.get("source") or "Partner Seller"
            for store in ["Flipkart", "Meesho", "Amazon"]:
                if store.lower() in seller.lower() or store.lower() in r.get("url", "").lower():
                    seller = store
                    break

            offers.append({
                "id": len(offers) + 1,
                "title": title,
                "price": price,
                "shipping": 0,
                "discount": 0,
                "availability": "OUT_OF_STOCK" if "out of stock" in snippet.lower() else "IN_STOCK",
                "url": r["url"],
                "seller": seller,
                "source_type": "LIVE"
            })

        return offers


class TravelProvider:
    @staticmethod
    def search_hotels(destination: str, checkin: str = "", checkout: str = "") -> list:
        import re
        query = f"hotels in {destination} price per night booking"
        try:
            raw_results = SearchProvider.search(query, max_results=5)
            hotels = []
            for idx, r in enumerate(raw_results):
                title = r.get("title") or f"Hotel in {destination}"
                snippet = r.get("snippet") or ""
                price = None
                price_match = re.search(r'(?:Rs\.?|₹|INR|\$)\s*([\d,]+)', title + " " + snippet, re.IGNORECASE)
                if price_match:
                    try:
                        price = float(price_match.group(1).replace(",", ""))
                    except ValueError:
                        price = None
                hotels.append({
                    "hotel_name": title,
                    "price_per_night": price or 2500,
                    "rating": 4.5,
                    "availability": "AVAILABLE",
                    "url": r.get("url", ""),
                    "source": r.get("source", "web_search")
                })
            return hotels if hotels else [
                {"hotel_name": f"{destination.capitalize()} Accommodations", "price_per_night": 3000, "rating": 4.2, "availability": "AVAILABLE"}
            ]
        except Exception as e:
            logger.error(f"TravelProvider hotel search failed: {e}")
            return [
                {"hotel_name": f"Hotel near {destination}", "price_per_night": 3000, "rating": 4.0, "availability": "AVAILABLE"}
            ]

    @staticmethod
    def search_flights(source: str, destination: str, date: str = "") -> list:
        import re
        query = f"flights from {source} to {destination} price {date}"
        try:
            raw_results = SearchProvider.search(query, max_results=5)
            flights = []
            for idx, r in enumerate(raw_results):
                title = r.get("title") or f"Flight {source} to {destination}"
                snippet = r.get("snippet") or ""
                price = None
                price_match = re.search(r'(?:Rs\.?|₹|INR|\$)\s*([\d,]+)', title + " " + snippet, re.IGNORECASE)
                if price_match:
                    try:
                        price = float(price_match.group(1).replace(",", ""))
                    except ValueError:
                        price = None
                flights.append({
                    "flight_number": f"FL-{idx+101}",
                    "airline": "Airline Partner",
                    "price": price or 4500,
                    "duration": "2h 30m",
                    "url": r.get("url", ""),
                    "source": r.get("source", "web_search")
                })
            return flights if flights else [
                {"flight_number": "FL-101", "airline": "Airline Partner", "price": 4500, "duration": "2h 30m"}
            ]
        except Exception as e:
            logger.error(f"TravelProvider flight search failed: {e}")
            return [
                {"flight_number": "FL-101", "airline": "Flight Service", "price": 4500, "duration": "2h 30m"}
            ]

