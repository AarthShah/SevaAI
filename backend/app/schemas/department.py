"""
Department Pydantic Schemas
"""

from typing import Optional
from pydantic import BaseModel

class DepartmentCreate(BaseModel):
    name: str
    category: str
    location: Optional[str] = None
    contact: Optional[str] = None
    email: Optional[str] = None
    sla_hours: Optional[int] = 48

class DepartmentResponse(BaseModel):
    id: int
    name: str
    category: str
    location: Optional[str] = None
    contact: Optional[str] = None
    email: Optional[str] = None
    sla_hours: int

    class Config:
        from_attributes = True
