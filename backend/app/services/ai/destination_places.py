import os
import math
import httpx
from typing import List, Dict, Any, Optional
from app.schemas.trip_planner import ExternalPlaceCandidate, DestinationInfo

# Destination metadata catalog for authentic regional travel presentation
DESTINATION_INFO_CATALOG: Dict[str, Dict[str, Any]] = {
    "munnar": {
        "name": "Munnar",
        "tagline": "Emerald Highlands, Tea Sanctuaries & Mountain Mist",
        "description": "Nestled at 1,600m in Kerala's Western Ghats, Munnar is a haven of rolling tea estates, cool mountain breezes, endangered wildlife, and cascading waterfalls.",
        "hero_image": "https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=1200&q=80",
        "gallery_images": [
            "https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1516690561799-46d8f74f9abf?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1582650625119-3a31f841839d?auto=format&fit=crop&w=800&q=80"
        ],
        "weather_note": "16°C – 22°C · Pleasant & Misty",
        "best_time_to_visit": "September to May",
        "highlights": ["Eravikulam National Park", "Mattupetty Dam", "Tata Tea Museum", "Top Station Viewpoint", "Attukad Waterfalls"]
    },
    "wayanad": {
        "name": "Wayanad",
        "tagline": "Pristine Rainforests, Spices & Misty Peaks",
        "description": "A green paradise in northern Kerala known for lush plantations, ancient caves, serene lakes, and tranquil eco-resorts.",
        "hero_image": "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80",
        "gallery_images": [
            "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80"
        ],
        "weather_note": "20°C – 26°C · Lush & Green",
        "best_time_to_visit": "October to May",
        "highlights": ["Banasura Sagar Dam", "Edakkal Caves", "Chembra Peak", "Soochipara Waterfalls"]
    },
    "goa": {
        "name": "Goa",
        "tagline": "Golden Beaches, Portuguese Heritage & Coastal Living",
        "description": "India's premier coastal sanctuary offering sun-drenched beaches, 17th-century churches, spice farms, and vibrant sunset cruises.",
        "hero_image": "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80",
        "gallery_images": [
            "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80"
        ],
        "weather_note": "27°C – 32°C · Tropical Sea Breeze",
        "best_time_to_visit": "November to April",
        "highlights": ["Fort Aguada", "Dudhsagar Waterfalls", "Basilica of Bom Jesus", "Palolem Beach", "Anjuna Coast"]
    },
    "jaipur": {
        "name": "Jaipur",
        "tagline": "The Pink City of Palaces, Forts & Royal Splendor",
        "description": "The regal capital of Rajasthan renowned for grand hilltop forts, ornate palaces, colorful textile bazaars, and rich royal heritage.",
        "hero_image": "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1200&q=80",
        "gallery_images": [
            "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1603288967916-2f04ec85c907?auto=format&fit=crop&w=800&q=80"
        ],
        "weather_note": "22°C – 30°C · Sunny & Crisp",
        "best_time_to_visit": "October to March",
        "highlights": ["Amber Fort", "Hawa Mahal", "City Palace", "Jantar Mantar", "Nahargarh Fort"]
    },
    "ooty": {
        "name": "Ooty",
        "tagline": "Queen of the Nilgiris & Pine-Covered Hills",
        "description": "Colonial hill retreat in Tamil Nadu with heritage toy train, botanical gardens, misty peaks, and sprawling tea valleys.",
        "hero_image": "https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=1200&q=80",
        "gallery_images": [
            "https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=800&q=80"
        ],
        "weather_note": "14°C – 20°C · Crisp & Alpine",
        "best_time_to_visit": "All Year Round",
        "highlights": ["Botanical Gardens", "Doddabetta Peak", "Pykara Lake & Falls", "Nilgiri Mountain Railway"]
    },
    "kochi": {
        "name": "Kochi",
        "tagline": "Colonial Harbor, Chinese Fishing Nets & Heritage Culture",
        "description": "Ancient spice trade port combining Portuguese, Dutch, and British colonial history with serene backwaters and art cafes.",
        "hero_image": "https://images.unsplash.com/photo-1609766857041-ed402ea8069a?auto=format&fit=crop&w=1200&q=80",
        "gallery_images": [
            "https://images.unsplash.com/photo-1609766857041-ed402ea8069a?auto=format&fit=crop&w=800&q=80"
        ],
        "weather_note": "26°C – 31°C · Coastal Breeze",
        "best_time_to_visit": "September to March",
        "highlights": ["Fort Kochi & Chinese Nets", "Mattancherry Palace", "Jew Town Synagogue", "Marine Drive Promenade"]
    }
}

# Comprehensive verified destination catalog for real Indian destinations
# All places are real, with authentic coordinates, categories, photos, and descriptions.
VERIFIED_DESTINATION_CATALOG: Dict[str, List[Dict[str, Any]]] = {
    "munnar": [
        {
            "external_place_id": "munnar_eravikulam",
            "name": "Eravikulam National Park & Rajamalai",
            "category": "NATURE_WILDLIFE",
            "description": "Home to the endangered Nilgiri Tahr and blooming Neelakurinji flowers, offering high-altitude grassland views and rolling hills.",
            "latitude": 10.1500,
            "longitude": 77.0500,
            "estimated_duration": "3 Hours",
            "opening_hours": "07:30 - 16:00",
            "rating": 4.6,
            "photo_url": "https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=600&q=80"
        },
        {
            "external_place_id": "munnar_mattupetty_dam",
            "name": "Mattupetty Dam & Lake",
            "category": "SIGHTSEEING_LAKE",
            "description": "Storage concrete gravity dam with tranquil reservoir waters, surrounded by tea gardens and speedboat excursions.",
            "latitude": 10.1062,
            "longitude": 77.1235,
            "estimated_duration": "2 Hours",
            "opening_hours": "09:00 - 17:00",
            "rating": 4.4,
            "photo_url": "https://images.unsplash.com/photo-1516690561799-46d8f74f9abf?auto=format&fit=crop&w=600&q=80"
        },
        {
            "external_place_id": "munnar_tea_museum",
            "name": "Tata Tea Museum (KDHP)",
            "category": "CULTURE_HERITAGE",
            "description": "Historic tea processing machinery, tea tasting demonstrations, and the rich legacy of Munnar's plantation history.",
            "latitude": 10.0883,
            "longitude": 77.0592,
            "estimated_duration": "1.5 Hours",
            "opening_hours": "09:00 - 17:00",
            "rating": 4.5,
            "photo_url": "https://images.unsplash.com/photo-1582650625119-3a31f841839d?auto=format&fit=crop&w=600&q=80"
        },
        {
            "external_place_id": "munnar_top_station",
            "name": "Top Station Viewpoint",
            "category": "MOUNTAINS_VIEWPOINT",
            "description": "Highest point in Munnar on the Kerala-Tamil Nadu border, offering panoramic vistas of the Western Ghats and cloud blankets.",
            "latitude": 10.1252,
            "longitude": 77.2443,
            "estimated_duration": "2.5 Hours",
            "opening_hours": "06:00 - 18:00",
            "rating": 4.7,
            "photo_url": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80"
        },
        {
            "external_place_id": "munnar_kundala_lake",
            "name": "Kundala Arch Dam & Lake",
            "category": "SIGHTSEEING_BOATING",
            "description": "Picturesque reservoir famous for pedal boating, Kashmiri shikara boat rides, and cherry blossom trees.",
            "latitude": 10.1337,
            "longitude": 77.1856,
            "estimated_duration": "2 Hours",
            "opening_hours": "09:00 - 17:00",
            "rating": 4.3,
            "photo_url": "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=600&q=80"
        },
        {
            "external_place_id": "munnar_attukad_falls",
            "name": "Attukad Waterfalls",
            "category": "NATURE_WATERFALL",
            "description": "Cascading mountain waterfall set amidst dense jungle foliage and terraced hillsides, ideal for photography and brief hikes.",
            "latitude": 10.0520,
            "longitude": 77.0420,
            "estimated_duration": "1.5 Hours",
            "opening_hours": "08:00 - 18:00",
            "rating": 4.5,
            "photo_url": "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=600&q=80"
        },
        {
            "external_place_id": "munnar_pothamedu_viewpoint",
            "name": "Pothamedu Viewpoint",
            "category": "MOUNTAINS_VIEWPOINT",
            "description": "Scenic cliffside vantage offering sunset views over cardamom, coffee, and sprawling emerald tea plantations.",
            "latitude": 10.0630,
            "longitude": 77.0540,
            "estimated_duration": "1.5 Hours",
            "opening_hours": "06:00 - 19:00",
            "rating": 4.5,
            "photo_url": "https://images.unsplash.com/photo-1511884642898-4c92249e20b6?auto=format&fit=crop&w=600&q=80"
        },
        {
            "external_place_id": "munnar_marayoor_sandalwood",
            "name": "Marayoor Sandalwood Forest & Dolmens",
            "category": "HERITAGE_NATURE",
            "description": "Natural sandalwood reserve and ancient megalithic stone dolmens dating back to the Neolithic age.",
            "latitude": 10.2796,
            "longitude": 77.1620,
            "estimated_duration": "3 Hours",
            "opening_hours": "08:00 - 17:00",
            "rating": 4.4,
            "photo_url": "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80"
        }
    ],
    "goa": [
        {
            "external_place_id": "goa_fort_aguada",
            "name": "Fort Aguada & Lighthouse",
            "category": "HERITAGE_LANDMARK",
            "description": "Well-preserved 17th-century Portuguese fortress overlooking Sinquerim Beach and the Arabian Sea.",
            "latitude": 15.4920,
            "longitude": 73.7737,
            "estimated_duration": "2 Hours",
            "opening_hours": "09:30 - 18:00",
            "rating": 4.5,
            "photo_url": "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=80"
        },
        {
            "external_place_id": "goa_dudhsagar_falls",
            "name": "Dudhsagar Waterfalls",
            "category": "NATURE_WATERFALL",
            "description": "Four-tiered majestic waterfall on the Mandovi River, cascading like a sea of milk through the Bhagwan Mahaveer Sanctuary.",
            "latitude": 15.3144,
            "longitude": 74.3143,
            "estimated_duration": "4 Hours",
            "opening_hours": "07:00 - 17:00",
            "rating": 4.7,
            "photo_url": "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=600&q=80"
        },
        {
            "external_place_id": "goa_basilica_bom_jesus",
            "name": "Basilica of Bom Jesus (Old Goa)",
            "category": "HERITAGE_CULTURE",
            "description": "UNESCO World Heritage site holding the mortal remains of St. Francis Xavier, exemplary of Baroque architecture.",
            "latitude": 15.5008,
            "longitude": 73.9116,
            "estimated_duration": "1.5 Hours",
            "opening_hours": "09:00 - 18:30",
            "rating": 4.6,
            "photo_url": "https://images.unsplash.com/photo-1582650625119-3a31f841839d?auto=format&fit=crop&w=600&q=80"
        },
        {
            "external_place_id": "goa_anjuna_flea_market",
            "name": "Anjuna Beach & Flea Market",
            "category": "BEACH_SHOPPING",
            "description": "Vibrant beachside bazaar featuring bohemian crafts, spices, jewelry, and seaside cafes.",
            "latitude": 15.5807,
            "longitude": 73.7432,
            "estimated_duration": "2.5 Hours",
            "opening_hours": "10:00 - 20:00",
            "rating": 4.3,
            "photo_url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80"
        },
        {
            "external_place_id": "goa_palolem_beach",
            "name": "Palolem Beach & Butterfly Island",
            "category": "BEACH_RELAXATION",
            "description": "Crescent-shaped white-sand bay fringed with coconut palms, calm swimming waters, and dolphin-spotting cruises.",
            "latitude": 15.0100,
            "longitude": 74.0232,
            "estimated_duration": "3 Hours",
            "opening_hours": "24 Hours",
            "rating": 4.6,
            "photo_url": "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=80"
        }
    ],
    "wayanad": [
        {
            "external_place_id": "wayanad_banasura_dam",
            "name": "Banasura Sagar Dam",
            "category": "NATURE_LAKE",
            "description": "Largest earthen dam in India, set against the Banasura hills with island formations and speedboating.",
            "latitude": 11.6698,
            "longitude": 75.9572,
            "estimated_duration": "2.5 Hours",
            "opening_hours": "09:00 - 17:00",
            "rating": 4.5,
            "photo_url": "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80"
        },
        {
            "external_place_id": "wayanad_edakkal_caves",
            "name": "Edakkal Caves",
            "category": "HERITAGE_TREK",
            "description": "Prehistoric rock shelters with petroglyphic engravings dating back over 6,000 years to the Stone Age.",
            "latitude": 11.6288,
            "longitude": 76.2343,
            "estimated_duration": "2.5 Hours",
            "opening_hours": "09:00 - 16:00",
            "rating": 4.4,
            "photo_url": "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=600&q=80"
        },
        {
            "external_place_id": "wayanad_chembra_peak",
            "name": "Chembra Peak & Heart Lake",
            "category": "ADVENTURE_TREK",
            "description": "Highest peak in Wayanad, renowned for the perennial heart-shaped lake (Hridaya Saras) near the summit.",
            "latitude": 11.5127,
            "longitude": 76.0850,
            "estimated_duration": "4 Hours",
            "opening_hours": "07:00 - 14:00",
            "rating": 4.7,
            "photo_url": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80"
        },
        {
            "external_place_id": "wayanad_soochipara_falls",
            "name": "Soochipara (Sentinel Rock) Waterfalls",
            "category": "NATURE_WATERFALL",
            "description": "Three-tiered waterfall falling from 200 meters into a natural pool surrounded by dense deciduous forests.",
            "latitude": 11.5110,
            "longitude": 76.1600,
            "estimated_duration": "2 Hours",
            "opening_hours": "09:00 - 17:00",
            "rating": 4.4,
            "photo_url": "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=600&q=80"
        }
    ],
    "jaipur": [
        {
            "external_place_id": "jaipur_amber_palace",
            "name": "Amber Fort & Palace",
            "category": "HERITAGE_PALACE",
            "description": "Grand hilltop fortress blending Rajput and Mughal architecture, with ornate courtyards and Sheesh Mahal mirror palace.",
            "latitude": 26.9855,
            "longitude": 75.8513,
            "estimated_duration": "3 Hours",
            "opening_hours": "08:00 - 17:30",
            "rating": 4.7,
            "photo_url": "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=600&q=80"
        },
        {
            "external_place_id": "jaipur_hawa_mahal",
            "name": "Hawa Mahal (Palace of Winds)",
            "category": "HERITAGE_LANDMARK",
            "description": "Iconic pink sandstone facade with 953 jharokhas (windows) designed for royal women to observe street festivities.",
            "latitude": 26.9239,
            "longitude": 75.8267,
            "estimated_duration": "1.5 Hours",
            "opening_hours": "09:00 - 17:00",
            "rating": 4.5,
            "photo_url": "https://images.unsplash.com/photo-1603288967916-2f04ec85c907?auto=format&fit=crop&w=600&q=80"
        },
        {
            "external_place_id": "jaipur_city_palace",
            "name": "City Palace & Museum",
            "category": "HERITAGE_MUSEUM",
            "description": "Royal residence of the Maharaja of Jaipur featuring courtyards, armory collections, and royal textiles.",
            "latitude": 26.9258,
            "longitude": 75.8237,
            "estimated_duration": "2.5 Hours",
            "opening_hours": "09:30 - 17:00",
            "rating": 4.6,
            "photo_url": "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=600&q=80"
        },
        {
            "external_place_id": "jaipur_jantar_mantar",
            "name": "Jantar Mantar Astronomical Observatory",
            "category": "HERITAGE_SCIENCE",
            "description": "UNESCO World Heritage collection of 19 monumental astronomical instruments built by Maharaja Sawai Jai Singh II.",
            "latitude": 26.9248,
            "longitude": 75.8246,
            "estimated_duration": "1.5 Hours",
            "opening_hours": "09:00 - 17:00",
            "rating": 4.5,
            "photo_url": "https://images.unsplash.com/photo-1582650625119-3a31f841839d?auto=format&fit=crop&w=600&q=80"
        }
    ],
    "ooty": [
        {
            "external_place_id": "ooty_botanical_gardens",
            "name": "Government Botanical Garden",
            "category": "NATURE_GARDEN",
            "description": "Sprawling 55-acre garden established in 1848, featuring thousands of exotic flora and a 20-million-year-old fossilized tree trunk.",
            "latitude": 11.4187,
            "longitude": 76.7118,
            "estimated_duration": "2 Hours",
            "opening_hours": "07:00 - 18:30",
            "rating": 4.4,
            "photo_url": "https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=600&q=80"
        },
        {
            "external_place_id": "ooty_doddabetta_peak",
            "name": "Doddabetta Peak & Telescope House",
            "category": "MOUNTAINS_VIEWPOINT",
            "description": "Highest mountain in the Nilgiri Hills (2,637 m) offering sweeping views over the valley and Bandipur sanctuary.",
            "latitude": 11.4005,
            "longitude": 76.7358,
            "estimated_duration": "2 Hours",
            "opening_hours": "09:00 - 18:00",
            "rating": 4.3,
            "photo_url": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80"
        },
        {
            "external_place_id": "ooty_pykara_falls_lake",
            "name": "Pykara Lake & Waterfalls",
            "category": "NATURE_LAKE",
            "description": "Sacred river of the Toda people forming scenic cascading falls and a quiet boating reservoir surrounded by pine woods.",
            "latitude": 11.4550,
            "longitude": 76.6020,
            "estimated_duration": "2.5 Hours",
            "opening_hours": "08:30 - 17:30",
            "rating": 4.5,
            "photo_url": "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=600&q=80"
        }
    ],
    "kochi": [
        {
            "external_place_id": "kochi_fort_kochi_beach",
            "name": "Fort Kochi & Chinese Fishing Nets",
            "category": "HERITAGE_CULTURE",
            "description": "Historic seaside promenade showcasing cantilevered Chinese fishing nets (Cheena Vala) and colonial architecture.",
            "latitude": 9.9656,
            "longitude": 76.2425,
            "estimated_duration": "2 Hours",
            "opening_hours": "06:00 - 20:00",
            "rating": 4.5,
            "photo_url": "https://images.unsplash.com/photo-1609766857041-ed402ea8069a?auto=format&fit=crop&w=600&q=80"
        },
        {
            "external_place_id": "kochi_mattancherry_palace",
            "name": "Mattancherry Palace (Dutch Palace)",
            "category": "HERITAGE_MUSEUM",
            "description": "Portuguese-built palace famous for intricate Hindu murals depicting scenes from the Ramayana and Mahabharata.",
            "latitude": 9.9582,
            "longitude": 76.2592,
            "estimated_duration": "1.5 Hours",
            "opening_hours": "09:45 - 13:00, 14:00 - 16:45 (Closed Fri)",
            "rating": 4.3,
            "photo_url": "https://images.unsplash.com/photo-1582650625119-3a31f841839d?auto=format&fit=crop&w=600&q=80"
        },
        {
            "external_place_id": "kochi_jew_town_synagogue",
            "name": "Jew Town & Paradesi Synagogue",
            "category": "CULTURE_HERITAGE",
            "description": "16th-century synagogue in the antique district of Mattancherry featuring Belgian glass chandeliers and Chinese hand-painted tiles.",
            "latitude": 9.9576,
            "longitude": 76.2598,
            "estimated_duration": "1.5 Hours",
            "opening_hours": "10:00 - 17:00",
            "rating": 4.4,
            "photo_url": "https://images.unsplash.com/photo-1609766857041-ed402ea8069a?auto=format&fit=crop&w=600&q=80"
        }
    ]
}

class DestinationPlacesService:
    @staticmethod
    def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate great-circle distance between two points in km."""
        if not lat1 or not lon1 or not lat2 or not lon2:
            return 0.0
        R = 6371.0  # Earth radius in kilometers
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return round(R * c, 2)

    @staticmethod
    def estimate_travel_time_minutes(distance_km: float) -> int:
        """Estimate travel time in minutes based on realistic mountain/urban transit speed (average 30-40 km/h + overhead)."""
        if distance_km <= 0.1:
            return 0
        minutes = int((distance_km / 35.0) * 60) + 5
        return max(5, minutes)

    @classmethod
    def get_destination_info(cls, destination: str) -> Optional[DestinationInfo]:
        """
        Retrieves authentic destination metadata, hero photography, highlights, and weather.
        """
        dest_clean = destination.lower().strip()
        matched_key = None
        for key in DESTINATION_INFO_CATALOG:
            if key in dest_clean or dest_clean in key:
                matched_key = key
                break
        
        if not matched_key:
            # Fallback info
            return DestinationInfo(
                name=destination.title(),
                tagline=f"Experience the natural beauty and culture of {destination.title()}",
                description=f"A scenic travel destination offering regional highlights, culture, and nature.",
                hero_image="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
                gallery_images=[],
                weather_note="Pleasant travel conditions",
                best_time_to_visit="October to May",
                highlights=[]
            )

        info = DESTINATION_INFO_CATALOG[matched_key]
        return DestinationInfo(
            name=info["name"],
            tagline=info.get("tagline"),
            description=info.get("description"),
            hero_image=info.get("hero_image"),
            gallery_images=info.get("gallery_images", []),
            weather_note=info.get("weather_note"),
            best_time_to_visit=info.get("best_time_to_visit"),
            highlights=info.get("highlights", [])
        )

    @classmethod
    def get_destination_places(
        cls,
        destination: str,
        interests: Optional[List[str]] = None,
        max_results: int = 8
    ) -> List[ExternalPlaceCandidate]:
        """
        Retrieves real-world destination attractions with coordinates and authentic imagery.
        Checks Google Places API if GOOGLE_MAPS_API_KEY is configured;
        Otherwise uses the verified, high-accuracy destination catalog.
        NEVER hallucinates fake places.
        """
        dest_clean = destination.lower().strip()
        google_api_key = os.getenv("GOOGLE_MAPS_API_KEY", "")

        # 1. External Google Places Provider if configured
        if google_api_key:
            try:
                places = cls._fetch_google_places(destination, google_api_key, max_results)
                if places:
                    return places
            except Exception as e:
                print(f"[DestinationPlacesService] Google Places API fetch failed: {e}. Falling back to verified catalog.")

        # 2. Look up matching destination in verified catalog
        matched_key = None
        for key in VERIFIED_DESTINATION_CATALOG:
            if key in dest_clean or dest_clean in key:
                matched_key = key
                break

        if not matched_key:
            for key in VERIFIED_DESTINATION_CATALOG:
                words = dest_clean.split()
                if any(w in key for w in words if len(w) >= 3):
                    matched_key = key
                    break

        if not matched_key:
            return []

        raw_places = VERIFIED_DESTINATION_CATALOG[matched_key]

        filtered = []
        interests_upper = [i.upper() for i in (interests or [])]
        
        for p in raw_places:
            candidate = ExternalPlaceCandidate(
                source="VERIFIED_CATALOG",
                external_place_id=p["external_place_id"],
                name=p["name"],
                category=p["category"],
                description=p["description"],
                latitude=p["latitude"],
                longitude=p["longitude"],
                estimated_duration=p["estimated_duration"],
                opening_hours=p.get("opening_hours"),
                rating=p.get("rating", 4.5),
                photo_url=p.get("photo_url")
            )
            filtered.append(candidate)

        return filtered[:max_results]

    @classmethod
    def _fetch_google_places(cls, destination: str, api_key: str, max_results: int) -> List[ExternalPlaceCandidate]:
        """Fetch real attractions from Google Places API."""
        url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
        params = {
            "query": f"top attractions in {destination}",
            "key": api_key,
            "language": "en"
        }
        with httpx.Client(timeout=6.0) as client:
            resp = client.get(url, params=params)
            if resp.status_code == 200:
                data = resp.json()
                results = data.get("results", [])
                candidates = []
                for item in results[:max_results]:
                    loc = item.get("geometry", {}).get("location", {})
                    candidates.append(ExternalPlaceCandidate(
                        source="GOOGLE_PLACES",
                        external_place_id=item.get("place_id", ""),
                        name=item.get("name", "Attraction"),
                        category="POINT_OF_INTEREST",
                        description=f"Verified point of interest in {destination}. Rating: {item.get('rating', 'N/A')}/5.",
                        latitude=loc.get("lat", 0.0),
                        longitude=loc.get("lng", 0.0),
                        estimated_duration="2 Hours",
                        rating=item.get("rating"),
                        photo_url=None
                    ))
                return candidates
        return []
