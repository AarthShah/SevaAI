"""
Vercel Serverless Entrypoint for CivicSeva Backend
Exposes the FastAPI ASGI application for Vercel Python runtime.
"""

from app.main import app

__all__ = ["app"]
