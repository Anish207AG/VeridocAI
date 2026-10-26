import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.database import get_db
from app.models import VerificationFinding, Application, Document, AuditEvent
from app.schemas import VerificationFindingOut, FindingResolveRequest
from app.services.rules_engine import VerificationEngine
from app.services.audit_service import log_audit_event, verify_audit_chain

router = APIRouter(prefix="/api/verification", tags=["Verification"])

@router.post("/verify/{application_id}", response_model=List[VerificationFindingOut])
def trigger_verification(application_id: str, db: Session = Depends(get_db)):
    """Triggers automated cross-document verification and compliance checks."""
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    findings = VerificationEngine.verify_application(db, application_id, actor="Manual Officer Verification")
    return findings

@router.get("/findings", response_model=List[VerificationFindingOut])
def list_findings(
    application_id: Optional[str] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Lists compliance findings with optional filtering."""
    query = db.query(VerificationFinding)
    if application_id:
        query = query.filter(VerificationFinding.application_id == application_id)
    if severity and severity != "all":
        query = query.filter(VerificationFinding.severity == severity)
    if status and status != "all":
        query = query.filter(VerificationFinding.review_status == status)

    return query.order_by(VerificationFinding.created_at.desc()).all()

@router.post("/findings/{id}/resolve", response_model=VerificationFindingOut)
def resolve_finding(
    id: str,
    payload: FindingResolveRequest,
    db: Session = Depends(get_db)
):
    """Updates a finding review status with reviewer notes and logs audit record."""
    finding = db.query(VerificationFinding).filter(VerificationFinding.id == id).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    old_status = finding.review_status
    finding.review_status = payload.review_status
    finding.resolution_notes = payload.resolution_notes
    finding.resolved_by = payload.resolved_by
    finding.resolved_at = datetime.datetime.utcnow()

    db.commit()

    # Recalculate application risk score & status
    app = db.query(Application).filter(Application.id == finding.application_id).first()
    if app:
        all_findings = db.query(VerificationFinding).filter(VerificationFinding.application_id == app.id).all()
        open_findings = [f for f in all_findings if f.review_status in ["open", "in_review", "escalated"]]
        
        score = 0.0
        for f in open_findings:
            if f.severity == "high":
                score += 35.0
            elif f.severity == "medium":
                score += 15.0
            elif f.severity == "low":
                score += 5.0
        app.risk_score = min(100.0, round(score, 1))

        if not open_findings:
            app.status = "verified_clean"
        elif any(f.severity == "high" for f in open_findings):
            app.status = "verified_with_findings"
        else:
            app.status = "needs_review"
        db.commit()

    # Log audit event
    log_audit_event(
        db=db,
        event_type="finding_resolved",
        actor=payload.resolved_by,
        details={
            "finding_id": finding.id,
            "rule_code": finding.rule_code,
            "application_id": finding.application_id,
            "old_status": old_status,
            "new_status": payload.review_status,
            "notes": payload.resolution_notes
        }
    )

    db.refresh(finding)
    return finding

@router.get("/centre-metrics")
def get_centre_metrics(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Returns real database-backed metrics and operational telemetry for the Verification Centre.
    """
    # Document and application counts
    total_docs = db.query(Document).count()
    total_apps = db.query(Application).count()
    apps_requiring_review = db.query(Application).filter(
        Application.status.in_(["needs_review", "in_review", "verified_with_findings"])
    ).count()

    # Rule discrepancy counts
    cross_doc_mismatches = db.query(VerificationFinding).filter(
        VerificationFinding.rule_code.in_(["CR-INTAKE-002", "CR-DISC-005"])
    ).count()

    missing_or_expired = db.query(VerificationFinding).filter(
        VerificationFinding.rule_code.in_(["CR-EXPIRY-004", "CR-REQ-001"])
    ).count()

    duplicate_uploads = db.query(Document).filter(Document.is_duplicate == True).count()

    low_conf_extractions = db.query(Document).filter(
        or_(
            Document.extraction_status == "low_confidence",
            Document.image_quality_score < 0.70
        )
    ).count()

    # Cryptographic integrity check
    audit_check = verify_audit_chain(db)

    # Recent verification activity
    recent_events = (
        db.query(AuditEvent)
        .order_by(desc(AuditEvent.sequence_number))
        .limit(8)
        .all()
    )

    activity_stream = []
    for ev in recent_events:
        # Generate human-friendly description
        friendly_title = ev.event_type.replace("_", " ").title()
        details_snippet = ""
        try:
            import json
            det = json.loads(ev.details_json)
            if "name" in det:
                details_snippet = det["name"]
            elif "filename" in det:
                details_snippet = f"File: {det['filename']}"
            elif "application_id" in det:
                details_snippet = f"Application: {det['application_id']}"
            elif "rule_code" in det:
                details_snippet = f"Rule: {det['rule_code']}"
        except Exception:
            details_snippet = ""

        activity_stream.append({
            "sequence": ev.sequence_number,
            "event_type": ev.event_type,
            "title": friendly_title,
            "actor": ev.actor,
            "details_snippet": details_snippet,
            "timestamp": ev.timestamp.strftime("%Y-%m-%d %H:%M UTC") if ev.timestamp else "",
            "verified_hash": ev.current_hash[:12] + "..."
        })

    # Professional service operational health statuses
    service_status = {
        "verification_service": {
            "name": "Verification Service",
            "status": "Operational",
            "detail": "Cross-document reconciliation & rule evaluation active"
        },
        "document_ingestion": {
            "name": "Document Ingestion",
            "status": "Operational",
            "detail": f"{total_docs} statutory filings indexed"
        },
        "document_extraction": {
            "name": "Document Extraction",
            "status": "Needs Attention" if low_conf_extractions > 0 else "Operational",
            "detail": f"{low_conf_extractions} scan(s) flagged for officer review" if low_conf_extractions > 0 else "High-fidelity text extraction active"
        },
        "audit_ledger": {
            "name": "Cryptographic Audit Ledger",
            "status": "Operational" if audit_check["is_valid"] else "Integrity Warning",
            "detail": f"{audit_check['total_events']} events cryptographically chained"
        },
        "report_engine": {
            "name": "Report Compilation Service",
            "status": "Operational",
            "detail": "Institutional summary generation ready"
        }
    }

    return {
        "metrics": {
            "total_documents_processed": total_docs,
            "total_applications": total_apps,
            "applications_requiring_review": apps_requiring_review,
            "cross_document_mismatches": cross_doc_mismatches,
            "missing_or_expired_documents": missing_or_expired,
            "duplicate_uploads": duplicate_uploads,
            "low_confidence_extractions": low_conf_extractions
        },
        "audit_integrity": {
            "is_valid": audit_check["is_valid"],
            "total_events": audit_check["total_events"]
        },
        "service_status": service_status,
        "recent_activity": activity_stream
    }
