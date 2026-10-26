from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import VerificationFinding, Document, ExtractedField, Application

router = APIRouter(prefix="/api/review-queue", tags=["Manual Review Queue"])

@router.get("")
def get_review_queue(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Returns items categorized for prioritized human-in-the-loop review:
    1. Critical Discrepancies & High Severity Findings
    2. Low-Confidence & Degraded Extractions
    3. Unresolved Conflicting Values
    """
    # 1. Open high & medium severity findings
    open_findings = db.query(VerificationFinding).filter(
        VerificationFinding.review_status.in_(["open", "in_review", "escalated"])
    ).order_by(desc(VerificationFinding.severity)).all()

    # 2. Degraded or low-confidence documents
    low_conf_docs = db.query(Document).filter(
        (Document.extraction_status == "low_confidence") |
        (Document.image_quality_score < 0.70) |
        (Document.is_duplicate == True)
    ).all()

    # 3. Fields with low extraction confidence
    low_conf_fields = db.query(ExtractedField).filter(
        ExtractedField.confidence < 0.80,
        ExtractedField.is_corrected == False
    ).all()

    app_ids = set([f.application_id for f in open_findings] + [d.application_id for d in low_conf_docs])
    apps = {a.id: a for a in db.query(Application).filter(Application.id.in_(app_ids)).all()}

    findings_items = []
    for f in open_findings:
        app = apps.get(f.application_id)
        findings_items.append({
            "id": f.id,
            "type": "compliance_finding",
            "application_id": f.application_id,
            "application_number": app.application_number if app else "Unknown",
            "institution_name": app.institution_name if app else "Unknown",
            "title": f.title,
            "description": f.description,
            "severity": f.severity,
            "status": f.review_status,
            "rule_code": f.rule_code,
            "created_at": f.created_at.isoformat()
        })

    doc_items = []
    for d in low_conf_docs:
        app = apps.get(d.application_id)
        reason = "Exact duplicate file" if d.is_duplicate else f"Degraded scan quality ({int(d.image_quality_score * 100)}%)"
        doc_items.append({
            "id": d.id,
            "type": "document_quality",
            "application_id": d.application_id,
            "application_number": app.application_number if app else "Unknown",
            "institution_name": app.institution_name if app else "Unknown",
            "filename": d.filename,
            "document_type": d.document_type,
            "quality_score": d.image_quality_score,
            "extraction_method": d.extraction_method,
            "flag_reason": reason,
            "created_at": d.created_at.isoformat()
        })

    return {
        "summary": {
            "total_action_items": len(findings_items) + len(doc_items),
            "critical_findings": sum(1 for f in findings_items if f["severity"] == "high"),
            "moderate_findings": sum(1 for f in findings_items if f["severity"] == "medium"),
            "flagged_documents": len(doc_items),
            "low_confidence_fields": len(low_conf_fields)
        },
        "findings": findings_items,
        "flagged_documents": doc_items
    }
