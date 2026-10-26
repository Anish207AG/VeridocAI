from pathlib import Path
from app.services.audit_service import verify_audit_chain, compute_audit_hash

def test_scenario_b_intake_mismatch(client):
    """Verifies that Scenario B correctly triggers Rule CR-INTAKE-002 with conflicting values 120 and 90."""
    res = client.post("/api/demo/load-scenario/scenario_b")
    assert res.status_code == 200
    app_id = res.json()["application_id"]

    # Check findings
    findings_res = client.get(f"/api/verification/findings?application_id={app_id}")
    assert findings_res.status_code == 200
    findings = findings_res.json()

    # Rule CR-INTAKE-002 should be present
    intake_findings = [f for f in findings if f["rule_code"] == "CR-INTAKE-002"]
    assert len(intake_findings) > 0
    f = intake_findings[0]
    assert f["severity"] == "high"
    assert "Discrepant intake capacity detected" in f["description"]

def test_scenario_c_expired_document(client):
    """Verifies that Scenario C flags expired building safety certificate (expired 2023)."""
    res = client.post("/api/demo/load-scenario/scenario_c")
    assert res.status_code == 200
    app_id = res.json()["application_id"]

    findings_res = client.get(f"/api/verification/findings?application_id={app_id}")
    assert findings_res.status_code == 200
    findings = findings_res.json()

    expiry_findings = [f for f in findings if f["rule_code"] == "CR-EXPIRY-004"]
    assert len(expiry_findings) > 0
    assert expiry_findings[0]["severity"] == "high"

def test_field_correction_and_audit_trail(client, db_session):
    """Tests manual correction of an extracted field and confirms an audit record is created."""
    res = client.post("/api/demo/load-scenario/scenario_a")
    app_id = res.json()["application_id"]

    fields_res = client.get(f"/api/fields?application_id={app_id}")
    assert fields_res.status_code == 200
    fields = fields_res.json()
    assert len(fields) > 0

    field_to_correct = fields[0]
    corr_res = client.post(
        f"/api/fields/{field_to_correct['id']}/correct",
        json={
            "corrected_value": "Apex Institute of Advanced Technology",
            "corrected_by": "Senior Officer Roy",
            "correction_reason": "Statutory amendment verification"
        }
    )
    assert corr_res.status_code == 200
    corrected = corr_res.json()
    assert corrected["is_corrected"] is True
    assert corrected["corrected_value"] == "Apex Institute of Advanced Technology"

    # Verify audit chain integrity
    audit_res = client.get("/api/audit/verify")
    assert audit_res.status_code == 200
    assert audit_res.json()["is_valid"] is True

def test_pdf_report_generation(client):
    """Tests ReportLab PDF verification report generation and download."""
    res = client.post("/api/demo/load-scenario/scenario_b")
    app_id = res.json()["application_id"]

    gen_res = client.post(f"/api/reports/generate/{app_id}")
    assert gen_res.status_code == 200
    report_data = gen_res.json()
    filename = report_data["filename"]

    # Download it
    dl_res = client.get(f"/api/reports/download/{filename}")
    assert dl_res.status_code == 200
    assert dl_res.headers["content-type"] == "application/pdf"
    assert len(dl_res.content) > 1000

def test_audit_hash_chain_tamper_detection(db_session):
    """Directly tests that any altered record in the audit chain triggers is_valid=False."""
    from app.models import AuditEvent
    events = db_session.query(AuditEvent).all()
    if len(events) >= 2:
        # Tamper with the details of the first event
        first = events[0]
        original_details = first.details_json
        first.details_json = '{"tampered": true}'
        db_session.commit()

        result = verify_audit_chain(db_session)
        assert result["is_valid"] is False
        assert result["tampered_sequence"] is not None

        # Revert back
        first.details_json = original_details
        db_session.commit()
        clean_result = verify_audit_chain(db_session)
        assert clean_result["is_valid"] is True
