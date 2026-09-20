"""
Notification Schemas
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class NotificationResponse(BaseModel):
    id: int
    user_id: int
    complaint_id: Optional[str] = None
    message: str
    read: bool
    created_at: datetime

    class Config:
        from_attributes = True
