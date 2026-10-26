from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ComplianceRule
from app.schemas import ComplianceRuleOut, ComplianceRuleCreate, ComplianceRuleUpdate
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/api/rules", tags=["Compliance Rules"])

@router.get("", response_model=List[ComplianceRuleOut])
def list_rules(db: Session = Depends(get_db)):
    """Lists all configured compliance rules with enable status and parameters."""
    return db.query(ComplianceRule).order_by(ComplianceRule.rule_code.asc()).all()

@router.post("", response_model=ComplianceRuleOut)
def create_rule(payload: ComplianceRuleCreate, db: Session = Depends(get_db)):
    """Registers a new custom compliance verification rule."""
    existing = db.query(ComplianceRule).filter(ComplianceRule.rule_code == payload.rule_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Rule code already exists")

    rule = ComplianceRule(
        rule_code=payload.rule_code,
        name=payload.name,
        description=payload.description,
        category=payload.category,
        severity=payload.severity,
        parameters_json=payload.parameters_json,
        is_enabled=payload.is_enabled,
        citation_reference=payload.citation_reference
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)

    log_audit_event(
        db=db,
        event_type="rule_created",
        actor="Administrator",
        details={"rule_code": rule.rule_code, "name": rule.name}
    )

    return rule

@router.put("/{id}", response_model=ComplianceRuleOut)
def update_rule(id: str, payload: ComplianceRuleUpdate, db: Session = Depends(get_db)):
    """Updates rule configuration, severity, parameters or citations."""
    rule = db.query(ComplianceRule).filter(ComplianceRule.id == id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    for k, v in payload.dict(exclude_unset=True).items():
        setattr(rule, k, v)

    db.commit()
    db.refresh(rule)

    log_audit_event(
        db=db,
        event_type="rule_updated",
        actor="Administrator",
        details={"rule_code": rule.rule_code, "updates": payload.dict(exclude_unset=True)}
    )

    return rule

@router.post("/{id}/toggle", response_model=ComplianceRuleOut)
def toggle_rule(id: str, db: Session = Depends(get_db)):
    """Toggles active/inactive status of a compliance rule."""
    rule = db.query(ComplianceRule).filter(ComplianceRule.id == id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    rule.is_enabled = not rule.is_enabled
    db.commit()
    db.refresh(rule)

    log_audit_event(
        db=db,
        event_type="rule_toggled",
        actor="Administrator",
        details={"rule_code": rule.rule_code, "is_enabled": rule.is_enabled}
    )

    return rule

@router.delete("/{id}")
def delete_rule(id: str, db: Session = Depends(get_db)):
    """Removes a compliance rule from the active catalog."""
    rule = db.query(ComplianceRule).filter(ComplianceRule.id == id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    rule_code = rule.rule_code
    db.delete(rule)
    db.commit()

    log_audit_event(
        db=db,
        event_type="rule_deleted",
        actor="Administrator",
        details={"rule_code": rule_code}
    )

    return {"message": "Rule deleted successfully"}
