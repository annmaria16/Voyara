from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.schemas.notification import NotificationResponse, UnreadCountResponse
from app.schemas.auth import MessageResponse
from app.services.notifications.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("", response_model=List[NotificationResponse])
def get_my_notifications(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    unread_only: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List in-app notifications for the authenticated user."""
    return NotificationService.get_user_notifications(
        db=db,
        user_id=current_user.id,
        limit=limit,
        offset=offset,
        unread_only=unread_only
    )

@router.get("/unread-count", response_model=UnreadCountResponse)
def get_my_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the number of unread notifications."""
    count = NotificationService.get_unread_count(db=db, user_id=current_user.id)
    return {"unread_count": count}

@router.put("/read-all", response_model=MessageResponse)
@router.put("/mark-all-read", response_model=MessageResponse)
def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all notifications as read for current user."""
    return NotificationService.mark_all_as_read(db=db, user_id=current_user.id)

@router.put("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a single notification as read."""
    return NotificationService.mark_as_read(
        db=db,
        notification_id=notification_id,
        user_id=current_user.id
    )

@router.delete("/{notification_id}", response_model=MessageResponse)
def delete_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a notification."""
    return NotificationService.delete_notification(
        db=db,
        notification_id=notification_id,
        user_id=current_user.id
    )
