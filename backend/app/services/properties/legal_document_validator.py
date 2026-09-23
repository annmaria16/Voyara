import re
import io
import datetime
from typing import Dict, Any, List, Optional, Tuple
import pymupdf as fitz
from PIL import Image

try:
    import pytesseract
    HAS_TESSERACT = True
except ImportError:
    HAS_TESSERACT = False


class LegalDocumentValidator:
    """
    Multi-Signal Content, Relationship, & Consistency Validation Engine for Voyara Legal Documents.
    Performs PDF extraction, OCR fallback, structural categorization, relationship-to-document
    compatibility checks, property consistency checks, and validity date extraction.
    """

    RELATIONSHIP_ALLOWED_DOCUMENTS = {
        "PROPERTY_OWNER": [
            "SALE_DEED",
            "PROPERTY_OWNERSHIP_DEED",
            "LAND_RECORD",
            "BUILDING_REGISTRATION",
            "PROPERTY_TAX_RECEIPT",
            "OTHER_LEGAL_PROPERTY_DOCUMENT",
        ],
        "LEASEHOLDER_TENANT": [
            "LEASE_AGREEMENT",
            "RENT_AGREEMENT",
            "OTHER_LEGAL_PROPERTY_DOCUMENT",
        ],
        "AUTHORIZED_PROPERTY_MANAGER": [
            "MANAGEMENT_AUTHORIZATION",
            "AUTHORIZATION_LETTER",
            "OTHER_LEGAL_PROPERTY_DOCUMENT",
        ],
        "BUSINESS_ESTABLISHMENT_OPERATOR": [
            "BUSINESS_REGISTRATION",
            "BUILDING_REGISTRATION",
            "OTHER_LEGAL_PROPERTY_DOCUMENT",
        ],
        "PARTNERSHIP_CO_OWNER": [
            "PARTNERSHIP_DEED",
            "PROPERTY_OWNERSHIP_DEED",
            "AUTHORIZATION_LETTER",
            "OTHER_LEGAL_PROPERTY_DOCUMENT",
        ],
        "AUTHORIZED_REPRESENTATIVE": [
            "AUTHORIZATION_LETTER",
            "MANAGEMENT_AUTHORIZATION",
            "OTHER_LEGAL_PROPERTY_DOCUMENT",
        ],
        "OTHER_LEGAL_AUTHORITY": [
            "OTHER_LEGAL_PROPERTY_DOCUMENT",
            "AUTHORIZATION_LETTER",
            "PROPERTY_OWNERSHIP_DEED",
        ],
    }

    NEGATIVE_DOCUMENT_PATTERNS = {
        "RESUME_CV": [
            r"\bcurriculum\s+vitae\b",
            r"\bresume\b",
            r"\bwork\s+experience\b",
            r"\beducation\s+history\b",
            r"\btechnical\s+skills\b",
            r"\bcareer\s+objective\b",
            r"\bemployment\s+history\b",
            r"\breferences\s+available\b",
            r"\bgithub\.com\b",
            r"\blinkedin\.com/in/\b",
            r"\bsoft\s+skills\b",
            r"\bhobbies\s+and\s+interests\b",
        ],
        "FOOD_MENU": [
            r"\bstarters\b",
            r"\bmain\s+course\b",
            r"\bappetizers\b",
            r"\bdesserts\b",
            r"\bbeverages\b",
            r"\bbiryani\b",
            r"\bchef'?s?\s+special\b",
            r"\btandoori\b",
            r"\bmenu\b",
            r"\bveg\s+thali\b",
            r"\bnon-veg\s+thali\b",
            r"\bcurry\b",
        ],
        "RETAIL_INVOICE": [
            r"\bcash\s+receipt\b",
            r"\bgrocery\b",
            r"\bsupermarket\b",
            r"\bpos\s+terminal\b",
            r"\bitem\s+qty\s+rate\b",
            r"\bsubtotal\s+tax\s+total\b",
            r"\btable\s+no\b",
            r"\bwaiter\b",
            r"\bbill\s+to\s+cash\b",
        ],
        "TRAVEL_TICKET": [
            r"\bboarding\s+pass\b",
            r"\bflight\s+ticket\b",
            r"\be-ticket\b",
            r"\bpnr\s+number\b",
            r"\bairline\b",
            r"\bpassenger\s+name\s+record\b",
            r"\bseat\s+number\b",
            r"\bflight\s+no\b",
        ],
    }

    @staticmethod
    def extract_text_and_ocr(file_bytes: bytes) -> Tuple[str, List[str], bool]:
        """
        Extracts textual content from PDF pages. If text density is low (<40 words per page),
        performs OCR on rendered page pixmaps. Returns (full_text, pages_text, ocr_used).
        """
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        pages_text: List[str] = []
        ocr_used = False

        for page_index in range(len(doc)):
            page = doc[page_index]
            txt = page.get_text("text").strip()
            
            # If page text is sparse and Tesseract is available, perform OCR
            if len(txt.split()) < 20 and HAS_TESSERACT:
                try:
                    pix = page.get_pixmap(dpi=150)
                    img = Image.open(io.BytesIO(pix.tobytes("png")))
                    ocr_text = pytesseract.image_to_string(img)
                    if len(ocr_text.strip()) > len(txt):
                        txt = ocr_text.strip()
                        ocr_used = True
                except Exception:
                    pass

            pages_text.append(txt)

        doc.close()
        full_text = "\n\n".join(pages_text)
        return full_text, pages_text, ocr_used

    @staticmethod
    def normalize_text(text: str) -> str:
        """Lowercases, normalizes whitespace, and removes excessive punctuation."""
        if not text:
            return ""
        cleaned = re.sub(r"[^\w\s\d/.,:-]", " ", text)
        cleaned = re.sub(r"\s+", " ", cleaned)
        return cleaned.lower().strip()

    @staticmethod
    def check_negative_markers(norm_text: str) -> Tuple[bool, Optional[str]]:
        """Detects if the document contains signatures of unrelated documents."""
        for category, patterns in LegalDocumentValidator.NEGATIVE_DOCUMENT_PATTERNS.items():
            matches = [p for p in patterns if re.search(p, norm_text)]
            if len(matches) >= 2:
                cat_name = category.replace("_", " ").title()
                return True, f"Document exhibits strong characteristics of an unrelated {cat_name}."
        return False, None

    # =========================================================================
    # RELATIONSHIP & CATEGORY VALIDATION
    # =========================================================================

    @staticmethod
    def validate_relationship_compatibility(
        legal_relationship: str, document_type: str
    ) -> Tuple[bool, Optional[str]]:
        """Checks if the chosen document type is accepted for the claimed legal relationship."""
        rel = legal_relationship.upper().strip()
        doc_t = document_type.upper().strip()

        allowed = LegalDocumentValidator.RELATIONSHIP_ALLOWED_DOCUMENTS.get(rel)
        if not allowed:
            return False, f"Invalid legal relationship '{legal_relationship}'."

        if doc_t not in allowed:
            rel_label = rel.replace("_", " ").title()
            return False, (
                f"This document does not appear to support the selected {rel_label} relationship. "
                f"Please upload an appropriate document."
            )

        return True, None

    # =========================================================================
    # CATEGORY STRUCTURAL ANALYZERS
    # =========================================================================

    @staticmethod
    def validate_partnership_deed(norm_text: str) -> Dict[str, Any]:
        signals = {}
        score = 0.0

        # Title / Preamble
        has_title = any(
            re.search(p, norm_text)
            for p in [
                r"\bdeed\s+of\s+partnership\b",
                r"\bpartnership\s+deed\b",
                r"\bindian\s+partnership\s+act\b",
                r"\barticles\s+of\s+partnership\b",
            ]
        )
        signals["title_matched"] = has_title
        if has_title:
            score += 0.25

        # Partners Structure
        has_partners = any(
            re.search(p, norm_text)
            for p in [
                r"\bfirst\s+partner\b",
                r"\bsecond\s+partner\b",
                r"\bparty\s+of\s+the\s+first\s+part\b",
                r"\bpartner\b.*\bbetween\b",
                r"\bbetween[:\s]+(?:1\.|1\s+|\(1\))",
            ]
        )
        signals["partners_structure"] = has_partners
        if has_partners:
            score += 0.25

        # Parentage / Address Details
        has_parentage = any(
            re.search(p, norm_text)
            for p in [r"\bson\s+of\b", r"\bdaughter\s+of\b", r"\bs/o\b", r"\bd/o\b", r"\bresiding\s+at\b"]
        )
        signals["party_particulars"] = has_parentage
        if has_parentage:
            score += 0.15

        # Substantive Covenants
        has_clauses = any(
            re.search(p, norm_text)
            for p in [
                r"\bcapital\b",
                r"\bprofit\s+and\s+loss\b",
                r"\bbank\s+account\b",
                r"\bplace\s+of\s+business\b",
                r"\bbooks\s+of\s+account\b",
                r"\bdissolution\b",
            ]
        )
        signals["partnership_clauses"] = has_clauses
        if has_clauses:
            score += 0.20

        # Execution / Signatures
        has_execution = any(
            re.search(p, norm_text)
            for p in [r"\bin\s+witness\s+whereof\b", r"\bsigned\b", r"\bwitness\b", r"\bpartner\s+signature\b"]
        )
        signals["execution_evidence"] = has_execution
        if has_execution:
            score += 0.15

        is_valid = score >= 0.55 or (has_title and has_partners)
        return {"is_valid": is_valid, "score": min(score, 1.0), "signals": signals}

    @staticmethod
    def validate_sale_deed(norm_text: str) -> Dict[str, Any]:
        signals = {}
        score = 0.0

        # Title
        has_title = any(
            re.search(p, norm_text)
            for p in [
                r"\bdeed\s+of\s+(?:absolute\s+)?sale\b",
                r"\bsale\s+deed\b",
                r"\bconveyance\s+deed\b",
                r"\btitle\s+deed\b",
                r"\bownership\s+deed\b",
            ]
        )
        signals["title_matched"] = has_title
        if has_title:
            score += 0.25

        # Parties (Vendor / Purchaser)
        has_parties = any(
            re.search(p, norm_text)
            for p in [
                r"\bvendor\b",
                r"\bpurchaser\b",
                r"\btransferor\b",
                r"\btransferee\b",
                r"\bseller\b",
                r"\bbuyer\b",
            ]
        )
        signals["parties_matched"] = has_parties
        if has_parties:
            score += 0.25

        # Schedule of Property / Boundaries
        has_property = any(
            re.search(p, norm_text)
            for p in [
                r"\bschedule\s+of\s+property\b",
                r"\bsurvey\s+no\b",
                r"\bbounded\s+on\b",
                r"\bpiece\s+and\s+parcel\b",
                r"\bmeasuring\b",
            ]
        )
        signals["property_schedule"] = has_property
        if has_property:
            score += 0.20

        # Consideration & Conveyance Covenants
        has_covenants = any(
            re.search(p, norm_text)
            for p in [
                r"\bconsideration\b",
                r"\babsolute\s+owner\b",
                r"\bfree\s+from\s+all\s+encumbrances\b",
                r"\bhereby\s+conveys\b",
                r"\binr\b|\brupees\b|\blakhs\b",
            ]
        )
        signals["conveyance_covenants"] = has_covenants
        if has_covenants:
            score += 0.15

        # Execution / Signatures
        has_execution = any(
            re.search(p, norm_text)
            for p in [r"\bin\s+witness\s+whereof\b", r"\bsigned\b", r"\bwitness\b", r"\bvendor\s+signature\b"]
        )
        signals["execution_evidence"] = has_execution
        if has_execution:
            score += 0.15

        is_valid = score >= 0.55 or (has_title and (has_parties or has_property))
        return {"is_valid": is_valid, "score": min(score, 1.0), "signals": signals}

    @staticmethod
    def validate_lease_agreement(norm_text: str) -> Dict[str, Any]:
        signals = {}
        score = 0.0

        has_title = any(
            re.search(p, norm_text)
            for p in [
                r"\blease\s+agreement\b",
                r"\brent\s+agreement\b",
                r"\bdeed\s+of\s+lease\b",
                r"\btenancy\s+agreement\b",
                r"\blease\s+deed\b",
            ]
        )
        signals["title_matched"] = has_title
        if has_title:
            score += 0.25

        has_parties = any(
            re.search(p, norm_text)
            for p in [r"\blessor\b", r"\blessee\b", r"\blandlord\b", r"\btenant\b"]
        )
        signals["parties_matched"] = has_parties
        if has_parties:
            score += 0.25

        has_terms = any(
            re.search(p, norm_text)
            for p in [
                r"\bmonthly\s+rent\b",
                r"\bsecurity\s+deposit\b",
                r"\bperiod\s+of\s+(?:lease|tenancy)\b",
                r"\bterm\s+of\b",
                r"\bper\s+month\b",
            ]
        )
        signals["rent_and_terms"] = has_terms
        if has_terms:
            score += 0.25

        has_execution = any(
            re.search(p, norm_text)
            for p in [r"\bin\s+witness\s+whereof\b", r"\bsigned\b", r"\bwitness\b", r"\blessor\s+signature\b"]
        )
        signals["execution_evidence"] = has_execution
        if has_execution:
            score += 0.25

        is_valid = score >= 0.50 or (has_title and (has_parties or has_terms))
        return {"is_valid": is_valid, "score": min(score, 1.0), "signals": signals}

    @staticmethod
    def validate_property_tax_receipt(norm_text: str) -> Dict[str, Any]:
        signals = {}
        score = 0.0

        has_tax_title = any(
            re.search(p, norm_text)
            for p in [
                r"\bproperty\s+tax\b",
                r"\btax\s+receipt\b",
                r"\bassessment\b",
                r"\bmunicipal\s+corporation\b",
                r"\bmunicipality\b",
                r"\bgram\s+panchayat\b",
            ]
        )
        signals["tax_title_matched"] = has_tax_title
        if has_tax_title:
            score += 0.30

        has_tax_period = any(
            re.search(p, norm_text)
            for p in [r"\bassessment\s+year\b", r"\bfinancial\s+year\b", r"\bperiod\b", r"\b202[0-9]\b"]
        )
        signals["tax_period_matched"] = has_tax_period
        if has_tax_period:
            score += 0.25

        has_identifiers = any(
            re.search(p, norm_text)
            for p in [
                r"\breceipt\s+no\b",
                r"\bchallan\s+no\b",
                r"\bward\b",
                r"\bdoor\s+no\b",
                r"\bproperty\s+id\b",
                r"\bkhata\b",
                r"\bkhasra\b",
            ]
        )
        signals["identifiers_matched"] = has_identifiers
        if has_identifiers:
            score += 0.25

        has_amount = any(
            re.search(p, norm_text)
            for p in [r"\btotal\s+amount\b", r"\bamount\s+paid\b", r"\btax\s+amount\b", r"\brs\b|\binr\b"]
        )
        signals["amount_matched"] = has_amount
        if has_amount:
            score += 0.20

        is_valid = score >= 0.50 or (has_tax_title and (has_identifiers or has_tax_period))
        return {"is_valid": is_valid, "score": min(score, 1.0), "signals": signals}

    @staticmethod
    def validate_management_authorization(norm_text: str) -> Dict[str, Any]:
        signals = {}
        score = 0.0

        has_title = any(
            re.search(p, norm_text)
            for p in [
                r"\bproperty\s+management\b",
                r"\bmanagement\s+authorization\b",
                r"\bauthorization\s+letter\b",
                r"\bpower\s+of\s+attorney\b",
                r"\bmanagement\s+contract\b",
            ]
        )
        signals["title_matched"] = has_title
        if has_title:
            score += 0.30

        has_authority_clause = any(
            re.search(p, norm_text)
            for p in [
                r"\bhereby\s+authorize[s]?\b",
                r"\bappoint[s]?\s+as\s+manager\b",
                r"\boperate\s+and\s+manage\b",
                r"\blist\s+and\s+operate\b",
                r"\bon\s+behalf\s+of\b",
                r"\bgrant[s]?\s+authority\b",
            ]
        )
        signals["authority_clause_matched"] = has_authority_clause
        if has_authority_clause:
            score += 0.35

        has_parties = any(
            re.search(p, norm_text)
            for p in [r"\bowner\b", r"\bmanager\b", r"\bgrantor\b", r"\bgrantee\b", r"\bauthorized\s+person\b"]
        )
        signals["parties_matched"] = has_parties
        if has_parties:
            score += 0.20

        has_execution = any(
            re.search(p, norm_text)
            for p in [r"\bsigned\b", r"\bsignature\b", r"\bdate\b", r"\bin\s+witness\b"]
        )
        signals["execution_evidence"] = has_execution
        if has_execution:
            score += 0.15

        is_valid = score >= 0.50 or (has_title and has_authority_clause)
        return {"is_valid": is_valid, "score": min(score, 1.0), "signals": signals}

    @staticmethod
    def validate_authorization_letter(norm_text: str) -> Dict[str, Any]:
        signals = {}
        score = 0.0

        has_title = any(
            re.search(p, norm_text)
            for p in [
                r"\bauthorization\s+letter\b",
                r"\bletter\s+of\s+authorization\b",
                r"\bto\s+whom\s+it\s+may\s+concern\b",
                r"\bpower\s+of\s+attorney\b",
            ]
        )
        signals["title_matched"] = has_title
        if has_title:
            score += 0.30

        has_clause = any(
            re.search(p, norm_text)
            for p in [
                r"\bhereby\s+authorize\b",
                r"\bgrant\s+permission\b",
                r"\bact\s+on\s+my\s+behalf\b",
                r"\blist\s+and\s+represent\b",
                r"\brepresentative\b",
            ]
        )
        signals["clause_matched"] = has_clause
        if has_clause:
            score += 0.40

        has_execution = any(
            re.search(p, norm_text)
            for p in [r"\bsincerely\b", r"\bsigned\b", r"\bsignature\b", r"\bdate\b"]
        )
        signals["execution_evidence"] = has_execution
        if has_execution:
            score += 0.30

        is_valid = score >= 0.50 or (has_title and has_clause)
        return {"is_valid": is_valid, "score": min(score, 1.0), "signals": signals}

    @staticmethod
    def validate_business_registration(norm_text: str) -> Dict[str, Any]:
        signals = {}
        score = 0.0

        has_title = any(
            re.search(p, norm_text)
            for p in [
                r"\bregistration\s+certificate\b",
                r"\bgst\b|\bgstin\b",
                r"\btrade\s+license\b",
                r"\bestablishment\b",
                r"\bmsme\b|\budyam\b",
                r"\bfssai\b",
                r"\bincorporation\b",
            ]
        )
        signals["registration_title_matched"] = has_title
        if has_title:
            score += 0.35

        has_identifiers = any(
            re.search(p, norm_text)
            for p in [r"\bregistration\s+no\b", r"\bgstin\b", r"\blicense\s+no\b", r"\bcin\b", r"\bpan\b"]
        )
        signals["identifiers_matched"] = has_identifiers
        if has_identifiers:
            score += 0.35

        has_authority = any(
            re.search(p, norm_text)
            for p in [r"\bgovernment\s+of\b", r"\bdepartment\b", r"\bregistrar\b", r"\bauthority\b"]
        )
        signals["authority_matched"] = has_authority
        if has_authority:
            score += 0.30

        is_valid = score >= 0.50 or (has_title and has_identifiers)
        return {"is_valid": is_valid, "score": min(score, 1.0), "signals": signals}

    @staticmethod
    def validate_land_record(norm_text: str) -> Dict[str, Any]:
        signals = {}
        score = 0.0

        has_title = any(
            re.search(p, norm_text)
            for p in [
                r"\brecord\s+of\s+rights\b",
                r"\bpatta\b",
                r"\bkhata\b",
                r"\bkhasra\b",
                r"\bjamabandi\b",
                r"\b7/12\b",
                r"\brevenue\s+department\b",
            ]
        )
        signals["title_matched"] = has_title
        if has_title:
            score += 0.35

        has_identifiers = any(
            re.search(p, norm_text)
            for p in [r"\bsurvey\s+no\b", r"\bplot\s+no\b", r"\bkhasra\s+no\b", r"\bpatta\s+no\b", r"\bvillage\b"]
        )
        signals["identifiers_matched"] = has_identifiers
        if has_identifiers:
            score += 0.35

        has_measurements = any(
            re.search(p, norm_text)
            for p in [r"\bextent\b", r"\barea\b", r"\bhectare\b", r"\bacres\b", r"\bcents\b", r"\bsq\.?\s*ft\b"]
        )
        signals["measurements_matched"] = has_measurements
        if has_measurements:
            score += 0.30

        is_valid = score >= 0.50 or (has_title and has_identifiers)
        return {"is_valid": is_valid, "score": min(score, 1.0), "signals": signals}

    # =========================================================================
    # EXTRACT STRUCTURED INFORMATION & DATES
    # =========================================================================

    @staticmethod
    def extract_dates(text: str, norm_text: str) -> Dict[str, Optional[datetime.datetime]]:
        """
        Extracts issue date, effective date, and expiry date from text.
        """
        dates = {"issue_date": None, "effective_date": None, "expiry_date": None}
        
        # Regex date patterns
        date_patterns = [
            r"(\d{1,2})[/-](\d{1,2})[/-](\d{4})",  # DD/MM/YYYY
            r"(\d{1,2})(?:st|nd|rd|th)?\s+(?:day\s+of\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)\s*,?\s*(\d{4})",
            r"(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})",
        ]

        found_dates = []
        month_map = {
            "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
            "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12
        }

        for p in date_patterns:
            for match in re.finditer(p, text, re.IGNORECASE):
                try:
                    groups = match.groups()
                    if len(groups) == 3:
                        if groups[0].isdigit() and groups[1].isdigit() and groups[2].isdigit():
                            d, m, y = int(groups[0]), int(groups[1]), int(groups[2])
                        elif groups[1].lower() in month_map:
                            d = int(groups[0])
                            m = month_map[groups[1].lower()]
                            y = int(groups[2])
                        elif groups[0].lower() in month_map:
                            m = month_map[groups[0].lower()]
                            d = int(groups[1])
                            y = int(groups[2])
                        else:
                            continue
                        dt = datetime.datetime(y, m, d)
                        found_dates.append((match.start(), dt))
                except Exception:
                    continue

        # Look for expiry/end keywords in vicinity
        expiry_triggers = [r"valid\s+(?:up\s+to|until|till)", r"expiry\s+date", r"expires\s+on", r"term\s+ends\s+on"]
        for trigger in expiry_triggers:
            match = re.search(trigger, norm_text)
            if match:
                pos = match.start()
                # Find closest date after trigger
                after_dates = [d for p, d in found_dates if p >= pos]
                if after_dates:
                    dates["expiry_date"] = after_dates[0]
                    break

        # If found dates exist, set issue/effective date as earliest date
        if found_dates:
            sorted_dates = sorted([d for _, d in found_dates])
            dates["issue_date"] = sorted_dates[0]
            dates["effective_date"] = sorted_dates[0]

        return dates

    @staticmethod
    def extract_structured_data(
        text: str, norm_text: str, document_type: str, property_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        dates = LegalDocumentValidator.extract_dates(text, norm_text)

        # Detect parties
        parties = []
        partner_matches = re.findall(r"(?:mr\.|mrs\.|ms\.|shri|smt\.)\s+([a-zA-Z\s]{3,30})", text, re.IGNORECASE)
        for pm in partner_matches:
            cleaned_p = pm.strip()
            if len(cleaned_p) > 3 and cleaned_p not in parties:
                parties.append(cleaned_p)

        # Detect registration / reference numbers
        reg_match = re.search(r"(?:registration|doc|challan|receipt|survey)\s*(?:no|number)?[:.\s]+([a-zA-Z0-9/_-]{3,25})", text, re.IGNORECASE)
        reg_no = reg_match.group(1) if reg_match else None

        validity_type = "PERMANENT_OR_NO_EXPIRY_IDENTIFIED" if not dates.get("expiry_date") else "EXPIRING"

        return {
            "document_type": document_type,
            "document_title": document_type.replace("_", " ").title(),
            "parties": parties[:5],
            "property_name": property_context.get("name") if property_context else None,
            "city": property_context.get("city") if property_context else None,
            "state": property_context.get("state") if property_context else None,
            "pincode": property_context.get("pincode") if property_context else None,
            "execution_date": dates["issue_date"].strftime("%Y-%m-%d") if dates.get("issue_date") else None,
            "effective_date": dates["effective_date"].strftime("%Y-%m-%d") if dates.get("effective_date") else None,
            "expiry_date": dates["expiry_date"].strftime("%Y-%m-%d") if dates.get("expiry_date") else None,
            "validity_type": validity_type,
            "registration_number": reg_no,
            "reference_number": reg_no,
            "stamp_information": "Stamp paper / reference detected" if "stamp" in norm_text or "judicial" in norm_text else None,
            "signatures_detected": bool(re.search(r"\bsign(?:ed|ature)?\b|\bwitness\b", norm_text)),
        }

    # =========================================================================
    # PROPERTY & IDENTITY CONSISTENCY CHECKS
    # =========================================================================

    @staticmethod
    def check_property_consistency(
        norm_text: str, property_context: Optional[Dict[str, Any]]
    ) -> Tuple[bool, Dict[str, Any], List[str]]:
        """
        Compares normalized document text against Add Property location data (City, State, Pincode, Name).
        """
        if not property_context:
            return True, {"checked": False}, []

        city = (property_context.get("city") or "").lower().strip()
        state = (property_context.get("state") or "").lower().strip()
        pincode = (property_context.get("pincode") or "").strip()
        name = (property_context.get("name") or "").lower().strip()

        matched_signals = []
        city_matched = False
        state_matched = False
        pincode_matched = False
        name_matched = False

        if city and len(city) >= 3 and city in norm_text:
            city_matched = True
            matched_signals.append(f"City: {property_context.get('city')}")

        if state and len(state) >= 3 and state in norm_text:
            state_matched = True
            matched_signals.append(f"State: {property_context.get('state')}")

        if pincode and len(pincode) == 6 and pincode in norm_text:
            pincode_matched = True
            matched_signals.append(f"Pincode: {pincode}")

        if name and len(name) >= 4:
            # Check major tokens of property name
            tokens = [t for t in re.split(r"\s+", name) if len(t) >= 4 and t not in ["villa", "resort", "hotel", "stay", "homestay", "house", "retreat"]]
            if tokens and all(t in norm_text for t in tokens):
                name_matched = True
                matched_signals.append(f"Property Name Reference: {property_context.get('name')}")

        # Check for explicit conflict (e.g. city present is completely different and target city absent)
        known_major_cities = ["mumbai", "delhi", "bangalore", "bengaluru", "kochi", "cochin", "chennai", "kolkata", "hyderabad", "munnar", "goa", "jaipur", "shimla", "manali", "ooty"]
        conflicting_city = None
        if city and not city_matched:
            for kc in known_major_cities:
                if kc != city and kc in norm_text:
                    conflicting_city = kc.title()
                    break

        if conflicting_city and not state_matched and not pincode_matched and not name_matched:
            return False, {
                "city_matched": False,
                "state_matched": False,
                "pincode_matched": False,
                "conflicting_city": conflicting_city,
            }, matched_signals

        is_consistent = city_matched or state_matched or pincode_matched or name_matched or (not conflicting_city)
        return is_consistent, {
            "city_matched": city_matched,
            "state_matched": state_matched,
            "pincode_matched": pincode_matched,
            "name_matched": name_matched,
        }, matched_signals

    # =========================================================================
    # MAIN COMPREHENSIVE VALIDATION ENTRY POINT
    # =========================================================================

    @classmethod
    def validate_document(
        cls,
        file_bytes: bytes,
        legal_relationship: str,
        document_type: str,
        property_context: Optional[Dict[str, Any]] = None,
        stay_partner_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Full-spectrum validation pipeline for an uploaded PDF legal document.
        """
        # 1. Technical validation
        if not file_bytes:
            return {
                "is_valid": False,
                "technical_status": "INVALID",
                "document_type_status": "MISMATCHED",
                "content_status": "FAILED",
                "property_consistency": "FAILED",
                "relationship_consistency": "FAILED",
                "authenticity_status": "NOT_EXTERNALLY_VERIFIED",
                "overall_status": "REJECTED",
                "validation_score": 0.0,
                "score": 0,
                "score_breakdown": {"doc_type_score": 0, "property_match_score": 0, "relationship_score": 0, "authenticity_score": 0},
                "message": "Uploaded PDF file is empty.",
            }

        if not file_bytes.startswith(b"%PDF-"):
            return {
                "is_valid": False,
                "technical_status": "INVALID",
                "document_type_status": "MISMATCHED",
                "content_status": "FAILED",
                "property_consistency": "FAILED",
                "relationship_consistency": "FAILED",
                "authenticity_status": "NOT_EXTERNALLY_VERIFIED",
                "overall_status": "REJECTED",
                "validation_score": 0.0,
                "score": 0,
                "score_breakdown": {"doc_type_score": 0, "property_match_score": 0, "relationship_score": 0, "authenticity_score": 0},
                "message": "Invalid file signature: uploaded file is not a valid PDF document.",
            }

        # 2. Extract text & OCR
        try:
            full_text, pages_text, ocr_used = cls.extract_text_and_ocr(file_bytes)
        except Exception as e:
            return {
                "is_valid": False,
                "technical_status": "CORRUPTED",
                "document_type_status": "MISMATCHED",
                "content_status": "FAILED",
                "property_consistency": "FAILED",
                "relationship_consistency": "FAILED",
                "authenticity_status": "NOT_EXTERNALLY_VERIFIED",
                "overall_status": "REJECTED",
                "validation_score": 0.0,
                "score": 0,
                "score_breakdown": {"doc_type_score": 0, "property_match_score": 0, "relationship_score": 0, "authenticity_score": 0},
                "message": f"Uploaded PDF file is corrupted or unreadable: {str(e)}",
            }

        norm_text = cls.normalize_text(full_text)

        # 3. Negative pattern detection (Resume, Menu, Invoice, Ticket)
        has_neg, neg_reason = cls.check_negative_markers(norm_text)
        if has_neg:
            return {
                "is_valid": False,
                "technical_status": "VALID",
                "document_type_status": "MISMATCHED",
                "content_status": "FAILED",
                "property_consistency": "FAILED",
                "relationship_consistency": "FAILED",
                "authenticity_status": "NOT_EXTERNALLY_VERIFIED",
                "overall_status": "REJECTED",
                "validation_score": 0.0,
                "score": 0,
                "score_breakdown": {"doc_type_score": 0, "property_match_score": 0, "relationship_score": 0, "authenticity_score": 0},
                "message": f"Document content rejected: {neg_reason} Please upload a genuine legal property document.",
            }

        # 4. Relationship compatibility check
        rel_ok, rel_error = cls.validate_relationship_compatibility(legal_relationship, document_type)
        if not rel_ok:
            return {
                "is_valid": False,
                "technical_status": "VALID",
                "document_type_status": "MISMATCHED",
                "content_status": "FAILED",
                "property_consistency": "NOT_CHECKED",
                "relationship_consistency": "FAILED",
                "authenticity_status": "NOT_EXTERNALLY_VERIFIED",
                "overall_status": "REJECTED",
                "validation_score": 0.0,
                "score": 0,
                "score_breakdown": {"doc_type_score": 0, "property_match_score": 0, "relationship_score": 0, "authenticity_score": 0},
                "message": rel_error,
            }

        # 5. Category structural validation
        doc_type_upper = document_type.upper().strip()
        analysis: Dict[str, Any] = {"is_valid": True, "score": 1.0, "signals": {}}

        if doc_type_upper == "PARTNERSHIP_DEED":
            analysis = cls.validate_partnership_deed(norm_text)
        elif doc_type_upper in ["SALE_DEED", "PROPERTY_OWNERSHIP_DEED"]:
            analysis = cls.validate_sale_deed(norm_text)
        elif doc_type_upper in ["LEASE_AGREEMENT", "RENT_AGREEMENT"]:
            analysis = cls.validate_lease_agreement(norm_text)
        elif doc_type_upper == "PROPERTY_TAX_RECEIPT":
            analysis = cls.validate_property_tax_receipt(norm_text)
        elif doc_type_upper == "MANAGEMENT_AUTHORIZATION":
            analysis = cls.validate_management_authorization(norm_text)
        elif doc_type_upper == "AUTHORIZATION_LETTER":
            analysis = cls.validate_authorization_letter(norm_text)
        elif doc_type_upper in ["BUSINESS_REGISTRATION", "BUILDING_REGISTRATION"]:
            analysis = cls.validate_business_registration(norm_text)
        elif doc_type_upper == "LAND_RECORD":
            analysis = cls.validate_land_record(norm_text)
        else:
            # Generic fallback legal document check
            has_legal = any(w in norm_text for w in ["deed", "agreement", "certificate", "property", "parties", "witness", "signed", "owner"])
            analysis = {"is_valid": has_legal, "score": 0.7 if has_legal else 0.2, "signals": {"generic_legal_keywords": has_legal}}

        if not analysis.get("is_valid", False):
            doc_label = doc_type_upper.replace("_", " ").title()
            return {
                "is_valid": False,
                "technical_status": "VALID",
                "document_type_status": "MISMATCHED",
                "content_status": "FAILED",
                "property_consistency": "NOT_CHECKED",
                "relationship_consistency": "FAILED",
                "authenticity_status": "NOT_EXTERNALLY_VERIFIED",
                "overall_status": "REJECTED",
                "validation_score": analysis.get("score", 0.0),
                "score": int(analysis.get("score", 0.0) * 100),
                "score_breakdown": {"doc_type_score": int(analysis.get("score", 0.0) * 100), "property_match_score": 0, "relationship_score": 0, "authenticity_score": 0},
                "signals": analysis.get("signals", {}),
                "message": f"The uploaded document does not appear to be a valid {doc_label}. Required legal structural evidence was not detected.",
            }

        # 6. Property consistency check
        prop_consistent, consistency_details, matched_signals = cls.check_property_consistency(norm_text, property_context)
        if not prop_consistent:
            return {
                "is_valid": False,
                "technical_status": "VALID",
                "document_type_status": "MATCHED",
                "content_status": "PASSED",
                "property_consistency": "FAILED",
                "relationship_consistency": "FAILED",
                "authenticity_status": "NOT_EXTERNALLY_VERIFIED",
                "overall_status": "REJECTED",
                "validation_score": analysis.get("score", 0.0),
                "score": int(analysis.get("score", 0.0) * 100),
                "score_breakdown": {"doc_type_score": 100, "property_match_score": 0, "relationship_score": 50, "authenticity_score": 100},
                "signals": analysis.get("signals", {}),
                "message": "The property information in the uploaded document does not match the property details entered in Voyara.",
            }

        # 7. Extract structured data & validity dates
        extracted_data = cls.extract_structured_data(full_text, norm_text, document_type, property_context)
        val_score = analysis.get("score", 1.0)

        return {
            "is_valid": True,
            "technical_status": "VALID",
            "document_type_status": "MATCHED",
            "content_status": "PASSED",
            "property_consistency": "PASSED",
            "relationship_consistency": "PASSED",
            "authenticity_status": "NOT_EXTERNALLY_VERIFIED",
            "overall_status": "READY_FOR_ADMIN_REVIEW",
            "validation_score": val_score,
            "score": int(val_score * 100),
            "score_breakdown": {
                "doc_type_score": 100,
                "property_match_score": 100 if prop_consistent else 0,
                "relationship_score": 100,
                "authenticity_score": 100,
            },
            "signals": analysis.get("signals", {}),
            "extracted_data": extracted_data,
            "matched_criteria": matched_signals,
            "message": "Document content validation passed. Submitted for administrative verification.",
        }
