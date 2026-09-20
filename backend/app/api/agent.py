"""
Agent and Audit Trace Endpoints
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database.session import get_db
from ..models.complaint import Complaint
from ..models.agent_action import AgentAction
from ..schemas.agent import AgentAnalyzeRequest, AgentTraceResponse, AgentTraceItem
from ..services.aiml_client import aiml_client
from ..services.autonomous_agent import autonomous_engine

router = APIRouter(prefix="/api/agent", tags=["Agent Operations"])

class AutonomousSweepRequest(BaseModel):
    force_demo: Optional[bool] = False

@router.post("/analyze")
async def analyze_input(payload: AgentAnalyzeRequest):
    """
    Executes raw AI agent analysis.
    """
    result = await aiml_client.analyze_complaint(
        text=payload.text,
        voice_transcription=payload.voice_transcription,
        image_path=payload.image_url,
        location={"address": payload.address, "latitude": payload.latitude, "longitude": payload.longitude}
    )
    return result

@router.post("/autonomous-sweep")
def trigger_autonomous_sweep(
    payload: Optional[AutonomousSweepRequest] = None,
    db: Session = Depends(get_db)
):
    """
    Triggers an autonomous system sweep:
    - Autonomously detects open complaints approaching or exceeding SLA thresholds.
    - Autonomously drafts and dispatches status update inquiries to responsible municipal departments.
    - Autonomously escalates critical or overdue dockets to Level 1 Vigilance.
    """
    force_demo = payload.force_demo if payload else False
    result = autonomous_engine.run_autonomous_sweep(db=db, force_demo_trigger=force_demo)
    return result

@router.get("/autonomous-stats")
def get_autonomous_stats(db: Session = Depends(get_db)):
    """
    Returns real-time operational telemetry for the autonomous agent engine.
    """
    return autonomous_engine.get_autonomous_stats(db=db)

@router.get("/autonomous-actions")
def get_autonomous_actions(limit: int = 20, db: Session = Depends(get_db)):
    """
    Returns the latest autonomous actions taken across all complaints.
    """
    actions = (
        db.query(AgentAction)
        .order_by(desc(AgentAction.timestamp))
        .limit(limit)
        .all()
    )
    return [
        {
            "id": a.id,
            "complaint_id": a.complaint_id,
            "agent_name": a.agent_name,
            "action": a.action,
            "input_summary": a.input_summary,
            "output_summary": a.output_summary,
            "timestamp": a.timestamp.isoformat() if a.timestamp else None
        }
        for a in actions
    ]

@router.get("/trace/{complaint_id}", response_model=AgentTraceResponse)
def get_complaint_trace(complaint_id: str, db: Session = Depends(get_db)):
    """
    Returns the complete step-by-step decision trace for the specified complaint.
    """
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail=f"Complaint '{complaint_id}' not found.")

    actions = (
        db.query(AgentAction)
        .filter(AgentAction.complaint_id == complaint_id)
        .order_by(AgentAction.timestamp.asc())
        .all()
    )

    trace_items = []
    for idx, act in enumerate(actions, 1):
        trace_items.append(AgentTraceItem(
            step_index=idx,
            agent_name=act.agent_name,
            action=act.action,
            input_summary=act.input_summary,
            output_summary=act.output_summary,
            status="completed",
            timestamp=act.timestamp.isoformat()
        ))

    return AgentTraceResponse(
        complaint_id=complaint_id,
        trace=trace_items
    )

@router.get("/evaluate")
async def run_evaluation():
    """
    Runs the AI evaluation harness across the benchmark dataset.
    """
    return await aiml_client.run_evaluation()
