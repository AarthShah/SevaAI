"""
Officer Pydantic Schemas
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

class OfficerResponse(BaseModel):
    id: int
    name: str
    role: str
    department_id: int
    department_name: Optional[str] = None
    phone: str
    email: Optional[str] = None
    current_lat: float
    current_lon: float
    current_address: Optional[str] = None
    status: str
    active_tickets: int
    rating: float
    avatar_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class OfficerTaskSummary(BaseModel):
    officer: OfficerResponse
    assigned_complaints: List[dict] = []
