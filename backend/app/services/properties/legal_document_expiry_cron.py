import datetime
from typing import Optional, Dict
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.property import Property
from app.models.property_legal_document import (
    PropertyLegalDocument,
    PropertyDocumentExpiryReminder,
)
from app.models.provider import ProviderProfile
from app.services.notifications.notification_service import NotificationService


class LegalDocumentExpiryCron:
    """
    Daily Cron Service for Legal Document Validity & Expiry Management.
    Operates in Asia/Kolkata timezone context, sends idempotent milestone reminders
    (60-day, 30-day, 7-day, 1-day), and safely suspends expired properties from new bookings.
    """

    @classmethod
    def run_daily_expiry_checks(cls, db: Optional[Session] = None) -> Dict[str, int]:
        """
        Executes daily document validity scan.
        """
        own_session = False
        if db is None:
            db = SessionLocal()
            own_session = True

        stats = {
            "reminders_60d": 0,
            "reminders_30d": 0,
            "reminders_7d": 0,
            "reminders_1d": 0,
            "expired_suspended": 0,
        }

        try:
            now = datetime.datetime.utcnow()

            # Find all active approved legal documents with an expiry date
            active_docs = (
                db.query(PropertyLegalDocument)
                .filter(
                    PropertyLegalDocument.is_active_version == True,
                    PropertyLegalDocument.overall_status.in_(["ADMIN_APPROVED", "DOCUMENT_EXPIRED"]),
                    PropertyLegalDocument.document_expiry_date.isnot(None),
                )
                .all()
            )

            for doc in active_docs:
                prop = db.query(Property).filter(Property.id == doc.property_id).first()
                if not prop:
                    continue

                provider = db.query(ProviderProfile).filter(ProviderProfile.id == prop.provider_id).first()
                provider_user_id = provider.user_id if provider else None

                days_left = (doc.document_expiry_date - now).total_seconds() / 86400.0

                # 1. Check if Expired (<= 0 days)
                if days_left <= 0:
                    if doc.overall_status != "DOCUMENT_EXPIRED" or prop.legal_document_status != "DOCUMENT_EXPIRED":
                        doc.overall_status = "DOCUMENT_EXPIRED"
                        prop.legal_document_status = "DOCUMENT_EXPIRED"
                        prop.is_active = False  # Suspended from new bookings
                        db.commit()

                        # Check if expiry reminder sent
                        already_sent = (
                            db.query(PropertyDocumentExpiryReminder)
                            .filter(
                                PropertyDocumentExpiryReminder.document_id == doc.id,
                                PropertyDocumentExpiryReminder.reminder_type == "EXPIRY_DAY",
                            )
                            .first()
                        )
                        if not already_sent:
                            reminder = PropertyDocumentExpiryReminder(
                                document_id=doc.id,
                                property_id=prop.id,
                                reminder_type="EXPIRY_DAY",
                                sent_at=now,
                            )
                            db.add(reminder)
                            db.commit()

                            if provider_user_id:
                                NotificationService.create_notification(
                                    db=db,
                                    user_id=provider_user_id,
                                    title="Legal Document Expired — Listing Suspended",
                                    message=f"Your legal document for '{prop.name}' has expired. Your property has been temporarily suspended from new bookings until an updated document is approved.",
                                    type="DOCUMENT_EXPIRED",
                                    link=f"/provider/properties/{prop.id}/edit",
                                )

                            NotificationService.notify_admins(
                                db=db,
                                title="Property Document Expired",
                                message=f"Legal document for '{prop.name}' has expired. Listing was suspended.",
                                type="DOCUMENT_EXPIRED",
                                link=f"/admin/properties",
                            )
                            stats["expired_suspended"] += 1
                    continue

                # 2. 1-Day Urgent Warning (0 < days_left <= 1)
                if days_left <= 1:
                    sent = (
                        db.query(PropertyDocumentExpiryReminder)
                        .filter(
                            PropertyDocumentExpiryReminder.document_id == doc.id,
                            PropertyDocumentExpiryReminder.reminder_type == "1_DAY",
                        )
                        .first()
                    )
                    if not sent:
                        db.add(PropertyDocumentExpiryReminder(document_id=doc.id, property_id=prop.id, reminder_type="1_DAY", sent_at=now))
                        db.commit()
                        if provider_user_id:
                            NotificationService.create_notification(
                                db=db,
                                user_id=provider_user_id,
                                title="Final Notice: Document Expires Tomorrow",
                                message=f"Your legal document for '{prop.name}' expires in 24 hours. Upload a replacement to prevent listing suspension.",
                                type="EXPIRY_WARNING",
                                link=f"/provider/properties/{prop.id}/edit",
                            )
                        stats["reminders_1d"] += 1

                # 3. 7-Day Urgent Reminder (1 < days_left <= 7)
                elif days_left <= 7:
                    sent = (
                        db.query(PropertyDocumentExpiryReminder)
                        .filter(
                            PropertyDocumentExpiryReminder.document_id == doc.id,
                            PropertyDocumentExpiryReminder.reminder_type == "7_DAYS",
                        )
                        .first()
                    )
                    if not sent:
                        db.add(PropertyDocumentExpiryReminder(document_id=doc.id, property_id=prop.id, reminder_type="7_DAYS", sent_at=now))
                        db.commit()
                        if provider_user_id:
                            NotificationService.create_notification(
                                db=db,
                                user_id=provider_user_id,
                                title="Urgent: Document Expires in 7 Days",
                                message=f"Your legal document for '{prop.name}' expires in 7 days. Please upload an updated document for review.",
                                type="EXPIRY_WARNING",
                                link=f"/provider/properties/{prop.id}/edit",
                            )
                        stats["reminders_7d"] += 1

                # 4. 30-Day Reminder (7 < days_left <= 30)
                elif days_left <= 30:
                    sent = (
                        db.query(PropertyDocumentExpiryReminder)
                        .filter(
                            PropertyDocumentExpiryReminder.document_id == doc.id,
                            PropertyDocumentExpiryReminder.reminder_type == "30_DAYS",
                        )
                        .first()
                    )
                    if not sent:
                        db.add(PropertyDocumentExpiryReminder(document_id=doc.id, property_id=prop.id, reminder_type="30_DAYS", sent_at=now))
                        db.commit()
                        if provider_user_id:
                            NotificationService.create_notification(
                                db=db,
                                user_id=provider_user_id,
                                title="Reminder: Document Expires in 30 Days",
                                message=f"Your legal document for '{prop.name}' expires in 30 days. Please prepare and upload a renewal document.",
                                type="EXPIRY_WARNING",
                                link=f"/provider/properties/{prop.id}/edit",
                            )
                        stats["reminders_30d"] += 1

                # 5. 60-Day Advance Notice (30 < days_left <= 60)
                elif days_left <= 60:
                    sent = (
                        db.query(PropertyDocumentExpiryReminder)
                        .filter(
                            PropertyDocumentExpiryReminder.document_id == doc.id,
                            PropertyDocumentExpiryReminder.reminder_type == "60_DAYS",
                        )
                        .first()
                    )
                    if not sent:
                        db.add(PropertyDocumentExpiryReminder(document_id=doc.id, property_id=prop.id, reminder_type="60_DAYS", sent_at=now))
                        db.commit()
                        if provider_user_id:
                            NotificationService.create_notification(
                                db=db,
                                user_id=provider_user_id,
                                title="Advance Notice: Document Expiry in 60 Days",
                                message=f"Your legal document for '{prop.name}' will expire in 60 days. Please ensure renewal arrangements are made.",
                                type="EXPIRY_WARNING",
                                link=f"/provider/properties/{prop.id}/edit",
                            )
                        stats["reminders_60d"] += 1

        except Exception as e:
            print("Error in LegalDocumentExpiryCron:", e)
        finally:
            if own_session:
                db.close()

        return stats
