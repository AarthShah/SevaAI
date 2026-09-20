"""
Analytics Schemas
"""

from typing import Dict, List, Any
from pydantic import BaseModel

class StatusCount(BaseModel):
    status: str
    count: int

class CategoryCount(BaseModel):
    category: str
    count: int

class SeverityCount(BaseModel):
    severity: str
    count: int

class DepartmentCount(BaseModel):
    department: str
    count: int

class AnalyticsSummary(BaseModel):
    total_complaints: int
    active_complaints: int
    resolved_complaints: int
    escalated_complaints: int
    overdue_complaints: int
    avg_resolution_hours: float
    by_status: List[StatusCount]
    by_category: List[CategoryCount]
    by_severity: List[SeverityCount]
    by_department: List[DepartmentCount]
    recent_trend: List[Dict[str, Any]]
