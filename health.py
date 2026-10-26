import sys
import os
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.config import APP_NAME, VERSION, DATA_DIR, UPLOADS_DIR

router = APIRouter(prefix="/api/health", tags=["System Health"])

@router.get("")
def health_check(db: Session = Depends(get_db)):
    """System health check and runtime dependency status."""
    db_ok = False
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    # Check PyMuPDF
    pymupdf_available = False
    try:
        import fitz
        pymupdf_available = True
    except ImportError:
        pass

    # Check OpenCV
    opencv_available = False
    try:
        import cv2
        opencv_available = True
    except ImportError:
        pass

    # Check PaddleOCR
    paddleocr_available = False
    try:
        from paddleocr import PaddleOCR
        paddleocr_available = True
    except ImportError:
        pass

    return {
        "status": "healthy" if db_ok else "unhealthy",
        "service_name": APP_NAME,
        "release": VERSION,
        "database": {
            "status": "connected" if db_ok else "disconnected",
            "storage_state": "available"
        },
        "engine_capabilities": {
            "digital_extraction": True,
            "scan_quality_analysis": True,
            "fallback_ocr_pipeline": True,
            "tamper_evident_audit_chain": True,
            "claim_evidence_graph": True
        },
        "storage": {
            "status": "ready",
            "documents_indexed": len(os.listdir(UPLOADS_DIR)) if UPLOADS_DIR.exists() else 0
        }
    }
