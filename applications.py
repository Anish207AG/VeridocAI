import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.database import get_db
from app.models import Application, Document, ExtractedField, VerificationFinding, AuditEvent
from app.schemas import (
    ApplicationCreate, ApplicationUpdate, ApplicationOut, DashboardStats
)
from app.services.audit_service import log_audit_event, verify_audit_chain

router = APIRouter(prefix="/api/applications", tags=["Applications"])

@router.get("", response_model=List[ApplicationOut])
def list_applications(
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Lists applications with optional filtering and search."""
    query = db.query(Application)

    if status and status != "all":
        query = query.filter(Application.status == status)

    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                Application.application_number.ilike(term),
                Application.institution_name.ilike(term),
                Application.institution_id.ilike(term)
            )
        )

    return query.order_by(desc(Application.created_at)).offset(offset).limit(limit).all()

@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    """Computes real-time system metrics for the dashboard."""
    total_apps = db.query(Application).count()
    clean_apps = db.query(Application).filter(Application.status == "verified_clean").count()
    findings_apps = db.query(Application).filter(Application.status == "verified_with_findings").count()
    review_apps = db.query(Application).filter(Application.status.in_(["needs_review", "in_review"])).count()

    total_docs = db.query(Document).count()
    duplicates = db.query(Document).filter(Document.is_duplicate == True).count()
    total_findings = db.query(VerificationFinding).count()

    # Findings by severity
    high_f = db.query(VerificationFinding).filter(VerificationFinding.severity == "high").count()
    med_f = db.query(VerificationFinding).filter(VerificationFinding.severity == "medium").count()
    low_f = db.query(VerificationFinding).filter(VerificationFinding.severity == "low").count()
    info_f = db.query(VerificationFinding).filter(VerificationFinding.severity == "info").count()

    # Review queue items: open findings + low confidence extractions
    open_findings = db.query(VerificationFinding).filter(VerificationFinding.review_status.in_(["open", "in_review"])).count()
    low_conf_docs = db.query(Document).filter(Document.extraction_status == "low_confidence").count()

    # Audit chain check
    audit_check = verify_audit_chain(db)

    return {
        "total_applications": total_apps,
        "clean_applications": clean_apps,
        "applications_with_findings": findings_apps,
        "under_review_applications": review_apps,
        "total_documents": total_docs,
        "total_duplicates_detected": duplicates,
        "total_findings": total_findings,
        "findings_by_severity": {
            "high": high_f,
            "medium": med_f,
            "low": low_f,
            "info": info_f
        },
        "review_queue_count": open_findings + low_conf_docs,
        "audit_chain_valid": audit_check["is_valid"],
        "audit_event_count": audit_check["total_events"]
    }

@router.post("", response_model=ApplicationOut)
def create_application(payload: ApplicationCreate, db: Session = Depends(get_db)):
    """Registers a new institution compliance application."""
    app_id = f"APP-{uuid.uuid4().hex[:8].upper()}"
    app = Application(
        id=app_id,
        application_number=payload.application_number,
        institution_name=payload.institution_name,
        institution_id=payload.institution_id,
        academic_year=payload.academic_year,
        course_programme=payload.course_programme,
        approved_intake=payload.approved_intake,
        notes=payload.notes,
        status="draft",
        risk_score=0.0
    )
    db.add(app)
    db.commit()
    db.refresh(app)

    log_audit_event(
        db=db,
        event_type="application_created",
        actor="Officer",
        details={
            "application_id": app.id,
            "application_number": app.application_number,
            "institution_name": app.institution_name
        }
    )

    return app

@router.get("/{id}", response_model=ApplicationOut)
def get_application(id: str, db: Session = Depends(get_db)):
    """Fetches full details of a specific application."""
    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return app

@router.put("/{id}", response_model=ApplicationOut)
def update_application(id: str, payload: ApplicationUpdate, db: Session = Depends(get_db)):
    """Updates basic application metadata."""
    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    for k, v in payload.dict(exclude_unset=True).items():
        setattr(app, k, v)

    db.commit()
    db.refresh(app)
    return app

@router.delete("/{id}")
def delete_application(id: str, db: Session = Depends(get_db)):
    """Deletes an application and cascades to its documents and findings."""
    app = db.query(Application).filter(Application.id == id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    app_num = app.application_number
    db.delete(app)
    db.commit()

    log_audit_event(
        db=db,
        event_type="application_deleted",
        actor="Officer",
        details={"application_id": id, "application_number": app_num}
    )

    return {"message": "Application deleted successfully"}
