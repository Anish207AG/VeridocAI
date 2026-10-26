import os
from pathlib import Path

# Base directories
BACKEND_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BACKEND_DIR.parent
DATA_DIR = BACKEND_DIR / "data"
UPLOADS_DIR = BACKEND_DIR / "uploads"
REPORTS_DIR = BACKEND_DIR / "reports"
SAMPLE_DATA_DIR = ROOT_DIR / "sample_data"

# Ensure runtime directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)
SAMPLE_DATA_DIR.mkdir(parents=True, exist_ok=True)

# Database
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DATA_DIR / 'veridoc.db'}")

# Server configuration
HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", 8000))

# Cryptographic Salt / Genesis block for Audit Chain
AUDIT_GENESIS_PREV_HASH = "0000000000000000000000000000000000000000000000000000000000000000"

# Application metadata
APP_NAME = "VeriDoc AI"
APP_DESCRIPTION = "Intelligent Document Verification and Compliance Platform"
VERSION = "1.0.0"
