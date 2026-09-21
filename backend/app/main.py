"""
CivicSeva Backend Application Main Entrypoint
FastAPI server orchestrating civic issue management, authentication,
autonomous agentic workflows, SLA tracking, and analytics.
"""

import os
import sys
from pathlib import Path
from contextlib import asynccontextmanager

# Guarantee backend directory is in sys.path so aiml and internal modules resolve
_BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import ALLOWED_ORIGINS, UPLOAD_DIR
from .database.session import engine, SessionLocal
from .database.base import Base
from .database.seed_data import seed_database
from .api import auth, complaints, departments, analytics, agent, upload, notifications, officers, cctv

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    Base.metadata.create_all(bind=engine)
    # Seed standard demo data
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title="CivicSeva Platform API",
    description="Autonomous AI-Powered Civic Grievance Resolution & Municipal Escalation Engine",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware - Permissive for Hackathon demo & dynamic Vercel preview domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS + ["*"],
    allow_origin_regex=r"^https?:\/\/.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for uploads
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Include Routers
app.include_router(auth.router)
app.include_router(complaints.router)
app.include_router(departments.router)
app.include_router(officers.router)
app.include_router(cctv.router)
app.include_router(analytics.router)
app.include_router(agent.router)
app.include_router(upload.router)
app.include_router(notifications.router)

@app.get("/")
def root():
    return {
        "service": "CivicSeva Backend Core API",
        "tagline": "Report it. We understand it. We route it. We track it.",
        "status": "online",
        "version": "1.0.0",
        "docs_url": "/docs"
    }

@app.get("/health")
def health():
    return {"status": "healthy", "service": "CivicSeva Backend"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("BACKEND_PORT", 8000))
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=port, reload=True)
