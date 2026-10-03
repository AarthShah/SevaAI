"""
CCTV AI Service-to-Service and Officer Triage Schemas.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class CctvEventLocationMetadata(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None

class CctvEventCreate(BaseModel):
    event_id: str = Field(..., min_length=1, max_length=100)
    event_type: str = Field("POTHOLE_DETECTED", max_length=50)
    camera_id: str = Field(..., min_length=1, max_length=50)
    source_video: Optional[str] = None
    confidence: float = Field(..., ge=0.0, le=1.0)
    peak_confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    event_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    severity: str = Field("MEDIUM", pattern="^(LOW|MEDIUM|HIGH|CRITICAL)$")
    timestamp: Optional[str] = None
    frame_number: Optional[int] = None
    bbox: Optional[List[float]] = None
    persistence_seconds: Optional[float] = None
    supporting_detections: Optional[int] = None
    evidence_image_base64: Optional[str] = None
    location_metadata: Optional[CctvEventLocationMetadata] = None

class CctvEventStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(VERIFIED|DISMISSED|PENDING_REVIEW)$")
    review_notes: Optional[str] = None

class CctvConvertToComplaint(BaseModel):
    category: Optional[str] = "road_infrastructure"
    description: Optional[str] = None
    severity: Optional[str] = None

class CctvEventResponse(BaseModel):
    id: int
    event_id: str
    event_type: str
    camera_id: str
    source_video: Optional[str] = None
    confidence: float
    peak_confidence: Optional[float] = None
    event_score: Optional[float] = None
    severity: str
    status: str
    timestamp_video: Optional[str] = None
    frame_number: Optional[int] = None
    bbox: Optional[List[float]] = None
    persistence_seconds: Optional[float] = None
    supporting_detections: Optional[int] = None
    evidence_image_url: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    reviewed_by_id: Optional[int] = None
    review_notes: Optional[str] = None
    complaint_id: Optional[str] = None
    created_at: str
    updated_at: str

class CctvEventsListResponse(BaseModel):
    total: int
    items: List[CctvEventResponse]
