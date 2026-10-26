from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import AuditEvent
from app.schemas import AuditEventOut, AuditVerificationResult
from app.services.audit_service import verify_audit_chain

router = APIRouter(prefix="/api/audit", tags=["Audit Trail"])

@router.get("", response_model=List[AuditEventOut])
def list_audit_events(
    event_type: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Returns chronologically ordered audit trail events."""
    query = db.query(AuditEvent)
    if event_type and event_type != "all":
        query = query.filter(AuditEvent.event_type == event_type)
    return query.order_by(desc(AuditEvent.sequence_number)).offset(offset).limit(limit).all()

@router.get("/verify", response_model=AuditVerificationResult)
def verify_integrity(db: Session = Depends(get_db)):
    """
    Cryptographically verifies the SHA-256 hash chain across all audit blocks.
    Identifies any altered, inserted, or omitted records.
    """
    result = verify_audit_chain(db)
    return result
