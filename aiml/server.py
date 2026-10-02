"""
CivicSeva AIML Microservice Server
Exposes standalone REST endpoints for the autonomous civic agent pipeline.
"""

import os
import sys
from pathlib import Path

# Add project root to sys.path so aiml is importable
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

env_file = ROOT_DIR / ".env"
if env_file.is_file():
    for line in env_file.read_text(encoding="utf-8-sig").splitlines():
        stripped = line.strip()
        if stripped and not stripped.startswith("#") and "=" in stripped:
            name, value = stripped.split("=", 1)
            os.environ.setdefault(name.strip(), value.strip().strip("\"'"))

from typing import Dict, Any, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from aiml.agents.civic_agent import civic_agent
from aiml.evaluation.metrics import EvaluationHarness
from aiml.rag.knowledge_base import CIVIC_KNOWLEDGE_DOCUMENTS, DEPARTMENT_CONFIG

app = FastAPI(
    title="CivicSeva AIML Intelligence Engine",
    description="Autonomous Multi-Agent Civic Grievance Analysis and Routing Engine",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeTextRequest(BaseModel):
    text: Optional[str] = None
    voice_transcription: Optional[str] = None
    location: Optional[Dict[str, Any]] = None
    user_info: Optional[Dict[str, Any]] = None
    image_path: Optional[str] = None
    image_filename: Optional[str] = None
    image_url: Optional[str] = None

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "CivicSeva AIML Engine",
        "version": "1.0.0",
        "mode": "ACTIVE"
    }

@app.get("/api/agent/knowledge")
def get_knowledge_base():
    """Returns the civic knowledge base and department jurisdiction catalog."""
    return {
        "documents": CIVIC_KNOWLEDGE_DOCUMENTS,
        "departments": DEPARTMENT_CONFIG
    }

@app.post("/api/agent/analyze")
async def analyze_complaint(payload: AnalyzeTextRequest):
    """
    Primary agentic endpoint for multimodal analysis.
    Executes Input Analyzer -> Classifier -> Severity -> Department -> Generator.
    """
    try:
        resolved_img = payload.image_path or payload.image_url
        result = civic_agent.analyze_complaint(
            text=payload.text,
            voice_transcription=payload.voice_transcription,
            location=payload.location,
            user_info=payload.user_info,
            image_path=resolved_img,
            image_filename=payload.image_filename
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Agent Analysis failed: {str(e)}")

@app.post("/api/agent/analyze-form")
async def analyze_complaint_form(
    text: Optional[str] = Form(None),
    voice_transcription: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    image: Optional[UploadFile] = File(None)
):
    """
    Accepts multipart form data with image file attachment.
    """
    image_bytes = None
    image_filename = None
    if image:
        image_bytes = await image.read()
        image_filename = image.filename

    location_data = {
        "address": address or "Location detected via map pin",
        "latitude": latitude,
        "longitude": longitude
    }

    result = civic_agent.analyze_complaint(
        text=text,
        voice_transcription=voice_transcription,
        image_bytes=image_bytes,
        image_filename=image_filename,
        location=location_data
    )
    return result

from aiml.forensics.authenticity_verifier import authenticity_verifier

@app.post("/api/agent/verify-evidence")
async def verify_evidence_endpoint(
    image: Optional[UploadFile] = File(None),
    image_url: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None)
):
    """
    Dedicated endpoint for Evidence Authenticity & Digital Forensics Verification.
    Runs Error Level Analysis (ELA), AI-Generated Media Check (2D FFT),
    Metadata/EXIF inspection, Provenance verification, Context consistency,
    and returns Authenticity Risk Score with Decision Gateway action (PASS vs REVIEW).
    """
    image_input = None
    filename = None
    if image:
        image_input = await image.read()
        filename = image.filename
    elif image_url:
        image_input = image_url
        filename = image_url.split("/")[-1]

    loc = None
    if latitude is not None and longitude is not None:
        loc = {"latitude": latitude, "longitude": longitude, "address": address}

    return authenticity_verifier.verify_evidence(
        image_input=image_input,
        filename=filename,
        reported_location=loc
    )

from aiml.vision.cctv_detector import cctv_detector

@app.get("/api/agent/cctv/cameras")
def get_cctv_cameras():
    """Returns smart city CCTV cameras configured for automated vision monitoring."""
    return cctv_detector.get_cameras()

@app.post("/api/agent/cctv/scan")
async def scan_cctv_feed(
    camera_id: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None)
):
    """
    Runs computer vision detection on a camera feed or uploaded frame.
    Detects potholes, garbage dumps, water leaks, streetlight outages, and drainage issues.
    """
    image_bytes = None
    filename = None
    if image:
        image_bytes = await image.read()
        filename = image.filename

    return cctv_detector.scan_camera_feed(
        camera_id=camera_id,
        image_bytes=image_bytes,
        filename=filename
    )

@app.get("/api/agent/evaluate")
@app.post("/api/agent/evaluate")
def run_evaluation():
    """
    Runs the benchmark evaluation harness across curated civic test cases.
    """
    harness = EvaluationHarness()
    results = harness.run_evaluation()
    return results

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("AIML_PORT", 8001))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=False)
