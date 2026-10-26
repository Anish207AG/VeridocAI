import io
from pathlib import Path

def test_document_upload_and_duplicate_detection(client):
    # 1. Create an application
    app_res = client.post("/api/applications", json={
        "application_number": "APP-TEST-DUP-01",
        "institution_name": "Duplicate Test Institute",
        "institution_id": "INST-DUP-01"
    })
    app_id = app_res.json()["id"]

    # 2. Upload sample PDF
    sample_pdf_path = Path(__file__).resolve().parent.parent / "sample_data" / "scenario_a_approval.pdf"
    assert sample_pdf_path.exists(), "Sample PDF should exist"

    with open(sample_pdf_path, "rb") as f:
        file_bytes = f.read()

    upload_res1 = client.post(
        "/api/documents/upload",
        data={"application_id": app_id, "document_type": "approval_letter"},
        files={"file": ("scenario_a_approval.pdf", io.BytesIO(file_bytes), "application/pdf")}
    )
    assert upload_res1.status_code == 200
    doc1 = upload_res1.json()
    assert doc1["is_duplicate"] is False
    assert doc1["sha256_hash"] is not None

    # 3. Upload same exact file again -> duplicate detection
    upload_res2 = client.post(
        "/api/documents/upload",
        data={"application_id": app_id, "document_type": "approval_letter"},
        files={"file": ("scenario_a_approval_copy.pdf", io.BytesIO(file_bytes), "application/pdf")}
    )
    assert upload_res2.status_code == 200
    doc2 = upload_res2.json()
    assert doc2["is_duplicate"] is True
    assert doc2["duplicate_of_id"] == doc1["id"]
    assert doc2["sha256_hash"] == doc1["sha256_hash"]
