import math
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.models.property import Property
from app.services.verinova.fingerprint_service import FingerprintService

def calculate_levenshtein_similarity(s1: str, s2: str) -> float:
    if not s1 and not s2:
        return 1.0
    if not s1 or not s2:
        return 0.0
    
    # Fast equality
    if s1 == s2:
        return 1.0

    len_s1, len_s2 = len(s1), len(s2)
    dp = [[0] * (len_s2 + 1) for _ in range(len_s1 + 1)]

    for i in range(len_s1 + 1):
        dp[i][0] = i
    for j in range(len_s2 + 1):
        dp[0][j] = j

    for i in range(1, len_s1 + 1):
        for j in range(1, len_s2 + 1):
            cost = 0 if s1[i - 1] == s2[j - 1] else 1
            dp[i][j] = min(
                dp[i - 1][j] + 1,      # deletion
                dp[i][j - 1] + 1,      # insertion
                dp[i - 1][j - 1] + cost  # substitution
            )

    dist = dp[len_s1][len_s2]
    max_len = max(len_s1, len_s2)
    return max(0.0, 1.0 - (dist / max_len))

def calculate_token_similarity(s1: str, s2: str) -> float:
    tokens1 = set(s1.split())
    tokens2 = set(s2.split())
    if not tokens1 and not tokens2:
        return 1.0
    if not tokens1 or not tokens2:
        return 0.0
    intersection = tokens1.intersection(tokens2)
    union = tokens1.union(tokens2)
    return len(intersection) / len(union)

def calculate_haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two GPS coordinates in meters."""
    R = 6371000  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

class DuplicateDetectionService:
    @classmethod
    def evaluate_property_duplicates(
        cls,
        db: Session,
        candidate_property_id: Optional[int],
        name: str,
        address: str,
        city: str,
        state: str,
        pincode: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        contact_phone: Optional[str] = None,
        contact_email: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Evaluates potential duplicate or highly similar property submissions across the existing database.
        Uses normalized token matching, Levenshtein distance, GPS proximity, and contact correlation.
        Returns explainable anomaly signals for Admin review.
        """
        norm_name = FingerprintService.normalize_text(name)
        norm_addr = FingerprintService.normalize_text(address)
        norm_city = FingerprintService.normalize_text(city)
        clean_pin = str(pincode).strip() if pincode else ""

        # Fetch active or pending properties excluding current candidate
        query = db.query(Property)
        if candidate_property_id:
            query = query.filter(Property.id != candidate_property_id)
        existing_properties = query.all()

        highest_similarity = 0.0
        most_similar_property: Optional[Property] = None
        match_reasons: List[str] = []

        for prop in existing_properties:
            prop_norm_name = FingerprintService.normalize_text(prop.name)
            prop_norm_addr = FingerprintService.normalize_text(prop.address)
            prop_norm_city = FingerprintService.normalize_text(prop.city)
            prop_pin = ""
            # Extract pincode from address or location details if available
            if prop.location_details and "pincode" in prop.location_details.lower():
                pass
            
            # 1. Name Similarity
            name_lev = calculate_levenshtein_similarity(norm_name, prop_norm_name)
            name_tok = calculate_token_similarity(norm_name, prop_norm_name)
            name_sim = max(name_lev, name_tok)

            # 2. Address & City Similarity
            addr_sim = calculate_token_similarity(norm_addr, prop_norm_addr)
            city_match = 1.0 if (norm_city and prop_norm_city and norm_city == prop_norm_city) else 0.0

            # 3. GPS Proximity
            distance_meters = None
            gps_proximity_score = 0.0
            if (
                latitude is not None and longitude is not None and
                prop.latitude is not None and prop.longitude is not None
            ):
                try:
                    distance_meters = calculate_haversine_distance_meters(
                        float(latitude), float(longitude),
                        float(prop.latitude), float(prop.longitude)
                    )
                    if distance_meters <= 200:
                        gps_proximity_score = 1.0
                    elif distance_meters <= 1000:
                        gps_proximity_score = 0.8
                    elif distance_meters <= 3000:
                        gps_proximity_score = 0.4
                except Exception:
                    distance_meters = None

            # 4. Contact Match
            contact_match = (
                (contact_phone and prop.contact_phone and contact_phone.strip() == prop.contact_phone.strip()) or
                (contact_email and prop.contact_email and contact_email.strip().lower() == prop.contact_email.strip().lower())
            )

            # Weighted Composite Similarity Score
            composite_score = (
                (name_sim * 0.45) +
                (addr_sim * 0.25) +
                (city_match * 0.15) +
                (gps_proximity_score * 0.15)
            )

            # Boost if same exact contact or close proximity
            if contact_match and name_sim > 0.6:
                composite_score = min(1.0, composite_score + 0.15)
            if distance_meters is not None and distance_meters < 300 and name_sim > 0.6:
                composite_score = min(1.0, composite_score + 0.2)

            if composite_score > highest_similarity:
                highest_similarity = composite_score
                most_similar_property = prop
                
                reasons = []
                if name_sim >= 0.75:
                    reasons.append(f"Property title is {int(name_sim * 100)}% similar to '{prop.name}' (ID #{prop.id})")
                if distance_meters is not None and distance_meters <= 1000:
                    reasons.append(f"GPS coordinates are only {int(distance_meters)} meters away from '{prop.name}'")
                if addr_sim >= 0.6:
                    reasons.append(f"Address shares significant locality tokens with '{prop.address}'")
                if contact_match:
                    reasons.append("Shares same host contact phone/email with existing listing")
                match_reasons = reasons

        # Threshold for flagging possible duplicate (0.70 composite or strong name + proximity)
        is_duplicate = highest_similarity >= 0.70 and most_similar_property is not None

        explanation = ""
        if is_duplicate and most_similar_property:
            explanation = (
                f"Possible duplicate or highly similar property detected (Similarity: {int(highest_similarity * 100)}%). "
                f"Closest existing property: '{most_similar_property.name}' (ID #{most_similar_property.id}, {most_similar_property.city}). "
                + " | ".join(match_reasons)
            )
        else:
            explanation = "No strong duplicate or conflicting property listings detected in database."

        return {
            "duplicate_detected": is_duplicate,
            "is_duplicate": is_duplicate,
            "similarity_score": round(highest_similarity, 3),
            "duplicate_property_id": most_similar_property.id if is_duplicate and most_similar_property else None,
            "duplicate_property_name": most_similar_property.name if is_duplicate and most_similar_property else None,
            "duplicate_property_city": most_similar_property.city if is_duplicate and most_similar_property else None,
            "duplicate_property_address": most_similar_property.address if is_duplicate and most_similar_property else None,
            "duplicate_property_status": most_similar_property.verification_status if is_duplicate and most_similar_property else None,
            "explanation": explanation,
            "match_reasons": match_reasons
        }

    @classmethod
    def check_for_duplicate(cls, db: Session, property_obj: Property) -> Dict[str, Any]:
        """Convenience method to check duplicates for a Property ORM instance."""
        return cls.evaluate_property_duplicates(
            db=db,
            candidate_property_id=property_obj.id,
            name=property_obj.name,
            address=property_obj.address,
            city=property_obj.city,
            state=property_obj.state,
            latitude=property_obj.latitude,
            longitude=property_obj.longitude,
            contact_phone=property_obj.contact_phone,
            contact_email=property_obj.contact_email
        )

