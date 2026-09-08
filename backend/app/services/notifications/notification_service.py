from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.notification import Notification
from app.models.user import User, UserRole

class NotificationService:
    @staticmethod
    def create_notification(
        db: Session,
        user_id: int,
        title: str,
        message: str,
        type: str = "INFO",
        link: Optional[str] = None
    ) -> Notification:
        """Create and persist an in-app notification for a specific user."""
        notification = Notification(
            user_id=user_id,
            title=title.strip(),
            message=message.strip(),
            type=type.strip(),
            link=link.strip() if link else None,
            is_read=False
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)
        return notification

    @staticmethod
    def notify_admins(
        db: Session,
        title: str,
        message: str,
        type: str = "INFO",
        link: Optional[str] = None
    ) -> List[Notification]:
        """Broadcast a notification to all platform Administrators (avoiding duplicate unread alerts)."""
        admins = db.query(User).filter(
            (User.role == UserRole.ADMIN) | (User.role == "ADMIN")
        ).all()
        created = []
        for admin in admins:
            # Check if an identical unread notification already exists
            existing = db.query(Notification).filter(
                Notification.user_id == admin.id,
                Notification.type == type.strip(),
                Notification.message == message.strip(),
                Notification.is_read == False
            ).first()
            if existing:
                created.append(existing)
                continue

            notif = Notification(
                user_id=admin.id,
                title=title.strip(),
                message=message.strip(),
                type=type.strip(),
                link=link.strip() if link else None,
                is_read=False
            )
            db.add(notif)
            created.append(notif)
        db.commit()
        for notif in created:
            db.refresh(notif)
        return created

    @staticmethod
    def get_user_notifications(
        db: Session,
        user_id: int,
        limit: int = 50,
        offset: int = 0,
        unread_only: bool = False
    ) -> List[Notification]:
        """Fetch notifications for a user, sorted newest first."""
        query = db.query(Notification).filter(Notification.user_id == user_id)
        if unread_only:
            query = query.filter(Notification.is_read == False)
        return query.order_by(Notification.created_at.desc()).offset(offset).limit(limit).all()

    @staticmethod
    def get_unread_count(db: Session, user_id: int) -> int:
        """Get the count of unread notifications for a user."""
        return db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).count()

    @staticmethod
    def mark_as_read(db: Session, notification_id: int, user_id: int) -> Notification:
        """Mark a single notification as read."""
        notif = db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user_id
        ).first()
        if not notif:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")
        notif.is_read = True
        db.commit()
        db.refresh(notif)
        return notif

    @staticmethod
    def mark_all_as_read(db: Session, user_id: int) -> dict:
        """Mark all notifications as read for a user."""
        db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).update({"is_read": True})
        db.commit()
        return {"message": "All notifications marked as read.", "success": True}

    @staticmethod
    def delete_notification(db: Session, notification_id: int, user_id: int) -> dict:
        """Delete a notification."""
        notif = db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user_id
        ).first()
        if not notif:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")
        db.delete(notif)
        db.commit()
        return {"message": "Notification deleted successfully.", "success": True}
