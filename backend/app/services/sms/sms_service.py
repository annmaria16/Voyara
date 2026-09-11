import logging
import requests
import re
from typing import Optional
from app.config import settings
from app.services.email.email_service import EmailService

logger = logging.getLogger(__name__)

class SmsService:
    @staticmethod
    def send_phone_otp(
        phone: str,
        otp: str,
        user_email: Optional[str] = None,
        user_name: str = "Host",
        expire_minutes: int = 10
    ) -> bool:
        """
        Dispatches real cellular SMS to the physical SIM card on the device using configured SMS gateways.
        
        SAFE DEVELOPMENT OTP MODE:
        When settings.OTP_PROVIDER == "development":
          - Suppresses all outbound 2Factor and SMS gateway API requests.
          - Consumes ZERO 2Factor SMS credits.
          - Returns immediately after local logging.
          
        REAL 2FACTOR MODE:
        When settings.OTP_PROVIDER == "2factor":
          - Dispatches real carrier SMS via 2Factor.in API.
        """
        # Canonical phone extraction (10-digit clean numbers for Indian cellular networks)
        digits = re.sub(r"[^\d]", "", phone)
        if digits.startswith("91") and len(digits) == 12:
            pure_10_digits = digits[2:]
        elif digits.startswith("0") and len(digits) == 11:
            pure_10_digits = digits[1:]
        else:
            pure_10_digits = digits[-10:] if len(digits) >= 10 else digits

        e164_phone = f"+91{pure_10_digits}"
        message_text = f"Your Voyara verification code is {otp}. Valid for {expire_minutes} minutes. Please do not share this OTP with anyone."

        otp_provider = getattr(settings, "OTP_PROVIDER", "development").strip().lower()

        # =========================================================================
        # 1. SAFE DEVELOPMENT OTP MODE (2Factor Credit Protection)
        # =========================================================================
        if otp_provider == "development":
            print(f"[SmsService DEV MODE] OTP_PROVIDER='development'. Suppressed 2Factor SMS call. No credits consumed. (Target phone: {e164_phone})")
            logger.info(f"Dev OTP mode active. Suppressed 2Factor dispatch for {e164_phone}.")
            return True

        # =========================================================================
        # 2. REAL 2FACTOR MODE (Production / Live Testing - PURE SMS DELIVERY)
        # =========================================================================
        sms_dispatched = False

        twofactor_key = getattr(settings, "TWOFACTOR_API_KEY", None)
        if otp_provider in ["2factor", "production", "live"] and twofactor_key and twofactor_key.strip():
            try:
                api_key = twofactor_key.strip()
                # Use standard 2Factor AUTOGEN endpoint for guaranteed DLT SMS delivery (pure SMS, no voice call)
                url = f"https://2factor.in/API/V1/{api_key}/SMS/+91{pure_10_digits}/AUTOGEN"
                res = requests.get(url, timeout=10)
                if res.status_code == 200 and "success" in res.text.lower():
                    print(f"[SmsService 2Factor] Pure cellular SMS OTP delivered successfully to {e164_phone} (Details: {res.text.strip()})")
                    logger.info(f"2Factor SMS successfully dispatched to {e164_phone}")
                    sms_dispatched = True
                else:
                    # Fallback with template OTP1
                    url_alt = f"https://2factor.in/API/V1/{api_key}/SMS/+91{pure_10_digits}/AUTOGEN/OTP1"
                    res_alt = requests.get(url_alt, timeout=10)
                    if res_alt.status_code == 200 and "success" in res_alt.text.lower():
                        print(f"[SmsService 2Factor] Pure cellular SMS OTP delivered successfully to {e164_phone} (Details: {res_alt.text.strip()})")
                        sms_dispatched = True
                    else:
                        print(f"[SmsService 2Factor Notice] Gateway response: {res.text.strip()}")
                        logger.warning(f"2Factor gateway response for {e164_phone}: {res.text}")
            except Exception as e:
                logger.error(f"2Factor delivery exception for {e164_phone}: {e}", exc_info=True)
                print(f"[SmsService 2Factor Error]: {e}")

        # 3. Fallback / Alternative Gateways (Fast2SMS / Twilio / MSG91)
        if not sms_dispatched and settings.FAST2SMS_API_KEY and settings.FAST2SMS_API_KEY.strip():
            try:
                headers = {
                    "authorization": settings.FAST2SMS_API_KEY.strip(),
                    "Content-Type": "application/json"
                }
                payload = {
                    "route": "otp",
                    "variables_values": otp,
                    "numbers": pure_10_digits
                }
                res = requests.post("https://www.fast2sms.com/dev/bulkV2", json=payload, headers=headers, timeout=10)
                if res.status_code == 200 and res.json().get("return") is True:
                    print(f"[SmsService Fast2SMS] Real SIM SMS delivered successfully to {e164_phone}")
                    sms_dispatched = True
                else:
                    print(f"[SmsService Fast2SMS Notice] Gateway response: {res.text}")
            except Exception as e:
                logger.warning(f"Fast2SMS delivery exception for {e164_phone}: {e}")

        if not sms_dispatched and settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_PHONE_NUMBER:
            try:
                url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json"
                data = {
                    "From": settings.TWILIO_PHONE_NUMBER,
                    "To": e164_phone,
                    "Body": message_text
                }
                res = requests.post(url, data=data, auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN), timeout=10)
                if res.status_code in [200, 201]:
                    print(f"[SmsService Twilio] Real SIM SMS delivered successfully to {e164_phone}")
                    sms_dispatched = True
            except Exception as e:
                logger.warning(f"Twilio delivery exception for {e164_phone}: {e}")

        if not sms_dispatched:
            print(f"\n[SmsService Notice] Cellular SMS Gateway key is not configured or failed.")
            print(f"Target phone: {e164_phone}. Verify TWOFACTOR_API_KEY in backend/.env.\n")

        return True

    @staticmethod
    def verify_2factor_otp(phone: str, otp: str) -> bool:
        """
        Verifies the user's OTP input directly against the 2Factor.in SMS session.
        Uses 2Factor's VERIFY3 endpoint (phone-based verification).
        """
        twofactor_key = getattr(settings, "TWOFACTOR_API_KEY", None)
        if not twofactor_key or not twofactor_key.strip():
            return False

        digits = re.sub(r"[^\d]", "", phone)
        if digits.startswith("91") and len(digits) == 12:
            pure_10_digits = digits[2:]
        elif digits.startswith("0") and len(digits) == 11:
            pure_10_digits = digits[1:]
        else:
            pure_10_digits = digits[-10:] if len(digits) >= 10 else digits

        api_key = twofactor_key.strip()
        url = f"https://2factor.in/API/V1/{api_key}/SMS/VERIFY3/+91{pure_10_digits}/{otp.strip()}"
        try:
            res = requests.get(url, timeout=10)
            if res.status_code == 200:
                data = res.json()
                if data.get("Status") == "Success" and "OTP Matched" in str(data.get("Details", "")):
                    return True
                logger.info(f"2Factor VERIFY3 result for +91{pure_10_digits}: {data}")
            return False
        except Exception as e:
            logger.error(f"2Factor VERIFY3 error for +91{pure_10_digits}: {e}")
            return False
