import hashlib
import json
import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models import AuditEvent
from app.config import AUDIT_GENESIS_PREV_HASH

def compute_audit_hash(prev_hash: str, sequence_number: int, timestamp: datetime.datetime, event_type: str, actor: str, details_json: str) -> str:
    """Computes SHA-256 hash for an audit block to form an immutable hash-chain."""
    time_str = timestamp.isoformat()
    canonical_data = f"{prev_hash}|{sequence_number}|{time_str}|{event_type}|{actor}|{details_json}"
    return hashlib.sha256(canonical_data.encode("utf-8")).hexdigest()

def log_audit_event(
    db: Session,
    event_type: str,
    actor: str,
    details: Dict[str, Any]
) -> AuditEvent:
    """Appends a new event to the tamper-evident cryptographic hash chain."""
    details_str = json.dumps(details, sort_keys=True)
    last_event = db.query(AuditEvent).order_by(desc(AuditEvent.sequence_number)).first()
    
    if last_event:
        seq = last_event.sequence_number + 1
        prev_h = last_event.current_hash
    else:
        seq = 1
        prev_h = AUDIT_GENESIS_PREV_HASH
        
    ts = datetime.datetime.utcnow()
    curr_h = compute_audit_hash(prev_h, seq, ts, event_type, actor, details_str)
    
    event = AuditEvent(
        sequence_number=seq,
        timestamp=ts,
        event_type=event_type,
        actor=actor,
        details_json=details_str,
        prev_hash=prev_h,
        current_hash=curr_h
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event

def verify_audit_chain(db: Session) -> Dict[str, Any]:
    """
    Verifies the integrity of the entire audit hash chain.
    Recalculates every block hash and checks cryptographic continuity.
    """
    events = db.query(AuditEvent).order_by(AuditEvent.sequence_number.asc()).all()
    checked_time = datetime.datetime.utcnow()
    
    if not events:
        return {
            "is_valid": True,
            "total_events": 0,
            "first_verified_sequence": None,
            "last_verified_sequence": None,
            "tampered_sequence": None,
            "details": "Audit log is empty. Genesis state intact.",
            "checked_at": checked_time
        }
        
    expected_prev = AUDIT_GENESIS_PREV_HASH
    
    for event in events:
        # 1. Check prev_hash continuity
        if event.prev_hash != expected_prev:
            return {
                "is_valid": False,
                "total_events": len(events),
                "first_verified_sequence": events[0].sequence_number,
                "last_verified_sequence": event.sequence_number - 1 if event.sequence_number > 1 else None,
                "tampered_sequence": event.sequence_number,
                "details": f"Broken link at sequence #{event.sequence_number}: expected prev_hash '{expected_prev}', found '{event.prev_hash}'.",
                "checked_at": checked_time
            }
            
        # 2. Re-compute hash of this block
        recalc_hash = compute_audit_hash(
            event.prev_hash,
            event.sequence_number,
            event.timestamp,
            event.event_type,
            event.actor,
            event.details_json
        )
        
        if recalc_hash != event.current_hash:
            return {
                "is_valid": False,
                "total_events": len(events),
                "first_verified_sequence": events[0].sequence_number,
                "last_verified_sequence": event.sequence_number - 1 if event.sequence_number > 1 else None,
                "tampered_sequence": event.sequence_number,
                "details": f"Content tampering detected at sequence #{event.sequence_number}: record hash does not match content.",
                "checked_at": checked_time
            }
            
        expected_prev = event.current_hash
        
    return {
        "is_valid": True,
        "total_events": len(events),
        "first_verified_sequence": events[0].sequence_number,
        "last_verified_sequence": events[-1].sequence_number,
        "tampered_sequence": None,
        "details": f"All {len(events)} audit events cryptographically verified. Hash chain unbroken.",
        "checked_at": checked_time
    }
