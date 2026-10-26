import json
import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models import Application, Document, ExtractedField, ComplianceRule, VerificationFinding
from app.services.audit_service import log_audit_event

# Default compliance rules definitions with citations
DEFAULT_RULES = [
    {
        "rule_code": "CR-REQ-001",
        "name": "Mandatory Supporting Document Requirement",
        "description": "Verifies that an application contains both the statutory Approval Letter and the State/University Affiliation Certificate.",
        "category": "required_document",
        "severity": "high",
        "citation_reference": "Illustrative Institutional Regulation Sec 4.2(a) - Minimum Documentation Requirements",
        "parameters_json": json.dumps({
            "required_types": ["approval_letter", "affiliation_certificate"]
        })
    },
    {
        "rule_code": "CR-INTAKE-002",
        "name": "Cross-Document Approved Intake Consistency",
        "description": "Compares sanctioned student intake figures across all uploaded approval and affiliation documents to prevent seat capacity discrepancies.",
        "category": "cross_document_consistency",
        "severity": "high",
        "citation_reference": "Illustrative Academic Sanction Norms Cl. 8 - Seat Matrix Consistency Across Regulatory Bodies",
        "parameters_json": json.dumps({
            "target_field": "approved_intake"
        })
    },
    {
        "rule_code": "CR-INST-003",
        "name": "Institutional Identifier & Name Verification",
        "description": "Validates that the institution name and permanent institutional ID are identical across all uploaded documents without naming ambiguity.",
        "category": "cross_document_consistency",
        "severity": "medium",
        "citation_reference": "Illustrative Statutory Verification Guide Part II - Entity Identity Integrity",
        "parameters_json": json.dumps({
            "name_field": "institution_name",
            "id_field": "institution_id"
        })
    },
    {
        "rule_code": "CR-EXPIRY-004",
        "name": "Document Validity & Expiry Audit",
        "description": "Ensures supporting clearances (such as fire, building safety, land affidavits, and affiliation) have not expired prior to the academic session.",
        "category": "validity_expiry",
        "severity": "high",
        "citation_reference": "Illustrative Compliance Standards - Mandatory Active Clearances at Time of Inspection",
        "parameters_json": json.dumps({
            "target_field": "expiry_date"
        })
    },
    {
        "rule_code": "CR-DUP-005",
        "name": "Cryptographic Exact Duplicate Detection",
        "description": "Detects identical files uploaded multiple times using SHA-256 cryptographic digest matching.",
        "category": "duplicate_detection",
        "severity": "medium",
        "citation_reference": "Illustrative File Repository Hygiene Norms - Redundant Submission Advisory",
        "parameters_json": json.dumps({})
    },
    {
        "rule_code": "CR-QUAL-006",
        "name": "Document Scan Quality & Legibility Assurance",
        "description": "Evaluates optical scan quality, contrast, and blur metrics; routes degraded or unassisted scans to the manual review queue.",
        "category": "scan_quality",
        "severity": "medium",
        "citation_reference": "Illustrative Digital Record Guidelines - Minimum Optical Readability Criteria",
        "parameters_json": json.dumps({
            "min_quality_score": 0.70
        })
    },
    {
        "rule_code": "CR-PRES-007",
        "name": "Mandatory Fields Presence in Approval Documents",
        "description": "Ensures regulatory approval letters contain essential fields including approved intake, academic year, and issue date.",
        "category": "field_presence",
        "severity": "medium",
        "citation_reference": "Illustrative Regulatory Format Schedule III - Minimum Mandatory Header Clauses",
        "parameters_json": json.dumps({
            "required_fields": ["approved_intake", "academic_year", "issue_date"]
        })
    }
]

def seed_default_rules(db: Session):
    """Initializes default rules if not already present."""
    for r_data in DEFAULT_RULES:
        existing = db.query(ComplianceRule).filter(ComplianceRule.rule_code == r_data["rule_code"]).first()
        if not existing:
            rule = ComplianceRule(
                rule_code=r_data["rule_code"],
                name=r_data["name"],
                description=r_data["description"],
                category=r_data["category"],
                severity=r_data["severity"],
                citation_reference=r_data["citation_reference"],
                parameters_json=r_data["parameters_json"],
                is_enabled=True
            )
            db.add(rule)
    db.commit()

class VerificationEngine:
    """
    Executes compliance rules against an application and its uploaded documents.
    Generates evidence-linked findings and calculates application risk status.
    """

    @staticmethod
    def verify_application(db: Session, application_id: str, actor: str = "Automated Rules Engine") -> List[VerificationFinding]:
        app = db.query(Application).filter(Application.id == application_id).first()
        if not app:
            return []

        # Load active rules
        rules = {r.rule_code: r for r in db.query(ComplianceRule).filter(ComplianceRule.is_enabled == True).all()}
        
        # Load documents and fields
        docs = db.query(Document).filter(Document.application_id == application_id).all()
        fields = db.query(ExtractedField).filter(ExtractedField.application_id == application_id).all()

        # Remove previous unresolved automated findings for fresh verification
        existing_open = db.query(VerificationFinding).filter(
            VerificationFinding.application_id == application_id,
            VerificationFinding.review_status == "open"
        ).all()
        for f in existing_open:
            db.delete(f)
        db.commit()

        new_findings: List[VerificationFinding] = []

        # -------------------------------------------------------------
        # Rule 1: CR-REQ-001 (Required Documents)
        # -------------------------------------------------------------
        if "CR-REQ-001" in rules:
            r = rules["CR-REQ-001"]
            params = json.loads(r.parameters_json or "{}")
            req_types = params.get("required_types", ["approval_letter", "affiliation_certificate"])
            present_types = {d.document_type for d in docs}
            
            missing = [t for t in req_types if t not in present_types]
            if missing:
                readable_missing = ", ".join([m.replace("_", " ").title() for m in missing])
                finding = VerificationFinding(
                    application_id=app.id,
                    rule_id=r.id,
                    rule_code=r.rule_code,
                    title="Missing Mandatory Supporting Documents",
                    description=f"The application is missing {len(missing)} required document(s): {readable_missing}. Both statutory approval and university affiliation are mandatory.",
                    severity=r.severity,
                    review_status="open",
                    conflicting_values_json=json.dumps({"missing_document_types": missing, "present_document_types": list(present_types)}),
                    source_documents_json=json.dumps([{"document_id": d.id, "filename": d.filename} for d in docs])
                )
                new_findings.append(finding)

        # -------------------------------------------------------------
        # Rule 2: CR-INTAKE-002 (Cross-Document Intake Consistency)
        # -------------------------------------------------------------
        if "CR-INTAKE-002" in rules:
            r = rules["CR-INTAKE-002"]
            intake_fields = [f for f in fields if f.field_name == "approved_intake"]
            
            # Group by normalized intake value
            intake_map = {}
            for f in intake_fields:
                val = f.corrected_value if f.is_corrected else f.normalized_value
                if val:
                    val_str = str(val).strip()
                    doc = next((d for d in docs if d.id == f.document_id), None)
                    intake_map.setdefault(val_str, []).append({
                        "document_id": f.document_id,
                        "filename": doc.filename if doc else "Unknown",
                        "document_type": doc.document_type if doc else "Unknown",
                        "page_number": f.page_number,
                        "raw_value": f.raw_value,
                        "value": val_str
                    })

            if len(intake_map) > 1:
                # Discrepancy found!
                desc_parts = [f"{', '.join([item['filename'] for item in items])} specifies {k} intake" for k, items in intake_map.items()]
                finding = VerificationFinding(
                    application_id=app.id,
                    rule_id=r.id,
                    rule_code=r.rule_code,
                    title="Intake Capacity Discrepancy Across Documents",
                    description=f"Discrepant intake capacity detected between uploaded documents: {'; '.join(desc_parts)}. Approval letter and affiliation must agree on total sanctioned seats.",
                    severity=r.severity,
                    review_status="open",
                    conflicting_values_json=json.dumps(intake_map),
                    source_documents_json=json.dumps([item for items in intake_map.values() for item in items])
                )
                new_findings.append(finding)

        # -------------------------------------------------------------
        # Rule 3: CR-INST-003 (Institution Name / ID Consistency)
        # -------------------------------------------------------------
        if "CR-INST-003" in rules:
            r = rules["CR-INST-003"]
            id_fields = [f for f in fields if f.field_name == "institution_id"]
            id_map = {}
            for f in id_fields:
                val = f.corrected_value if f.is_corrected else f.normalized_value
                if val:
                    clean_id = str(val).strip().upper()
                    doc = next((d for d in docs if d.id == f.document_id), None)
                    id_map.setdefault(clean_id, []).append({
                        "document_id": f.document_id,
                        "filename": doc.filename if doc else "Unknown",
                        "page_number": f.page_number,
                        "value": clean_id
                    })

            if len(id_map) > 1:
                finding = VerificationFinding(
                    application_id=app.id,
                    rule_id=r.id,
                    rule_code=r.rule_code,
                    title="Institution ID Mismatch Across Documents",
                    description=f"Multiple conflicting institution permanent IDs extracted across documents: {list(id_map.keys())}. All supporting clearances must refer to the same institutional entity.",
                    severity=r.severity,
                    review_status="open",
                    conflicting_values_json=json.dumps(id_map),
                    source_documents_json=json.dumps([item for items in id_map.values() for item in items])
                )
                new_findings.append(finding)

        # -------------------------------------------------------------
        # Rule 4: CR-EXPIRY-004 (Expiry Date Validity)
        # -------------------------------------------------------------
        if "CR-EXPIRY-004" in rules:
            r = rules["CR-EXPIRY-004"]
            expiry_fields = [f for f in fields if f.field_name == "expiry_date"]
            # System reference date
            today = datetime.date(2026, 10, 25)

            for f in expiry_fields:
                val = f.corrected_value if f.is_corrected else f.normalized_value
                if val:
                    try:
                        exp_date = datetime.datetime.strptime(val.strip(), "%Y-%m-%d").date()
                        if exp_date < today:
                            doc = next((d for d in docs if d.id == f.document_id), None)
                            finding = VerificationFinding(
                                application_id=app.id,
                                rule_id=r.id,
                                rule_code=r.rule_code,
                                title="Expired Supporting Document",
                                description=f"Document '{doc.filename if doc else 'Document'}' contains an expiration date of {val}, which has lapsed. Clearance is no longer active.",
                                severity=r.severity,
                                review_status="open",
                                conflicting_values_json=json.dumps({
                                    "expired_date": str(exp_date),
                                    "current_date": str(today),
                                    "days_expired": (today - exp_date).days
                                }),
                                source_documents_json=json.dumps([{
                                    "document_id": f.document_id,
                                    "filename": doc.filename if doc else "Unknown",
                                    "page_number": f.page_number,
                                    "raw_value": f.raw_value
                                }])
                            )
                            new_findings.append(finding)
                    except ValueError:
                        pass

        # -------------------------------------------------------------
        # Rule 5: CR-DUP-005 (Exact Duplicate Document)
        # -------------------------------------------------------------
        if "CR-DUP-005" in rules:
            r = rules["CR-DUP-005"]
            duplicate_docs = [d for d in docs if d.is_duplicate]
            for d in duplicate_docs:
                orig_doc = next((od for od in docs if od.id == d.duplicate_of_id), None)
                orig_name = orig_doc.filename if orig_doc else "previous upload"
                finding = VerificationFinding(
                    application_id=app.id,
                    rule_id=r.id,
                    rule_code=r.rule_code,
                    title="Exact Duplicate Document Uploaded",
                    description=f"File '{d.filename}' has identical SHA-256 hash ({d.sha256_hash[:12]}...) to '{orig_name}'. Redundant upload identified for reviewer hygiene.",
                    severity=r.severity,
                    review_status="open",
                    conflicting_values_json=json.dumps({
                        "duplicate_filename": d.filename,
                        "original_filename": orig_name,
                        "sha256_hash": d.sha256_hash
                    }),
                    source_documents_json=json.dumps([
                        {"document_id": d.id, "filename": d.filename},
                        {"document_id": orig_doc.id if orig_doc else None, "filename": orig_name}
                    ])
                )
                new_findings.append(finding)

        # -------------------------------------------------------------
        # Rule 6: CR-QUAL-006 (Scan Quality / Low Confidence)
        # -------------------------------------------------------------
        if "CR-QUAL-006" in rules:
            r = rules["CR-QUAL-006"]
            for d in docs:
                if d.image_quality_score < 0.70 or d.extraction_status == "low_confidence":
                    finding = VerificationFinding(
                        application_id=app.id,
                        rule_id=r.id,
                        rule_code=r.rule_code,
                        title="Low Quality Scan / Unassisted Extraction",
                        description=f"Document '{d.filename}' exhibited optical degradation (quality score: {d.image_quality_score}). Routed to Manual Review Queue for human validation.",
                        severity=r.severity,
                        review_status="open",
                        conflicting_values_json=json.dumps({
                            "image_quality_score": d.image_quality_score,
                            "extraction_method": d.extraction_method,
                            "extraction_status": d.extraction_status
                        }),
                        source_documents_json=json.dumps([{"document_id": d.id, "filename": d.filename}])
                    )
                    new_findings.append(finding)

        # Save findings
        for f in new_findings:
            db.add(f)
        db.commit()

        # Recalculate application status and risk score
        all_findings = db.query(VerificationFinding).filter(VerificationFinding.application_id == application_id).all()
        open_findings = [f for f in all_findings if f.review_status in ["open", "in_review", "escalated"]]
        
        # Risk score calculation
        score = 0.0
        for f in open_findings:
            if f.severity == "high":
                score += 35.0
            elif f.severity == "medium":
                score += 15.0
            elif f.severity == "low":
                score += 5.0
        app.risk_score = min(100.0, round(score, 1))

        if not open_findings and docs:
            app.status = "verified_clean"
        elif any(f.severity == "high" for f in open_findings):
            app.status = "verified_with_findings"
        elif any(f.severity in ["medium", "low"] for f in open_findings):
            app.status = "needs_review"
        elif not docs:
            app.status = "draft"
        else:
            app.status = "in_review"

        db.commit()
        db.refresh(app)

        # Audit event
        log_audit_event(
            db=db,
            event_type="rule_executed",
            actor=actor,
            details={
                "application_id": application_id,
                "findings_generated": len(new_findings),
                "total_open_findings": len(open_findings),
                "risk_score": app.risk_score,
                "status": app.status
            }
        )

        return new_findings
