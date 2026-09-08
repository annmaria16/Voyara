import smtplib
import logging
from datetime import datetime
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
    def send_password_reset_email(to_email: str, reset_url: str, user_name: str = "Traveler") -> bool:
        """
        Sends an official, branded HTML and plain-text password reset email via SMTP.
        If SMTP credentials are configured in .env, connects via STARTTLS/SSL and delivers the email.
        If SMTP is not configured yet, logs notice safely for development.
        """
        is_configured, _ = EmailService.validate_smtp_config()
        if not is_configured:
            print(f"\n[EmailService Notice] SMTP credentials (SMTP_USER/SMTP_PASSWORD) are not yet configured in backend/.env.")
            print(f"[EmailService Local Reset Link for {to_email}]: {reset_url}\n")
            return True

        port = int(settings.SMTP_PORT) if settings.SMTP_PORT else 587
        from_email = settings.SMTP_USER if (settings.SMTP_USER and "gmail.com" in (settings.SMTP_HOST or "").lower()) else (settings.EMAILS_FROM_EMAIL or settings.SMTP_USER)
        from_name = settings.EMAILS_FROM_NAME or "Voyara"
        from_header = f"{from_name} <{from_email}>"
        current_year = datetime.now().year

        subject = "Reset your Voyara password"

        # Plain text fallback
        text_content = f"""VOYARA
Find Your Place.

Hello {user_name},

We received a request to reset your Voyara password.

Click the link below to create a new password:
{reset_url}

This link will expire after 1 hour.

If you did not request a password reset, you can safely ignore this email.

Stay. Explore. Experience.
Voyara
"""

        # Premium Branded HTML Template
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

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = from_header
            msg["To"] = to_email

            part1 = MIMEText(text_content, "plain")
            part2 = MIMEText(html_content, "html")
            msg.attach(part1)
            msg.attach(part2)

            if port == 465:
                with smtplib.SMTP_SSL(settings.SMTP_HOST, port, timeout=15) as server:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    server.sendmail(from_email, [to_email], msg.as_string())
            else:
                with smtplib.SMTP(settings.SMTP_HOST, port, timeout=15) as server:
                    server.starttls()
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    server.sendmail(from_email, [to_email], msg.as_string())

            print(f"[EmailService] Password reset email sent successfully to {to_email}")
            return True
        except Exception as e:
            print(f"[EmailService Error] Failed to send password reset email to {to_email}: {e}")
            return False
