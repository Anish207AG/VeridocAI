import os
import shutil
import hashlib
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session

from app.database import get_db, Base, engine
from app.models import Application, Document, ExtractedField, VerificationFinding, AuditEvent, ComplianceRule
from app.config import SAMPLE_DATA_DIR, UPLOADS_DIR
from app.services.extractor import DocumentExtractor
from app.services.rules_engine import VerificationEngine, seed_default_rules
from app.services.audit_service import log_audit_event
from app.services.sample_generator import generate_all_sample_pdfs

router = APIRouter(prefix="/api/demo", tags=["Demonstration Scenarios"])

SCENARIOS = {
    "scenario_a": {
        "name": "Scenario A: Consistent & Compliant Institution",
        "app_id": "APP-2026-001",
        "app_number": "APP-2026-001",
        "institution_name": "Apex Institute of Technology",
        "institution_id": "INST-AICTE-1001",
        "course_programme": "B.Tech Computer Science and Engineering",
        "approved_intake": 120,
        "files": [
            ("scenario_a_approval.pdf", "approval_letter"),
            ("scenario_a_affiliation.pdf", "affiliation_certificate")
        ]
    },
    "scenario_b": {
        "name": "Scenario B: Intake Mismatch Discrepancy (120 vs 90)",
        "app_id": "APP-2026-002",
        "app_number": "APP-2026-002",
        "institution_name": "Horizon College of Engineering",
        "institution_id": "INST-AICTE-2002",
        "course_programme": "B.Tech Information Technology",
        "approved_intake": 120,
        "files": [
            ("scenario_b_approval.pdf", "approval_letter"),
            ("scenario_b_affiliation.pdf", "affiliation_certificate")
        ]
    },
    "scenario_c": {
        "name": "Scenario C: Expired Supporting Document",
        "app_id": "APP-2026-003",
        "app_number": "APP-2026-003",
        "institution_name": "Greenfield Polytechnic",
        "institution_id": "INST-AICTE-3003",
        "course_programme": "Diploma in Mechanical Engineering",
        "approved_intake": 60,
        "files": [
            ("scenario_c_approval.pdf", "approval_letter"),
            ("scenario_c_safety_cert.pdf", "building_safety_certificate")
        ]
    },
    "scenario_d": {
        "name": "Scenario D: Exact Duplicate Document Uploaded",
        "app_id": "APP-2026-004",
        "app_number": "APP-2026-004",
        "institution_name": "Metro Academy of Sciences",
        "institution_id": "INST-AICTE-4004",
        "course_programme": "B.Tech Electronics & Communication",
        "approved_intake": 60,
        "files": [
            ("scenario_d_approval.pdf", "approval_letter"),
            ("scenario_d_land_affidavit.pdf", "land_affidavit"),
            ("scenario_d_land_affidavit.pdf", "land_affidavit") # Second upload: triggers exact SHA-256 duplicate!
        ]
    },
    "scenario_e": {
        "name": "Scenario E: Degraded / Low Quality Scan",
        "app_id": "APP-2026-005",
        "app_number": "APP-2026-005",
        "institution_name": "Crestview Technical Institute",
        "institution_id": "INST-AICTE-5005",
        "course_programme": "Institutional Foundation",
        "approved_intake": None,
        "files": [
            ("scenario_e_scanned_charter.pdf", "other")
        ]
    }
}

def load_single_scenario(db: Session, scenario_key: str) -> Application:
    if scenario_key not in SCENARIOS:
        raise ValueError(f"Unknown scenario key: {scenario_key}")

    sc = SCENARIOS[scenario_key]

    # Ensure sample PDFs exist
    generate_all_sample_pdfs()

    # Check if app already exists; if so, delete it first to reload cleanly
    existing = db.query(Application).filter(Application.id == sc["app_id"]).first()
    if existing:
        db.delete(existing)
        db.commit()

    # Create application
    app = Application(
        id=sc["app_id"],
        application_number=sc["app_number"],
        institution_name=sc["institution_name"],
        institution_id=sc["institution_id"],
        academic_year="2026-2027",
        course_programme=sc["course_programme"],
        approved_intake=sc["approved_intake"],
        notes=f"Demonstration data: {sc['name']}",
        status="in_review",
        risk_score=0.0
    )
    db.add(app)
    db.commit()

    # Process files through real pipeline
    seen_hashes = {}
    for filename, doc_type in sc["files"]:
        src_path = SAMPLE_DATA_DIR / filename
        if not src_path.exists():
            continue

        with open(src_path, "rb") as f:
            content = f.read()

        file_size = len(content)
        sha256 = hashlib.sha256(content).hexdigest()

        is_dup = sha256 in seen_hashes
        dup_of_id = seen_hashes.get(sha256)

        dest_name = f"{app.id}_{len(seen_hashes)}_{filename}"
        dest_path = str(UPLOADS_DIR / dest_name)
        with open(dest_path, "wb") as f:
            f.write(content)

        extraction_result = DocumentExtractor.extract_from_file(dest_path)

        # For scenario E, intentionally simulate degraded scan metrics for testing
        if scenario_key == "scenario_e":
            extraction_result["image_quality_score"] = 0.52
            extraction_result["extraction_status"] = "low_confidence"
            extraction_result["extraction_method"] = "scanned_pdf_unassisted"

        doc = Document(
            application_id=app.id,
            filename=filename,
            file_path=dest_path,
            document_type=doc_type,
            mime_type="application/pdf",
            file_size=file_size,
            sha256_hash=sha256,
            is_duplicate=is_dup,
            duplicate_of_id=dup_of_id,
            page_count=extraction_result["page_count"],
            extraction_status=extraction_result["extraction_status"],
            extraction_method=extraction_result["extraction_method"],
            image_quality_score=extraction_result["image_quality_score"],
            ocr_confidence=extraction_result["ocr_confidence"]
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

        seen_hashes[sha256] = doc.id

        for f_data in extraction_result["fields"]:
            ef = ExtractedField(
                document_id=doc.id,
                application_id=app.id,
                field_name=f_data["field_name"],
                raw_value=f_data["raw_value"],
                normalized_value=f_data["normalized_value"],
                page_number=f_data["page_number"],
                bbox_json=f_data["bbox_json"],
                confidence=f_data["confidence"],
                extraction_method=f_data["extraction_method"]
            )
            db.add(ef)
        db.commit()

    # Run verification rules
    VerificationEngine.verify_application(db, app.id, actor="Scenario Initializer")
    db.refresh(app)

    log_audit_event(
        db=db,
        event_type="demo_scenario_loaded",
        actor="System",
        details={"scenario_key": scenario_key, "application_id": app.id, "name": sc["name"]}
    )

    return app

@router.get("/scenarios")
def list_scenarios():
    """Lists available demonstration scenarios."""
    return [
        {
            "key": k,
            "name": v["name"],
            "application_id": v["app_id"],
            "institution_name": v["institution_name"],
            "description": v["name"]
        }
        for k, v in SCENARIOS.items()
    ]

@router.post("/load-scenario/{scenario_key}")
def load_scenario_endpoint(scenario_key: str, db: Session = Depends(get_db)):
    """Loads a specific demonstration scenario (scenario_a through scenario_e)."""
    if scenario_key not in SCENARIOS:
        raise HTTPException(status_code=400, detail=f"Valid scenarios: {list(SCENARIOS.keys())}")
    
    app = load_single_scenario(db, scenario_key)
    return {
        "message": f"Successfully loaded {SCENARIOS[scenario_key]['name']}",
        "application_id": app.id,
        "status": app.status,
        "risk_score": app.risk_score
    }

@router.post("/reset")
def reset_demo_data(payload: Dict[str, Any] = Body(...), db: Session = Depends(get_db)):
    """
    Safely resets demo data and re-seeds default scenarios and rules.
    Requires explicit {"confirm": true}.
    """
    if not payload.get("confirm"):
        raise HTTPException(status_code=400, detail="Confirmation required: set confirm=true")

    # Clear application-related records
    db.query(VerificationFinding).delete()
    db.query(ExtractedField).delete()
    db.query(Document).delete()
    db.query(Application).delete()
    db.commit()

    # Ensure default rules
    seed_default_rules(db)

    # Load all 5 scenarios
    for key in SCENARIOS:
        load_single_scenario(db, key)

    log_audit_event(
        db=db,
        event_type="demo_reset",
        actor="Administrator",
        details={"status": "All 5 demonstration scenarios reloaded fresh"}
    )

    return {"message": "Demo data reset successfully. Loaded 5 realistic demonstration scenarios."}
