"""
Agent and Trace Schemas
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class AgentAnalyzeRequest(BaseModel):
    text: Optional[str] = None
    voice_transcription: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    image_url: Optional[str] = None

class AgentTraceItem(BaseModel):
    step_index: int
    agent_name: str
    action: str
    input_summary: Optional[str] = None
    output_summary: Optional[str] = None
    status: Optional[str] = "completed"
    timestamp: str

class AgentTraceResponse(BaseModel):
    complaint_id: str
    trace: List[AgentTraceItem]
