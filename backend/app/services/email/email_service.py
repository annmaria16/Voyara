import smtplib
import logging
from datetime import datetime
from typing import Optional
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.config import settings

logger = logging.getLogger(__name__)

class EmailService:
    @staticmethod
    def validate_smtp_config() -> tuple[bool, str]:
        """
        Validates whether all required SMTP parameters are configured in the environment.
        """
        missing = []
        if not settings.SMTP_HOST:
            missing.append("SMTP_HOST")
        if not settings.SMTP_PORT:
            missing.append("SMTP_PORT")
        if not settings.SMTP_USER:
            missing.append("SMTP_USER")
        if not settings.SMTP_PASSWORD:
            missing.append("SMTP_PASSWORD")

        if missing:
            msg = f"SMTP configuration is incomplete. Missing: {', '.join(missing)}. Configure these in backend/.env."
            return False, msg
        return True, ""

    @staticmethod
    def _clean_smtp_password() -> str:
        """Removes spaces from Gmail app passwords and strips whitespace."""
        pwd = settings.SMTP_PASSWORD or ""
        return pwd.replace(" ", "").strip()

    @staticmethod
    def send_email(to_email: str, subject: str, html_content: str, text_content: Optional[str] = None) -> bool:
        """
        Sends an HTML email with optional plain-text fallback via SMTP.
        """
        is_configured, _ = EmailService.validate_smtp_config()
        if not is_configured:
            print(f"\n[EmailService Notice] SMTP not configured. Skipping email dispatch to {to_email}.")
            return True

        port = int(settings.SMTP_PORT) if settings.SMTP_PORT else 587
        smtp_user = settings.SMTP_USER.strip()
        from_email = smtp_user if ("gmail.com" in (settings.SMTP_HOST or "").lower()) else (settings.EMAILS_FROM_EMAIL or smtp_user)
        from_name = settings.EMAILS_FROM_NAME or "Voyara"
        from_header = f"{from_name} <{from_email}>"
        smtp_password = EmailService._clean_smtp_password()

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = from_header
            msg["To"] = to_email.strip()

            if text_content:
                msg.attach(MIMEText(text_content, "plain"))
            else:
                msg.attach(MIMEText("Please view this email in an HTML-compatible client.", "plain"))

            msg.attach(MIMEText(html_content, "html"))

            if port == 465:
                with smtplib.SMTP_SSL(settings.SMTP_HOST, port, timeout=15) as server:
                    server.login(smtp_user, smtp_password)
                    server.sendmail(from_email, [to_email.strip()], msg.as_string())
            else:
                with smtplib.SMTP(settings.SMTP_HOST, port, timeout=15) as server:
                    server.starttls()
                    server.login(smtp_user, smtp_password)
                    server.sendmail(from_email, [to_email.strip()], msg.as_string())

            print(f"[EmailService] Real email dispatched successfully to {to_email} (Subject: '{subject}')")
            return True
        except Exception as e:
            print(f"[EmailService Error] Failed to dispatch email to {to_email}: {e}")
            logger.error(f"Email delivery error to {to_email}: {e}", exc_info=True)
            return False

    @staticmethod
    def send_verification_email(to_email: str, code: str, user_name: str = "Host", expire_minutes: int = 15) -> bool:
        """
        Sends an official, branded HTML verification email with the 6-digit OTP to the user's inbox.
        """
        current_year = datetime.now().year
        subject = f"Voyara - Your Email Verification Code is {code}"

        text_content = f"""VOYARA - Find Your Place.

Hello {user_name},

Thank you for choosing Voyara. Here is your 6-digit email verification code:

  {code}

This code will expire in {expire_minutes} minutes.

If you did not request this verification code, please ignore this email.

Stay. Explore. Experience.
Voyara
"""

        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Voyara Email</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; color: #0F172A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(15, 23, 42, 0.06); border: 1px solid #E2E8F0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; background: linear-gradient(135deg, #091B29 0%, #0F2D44 100%);">
              <h1 style="margin: 0; font-size: 26px; font-weight: 900; color: #ffffff; letter-spacing: 3px; font-family: Georgia, serif;">VOYARA</h1>
              <p style="margin: 6px 0 0; font-size: 11px; color: #38BDF8; text-transform: uppercase; letter-spacing: 2px; font-weight: 700;">Host & Traveler Trust Platform</p>
            </td>
          </tr>
          
          <!-- Content Body -->
          <tr>
            <td style="padding: 36px 32px 28px;">
              <h2 style="margin: 0 0 14px; font-size: 20px; font-weight: 700; color: #0F172A;">Verify Your Email Address</h2>
              
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #475569;">
                Hello <strong>{user_name}</strong>,
              </p>
              
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #64748B;">
                Enter the 6-digit verification code below in your Voyara registration window to activate your account:
              </p>

              <!-- 6-Digit Code Badge -->
              <div style="text-align: center; margin: 28px 0;">
                <div style="display: inline-block; background: #F0FDF4; border: 2px dashed #22C55E; border-radius: 16px; padding: 18px 36px;">
                  <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 10px; color: #15803D; display: inline-block; margin-right: -10px;">
                    {code}
                  </span>
                </div>
              </div>

              <!-- Expiry Alert -->
              <div style="background-color: #FEF3C7; border-radius: 12px; padding: 12px 16px; border: 1px solid #FDE68A; margin: 24px 0 20px;">
                <p style="margin: 0; font-size: 13px; color: #92400E; font-weight: 500;">
                  ⏳ This verification code is single-use and will expire in <strong>{expire_minutes} minutes</strong>.
                </p>
              </div>

              <hr style="border: none; border-top: 1px solid #F1F5F9; margin: 24px 0 16px;" />

              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #94A3B8;">
                If you did not attempt to sign up or verify an account with Voyara, please disregard this email. Your details are safe.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #F8FAFC; text-align: center; border-top: 1px solid #F1F5F9;">
              <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #64748B; letter-spacing: 1px;">
                Stay. Explore. Experience.
              </p>
              <p style="margin: 0; font-size: 11px; color: #94A3B8;">
                © {current_year} Voyara Platform. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""
        return EmailService.send_email(to_email=to_email, subject=subject, html_content=html_content, text_content=text_content)

    @staticmethod
    def send_phone_otp_email_backup(to_email: str, phone: str, otp: str, user_name: str = "Host", expire_minutes: int = 10) -> bool:
        """
        Dispatches phone OTP to the linked user email as dual-channel notification for device convenience.
        """
        current_year = datetime.now().year
        subject = f"Voyara - Your Mobile Verification Code is {otp}"

        text_content = f"""VOYARA - Phone OTP Verification

Hello {user_name},

Your 6-digit phone verification code for {phone} is:

  {otp}

This code expires in {expire_minutes} minutes.
"""

        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Voyara Phone Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: 'Segoe UI', -apple-system, sans-serif; color: #0F172A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(15, 23, 42, 0.06); border: 1px solid #E2E8F0;">
          <tr>
            <td style="padding: 28px 32px 20px; text-align: center; background: #091B29;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #ffffff; letter-spacing: 3px; font-family: Georgia, serif;">VOYARA</h1>
              <p style="margin: 4px 0 0; font-size: 11px; color: #38BDF8; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Phone Number Verification</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 12px; font-size: 18px; color: #0F172A;">Mobile Device OTP Code</h2>
              <p style="margin: 0 0 16px; font-size: 14px; color: #475569;">
                Your mobile phone verification code for <strong>{phone}</strong>:
              </p>
              <div style="text-align: center; margin: 24px 0;">
                <div style="display: inline-block; background: #EFF6FF; border: 2px dashed #3B82F6; border-radius: 14px; padding: 16px 32px;">
                  <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1D4ED8; margin-right: -8px;">
                    {otp}
                  </span>
                </div>
              </div>
              <p style="margin: 0; font-size: 13px; color: #64748B;">
                ⏳ Expires in <strong>{expire_minutes} minutes</strong>. Enter this OTP in the Voyara phone verification step.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px; background-color: #F8FAFC; text-align: center; border-top: 1px solid #F1F5F9;">
              <p style="margin: 0; font-size: 11px; color: #94A3B8;">© {current_year} Voyara. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""
        return EmailService.send_email(to_email=to_email, subject=subject, html_content=html_content, text_content=text_content)

    @staticmethod
    def send_password_reset_email(to_email: str, reset_url: str, user_name: str = "Traveler") -> bool:
        """
        Sends an official, branded HTML and plain-text password reset email via SMTP.
        """
        current_year = datetime.now().year
        subject = "Reset your Voyara password"

        text_content = f"""VOYARA - Find Your Place.

Hello {user_name},

We received a request to reset your Voyara password.

Click the link below to create a new password:
{reset_url}

This link will expire after 1 hour.

If you did not request a password reset, you can safely ignore this email.

Stay. Explore. Experience.
Voyara
"""

        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your Voyara password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FFF8F0; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; color: #102A43;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FFF8F0; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(16, 42, 67, 0.08); border: 1px solid rgba(253, 186, 154, 0.4);">
          
          <!-- Header Banner -->
          <tr>
            <td style="padding: 36px 32px 28px; text-align: center; background: linear-gradient(135deg, #102A43 0%, #0B192C 100%);">
              <h1 style="margin: 0; font-size: 28px; font-weight: 900; color: #ffffff; letter-spacing: 2px; font-family: Georgia, serif;">VOYARA</h1>
              <p style="margin: 6px 0 0; font-size: 12px; color: #FDBA9A; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Find Your Place.</p>
            </td>
          </tr>
          
          <!-- Content Body -->
          <tr>
            <td style="padding: 36px 32px 28px;">
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #102A43; font-family: Georgia, serif;">Password Reset Request</h2>
              
              <p style="margin: 0 0 14px; font-size: 15px; line-height: 1.6; color: #334E68;">
                Hello <strong>{user_name}</strong>,
              </p>
              
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #486581;">
                We received a request to reset your Voyara password. Click the button below to create a new password:
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="{reset_url}" style="background: linear-gradient(135deg, #F97360 0%, #EA580C 100%); color: #ffffff; padding: 15px 36px; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 14px; display: inline-block; box-shadow: 0 6px 18px rgba(249, 115, 96, 0.35); letter-spacing: 0.5px;">
                  Reset Password
                </a>
              </div>

              <!-- Fallback Link -->
              <p style="margin: 24px 0 6px; font-size: 12px; color: #829AB1; line-height: 1.5;">
                If the button above does not work, copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 24px; font-size: 12px; word-break: break-all; color: #F97360;">
                <a href="{reset_url}" style="color: #F97360; text-decoration: underline;">{reset_url}</a>
              </p>

              <!-- Security Notice -->
              <div style="background-color: #FFF8F0; border-radius: 14px; padding: 14px 18px; border: 1px solid rgba(253, 186, 154, 0.6); margin: 24px 0;">
                <p style="margin: 0; font-size: 12px; color: #9C4221; line-height: 1.5;">
                  ⏳ <strong>Important:</strong> This link will expire after <strong>1 hour</strong>.
                </p>
              </div>

              <hr style="border: none; border-top: 1px solid #F0F4F8; margin: 28px 0 20px;" />

              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #9FB3C8;">
                If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #F8FAFC; text-align: center; border-top: 1px solid #EDF2F7;">
              <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #486581; letter-spacing: 1px;">
                Stay. Explore. Experience.
              </p>
              <p style="margin: 0; font-size: 11px; color: #94A3B8;">
                © {current_year} Voyara. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""
        return EmailService.send_email(to_email=to_email, subject=subject, html_content=html_content, text_content=text_content)
