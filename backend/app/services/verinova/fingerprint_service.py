import re
import hashlib
from typing import Optional

class FingerprintService:
    @staticmethod
    def normalize_text(text: Optional[str]) -> str:
        if not text:
            return ""
        # Lowercase
        normalized = text.lower().strip()
        # Common word standardizations
        replacements = {
            r"\bresort\b": "resort",
            r"\bvilla\b": "villa",
            r"\bhotel\b": "hotel",
            r"\bhomestay\b": "homestay",
            r"\bcottage\b": "cottage",
            r"\broad\b": "rd",
            r"\bstreet\b": "st",
            r"\bnear\b": "nr",
            r"\bopposite\b": "opp",
        }
        for pattern, repl in replacements.items():
            normalized = re.sub(pattern, repl, normalized)
        # Remove non-alphanumeric except spaces
        normalized = re.sub(r"[^a-z0-9\s]", " ", normalized)
        # Collapse multiple spaces
        normalized = re.sub(r"\s+", " ", normalized).strip()
        return normalized

    @classmethod
    def generate_property_fingerprint(
        cls,
        name: str,
        address: str,
        city: str,
        state: str,
        pincode: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None
    ) -> str:
        """
        Generates a deterministic, normalized technical Property Identity Fingerprint (VN-PROP-FP-XXXXXXXX).
        Evaluates canonical property name, address locality, pincode, and geographic zone.
        """
        norm_name = cls.normalize_text(name)
        norm_addr = cls.normalize_text(address)
        norm_city = cls.normalize_text(city)
        norm_state = cls.normalize_text(state)
        norm_pin = str(pincode).strip() if pincode else ""
        
        # Round GPS to ~1.1km grid bucket (2 decimal places) for regional consistency
        gps_bucket = ""
        if latitude is not None and longitude is not None:
            try:
                lat_round = round(float(latitude), 2)
                lng_round = round(float(longitude), 2)
                gps_bucket = f"{lat_round:.2f}:{lng_round:.2f}"
            except (ValueError, TypeError):
                gps_bucket = ""

        canonical_payload = f"{norm_name}|{norm_addr}|{norm_city}|{norm_state}|{norm_pin}|{gps_bucket}"
        hash_digest = hashlib.sha256(canonical_payload.encode("utf-8")).hexdigest()[:12].upper()
        return f"VN-PROP-FP-{hash_digest}"

    @classmethod
    def detect_identity_change(cls, old_fingerprint: Optional[str], new_fingerprint: Optional[str]) -> bool:
        """
        Detects if major technical identity attributes changed between edits.
        """
        if not old_fingerprint or not new_fingerprint:
            return False
        return old_fingerprint.strip().upper() != new_fingerprint.strip().upper()
