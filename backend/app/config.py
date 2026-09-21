"""
CivicSeva Backend Configuration
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Database Configuration
# Fallback to local SQLite if PostgreSQL DATABASE_URL is not set or empty
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
if not DATABASE_URL:
    is_serverless = bool(os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME") or not os.access(str(BASE_DIR), os.W_OK))
    if is_serverless:
        tmp_db = Path("/tmp/civicseva.db")
        src_db = BASE_DIR / "civicseva.db"
        if src_db.exists() and not tmp_db.exists():
            import shutil
            try:
                shutil.copyfile(src_db, tmp_db)
            except Exception:
                pass
        DATABASE_URL = f"sqlite:///{tmp_db}"
    else:
        SQLITE_PATH = BASE_DIR / "civicseva.db"
        DATABASE_URL = f"sqlite:///{SQLITE_PATH}"

# Security
JWT_SECRET = os.getenv("JWT_SECRET", "civicseva_hackathon_demo_secret_key_2026")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

# Microservice & External Services
AIML_SERVICE_URL = os.getenv("AIML_SERVICE_URL", "http://localhost:8001")

# File Upload Storage
is_serverless = bool(os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME") or not os.access(str(BASE_DIR), os.W_OK))
if is_serverless:
    UPLOAD_DIR = Path("/tmp/uploads")
else:
    UPLOAD_DIR = BASE_DIR / "uploads"

try:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
except Exception:
    UPLOAD_DIR = Path("/tmp/uploads")
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB limit

# Allowed CORS Origins
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000").split(",")
    if origin.strip()
]

# SLA Thresholds (Hours)
SLA_HIGH_HOURS = int(os.getenv("SLA_HIGH_HOURS", "24"))
SLA_MEDIUM_HOURS = int(os.getenv("SLA_MEDIUM_HOURS", "48"))
SLA_LOW_HOURS = int(os.getenv("SLA_LOW_HOURS", "72"))
DEMO_FAST_SLA_SIMULATION = os.getenv("DEMO_FAST_SLA_SIMULATION", "false").lower() == "true"
