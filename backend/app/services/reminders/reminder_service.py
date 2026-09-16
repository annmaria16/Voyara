from datetime import datetime, date, timedelta, timezone
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.booking import Booking, BookingStatus
from app.models.notification import Notification

try:
    from zoneinfo import ZoneInfo
    KOLKATA_TZ = ZoneInfo("Asia/Kolkata")
except Exception:
    KOLKATA_TZ = timezone(timedelta(hours=5, minutes=30))

class ReminderService:
    @staticmethod
    def get_kolkata_today() -> date:
        """Returns the current date in Asia/Kolkata timezone."""
        return datetime.now(KOLKATA_TZ).date()

    @staticmethod
    def process_checkin_reminders(db: Session) -> Dict[str, Any]:
        """
        Periodically finds confirmed bookings where check-in date is tomorrow (in Asia/Kolkata)
        and sends a one-day-before reminder notification to the customer.
        Idempotent: Sets checkin_reminder_sent = True to prevent duplicates.
        """
        today_kolkata = ReminderService.get_kolkata_today()
        tomorrow = today_kolkata + timedelta(days=1)

        # Query eligible bookings
        eligible_bookings = db.query(Booking).filter(
            Booking.check_in == tomorrow,
            Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.VERIFIED]),
            Booking.checkin_reminder_sent == False
        ).all()

        sent_count = 0
        processed_ids = []

        for booking in eligible_bookings:
            try:
                prop_name = booking.property.name if booking.property else "your sanctuary"
                check_in_time = booking.property.check_in_time if booking.property else "14:00"
                formatted_check_in = booking.check_in.strftime("%d %B %Y")

                notification_title = "Your stay is tomorrow"
                notification_body = (
                    f"Your stay at {prop_name} is tomorrow. "
                    f"Check-in: {formatted_check_in}, {check_in_time}. "
                    f"Please review the message from your host for safety measures, property rules and check-in instructions."
                )

                # Check if an identical unread CHECKIN_REMINDER already exists
                existing = db.query(Notification).filter(
                    Notification.user_id == booking.user_id,
                    Notification.type == "CHECKIN_REMINDER",
                    Notification.booking_id == booking.id
                ).first()

                if not existing:
                    notif = Notification(
                        user_id=booking.user_id,
                        title=notification_title,
                        message=notification_body,
                        type="CHECKIN_REMINDER",
                        link="/customer/bookings",
                        booking_id=booking.id,
                        is_read=False
                    )
                    db.add(notif)

                booking.checkin_reminder_sent = True
                sent_count += 1
                processed_ids.append(booking.id)
            except Exception as e:
                print(f"Error sending check-in reminder for booking {booking.id}:", e)

        db.commit()

        return {
            "status": "success",
            "today_kolkata": str(today_kolkata),
            "target_check_in": str(tomorrow),
            "reminders_sent": sent_count,
            "processed_booking_ids": processed_ids
        }
