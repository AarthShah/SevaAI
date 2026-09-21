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

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, FileResponse
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

@app.middleware("http")
async def normalize_api_path(request: Request, call_next):
    """
    Ensures routes match regardless of whether Vercel rewrites forward /api or strip it.
    """
    path = request.scope.get("path", "")
    if not path.startswith("/api") and not path.startswith("/docs") and not path.startswith("/openapi.json") and not path.startswith("/uploads") and path not in ("/", "/health"):
        request.scope["path"] = f"/api{path}"
    return await call_next(request)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    err_trace = traceback.format_exc()
    print(f"Error on {request.method} {request.url.path}: {exc}\n{err_trace}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": str(exc),
            "error_type": type(exc).__name__,
            "path": request.url.path
        }
    )

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
@app.get("/api")
def root():
    return {
        "service": "CivicSeva Backend Core API",
        "tagline": "Report it. We understand it. We route it. We track it.",
        "status": "online",
        "version": "1.0.0",
        "docs_url": "/docs"
    }

@app.get("/health")
@app.get("/api/health")
def health():
    return {"status": "healthy", "service": "CivicSeva Backend"}

# Optional: Serve built frontend if dist exists (for single-service unified Render deployment)
FRONTEND_DIST = _BACKEND_DIR.parent / "frontend" / "dist"
if FRONTEND_DIST.exists() and (FRONTEND_DIST / "index.html").is_file():
    if (FRONTEND_DIST / "assets").exists():
        app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="spa-assets")

    @app.get("/{full_path:path}")
    async def serve_spa_frontend(full_path: str):
        if full_path.startswith("api") or full_path.startswith("uploads") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            return JSONResponse(status_code=404, content={"detail": "API endpoint not found"})
        candidate = FRONTEND_DIST / full_path
        if candidate.is_file():
            return FileResponse(str(candidate))
        return FileResponse(str(FRONTEND_DIST / "index.html"))

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("BACKEND_PORT", 8000))
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=port, reload=True)
