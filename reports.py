import os
import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Application
from app.config import REPORTS_DIR
from app.services.report_generator import generate_application_pdf_report
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/api/reports", tags=["Reports"])

@router.get("")
def list_reports() -> List[Dict[str, Any]]:
    """Lists all previously compiled PDF verification reports."""
    reports = []
    if REPORTS_DIR.exists():
        for f in os.listdir(REPORTS_DIR):
            if f.endswith(".pdf"):
                p = REPORTS_DIR / f
                stat = p.stat()
                reports.append({
                    "filename": f,
                    "file_size": stat.st_size,
                    "created_at": datetime.datetime.fromtimestamp(stat.st_ctime).isoformat(),
                    "download_url": f"/api/reports/download/{f}"
                })
    return sorted(reports, key=lambda x: x["created_at"], reverse=True)

@router.post("/generate/{application_id}")
def generate_report(application_id: str, db: Session = Depends(get_db)):
    """Generates an official institutional compliance verification PDF report."""
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    try:
        report_path = generate_application_pdf_report(db, application_id)
        filename = os.path.basename(report_path)

        log_audit_event(
            db=db,
            event_type="report_generated",
            actor="Officer",
            details={
                "application_id": application_id,
                "application_number": app.application_number,
                "report_filename": filename
            }
        )

        return {
            "message": "Report generated successfully",
            "filename": filename,
            "download_url": f"/api/reports/download/{filename}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")

@router.get("/download/{filename}")
def download_report(filename: str):
    """Downloads a compiled PDF verification report."""
    safe_name = os.path.basename(filename)
    path = REPORTS_DIR / safe_name
    if not path.exists():
        raise HTTPException(status_code=404, detail="Report file not found")
    return FileResponse(
        path,
        media_type="application/pdf",
        filename=safe_name,
        headers={"Content-Disposition": f"attachment; filename={safe_name}"}
    )
