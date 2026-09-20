"""
Notifications API Endpoints
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database.session import get_db
from ..models.notification import Notification
from ..models.user import User
from ..schemas.notification import NotificationResponse
from ..middleware.auth_middleware import get_current_user, get_optional_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

@router.get("", response_model=List[NotificationResponse])
def get_user_notifications(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Returns user notifications, or demo notifications if unauthenticated.
    """
    if current_user:
        return (
            db.query(Notification)
            .filter(Notification.user_id == current_user.id)
            .order_by(desc(Notification.created_at))
            .all()
        )
    # Default to user 1 notifications for quick demo
    return db.query(Notification).order_by(desc(Notification.created_at)).limit(10).all()

@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(notification_id: int, db: Session = Depends(get_db)):
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found.")
    notif.read = True
    db.commit()
    db.refresh(notif)
    return notif
