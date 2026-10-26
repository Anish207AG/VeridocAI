from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ExtractedField, Application
from app.schemas import ExtractedFieldOut, ExtractedFieldCorrection
from app.services.audit_service import log_audit_event
from app.services.rules_engine import VerificationEngine

router = APIRouter(prefix="/api/fields", tags=["Extracted Fields"])

@router.get("", response_model=List[ExtractedFieldOut])
def list_fields(
    application_id: Optional[str] = None,
    document_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Retrieves extracted fields for an application or document."""
    query = db.query(ExtractedField)
    if application_id:
        query = query.filter(ExtractedField.application_id == application_id)
    if document_id:
        query = query.filter(ExtractedField.document_id == document_id)
    return query.all()

@router.post("/{id}/correct", response_model=ExtractedFieldOut)
def correct_field(
    id: str,
    payload: ExtractedFieldCorrection,
    db: Session = Depends(get_db)
):
    """
    Allows a human reviewer to override an extracted field value.
    Logs the correction to the audit trail and triggers rule re-verification.
    """
    field = db.query(ExtractedField).filter(ExtractedField.id == id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Extracted field not found")

    old_val = field.corrected_value if field.is_corrected else field.raw_value
    field.is_corrected = True
    field.corrected_value = payload.corrected_value
    field.corrected_by = payload.corrected_by
    field.correction_reason = payload.correction_reason

    db.commit()
    db.refresh(field)

    # Log audit event
    log_audit_event(
        db=db,
        event_type="field_corrected",
        actor=payload.corrected_by,
        details={
            "field_id": field.id,
            "field_name": field.field_name,
            "document_id": field.document_id,
            "application_id": field.application_id,
            "old_value": old_val,
            "new_value": payload.corrected_value,
            "reason": payload.correction_reason
        }
    )

    # Re-run compliance verification
    VerificationEngine.verify_application(db, field.application_id, actor=f"Reviewer Correction ({payload.corrected_by})")

    db.refresh(field)
    return field
