"""
CivicSeva Backend Entrypoint for Vercel
Exposes the FastAPI ASGI application instance as 'app'.
"""

import os
import sys
from pathlib import Path

# Add backend directory to sys.path so aiml and internal modules resolve
_BACKEND_DIR = Path(__file__).resolve().parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from app.main import app

__all__ = ["app"]
