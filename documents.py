import os
import shutil
import hashlib
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Application, Document, ExtractedField
from app.schemas import DocumentOut
from app.config import UPLOADS_DIR
from app.services.extractor import DocumentExtractor
from app.services.audit_service import log_audit_event
from app.services.rules_engine import VerificationEngine

router = APIRouter(prefix="/api/documents", tags=["Documents"])

@router.get("", response_model=List[DocumentOut])
def list_documents(application_id: Optional[str] = None, db: Session = Depends(get_db)):
    """Lists all documents, optionally filtered by application_id."""
    query = db.query(Document)
    if application_id:
        query = query.filter(Document.application_id == application_id)
    return query.order_by(Document.created_at.desc()).all()

@router.post("/upload", response_model=DocumentOut)
async def upload_document(
    application_id: str = Form(...),
    document_type: str = Form(...),  # approval_letter, affiliation_certificate, building_safety_certificate, land_affidavit, faculty_list, other
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Uploads a document, computes SHA-256 hash for duplicate detection,
    performs PyMuPDF extraction, saves extracted fields, and triggers verification.
    """
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    # Read content to compute hash
    content = await file.read()
    file_size = len(content)
    sha256_hash = hashlib.sha256(content).hexdigest()

    # Check for exact duplicates across system
    existing_duplicate = db.query(Document).filter(Document.sha256_hash == sha256_hash).first()
    is_duplicate = existing_duplicate is not None
    duplicate_of_id = existing_duplicate.id if existing_duplicate else None

    # Save to disk
    sanitized_filename = f"{application_id}_{hashlib.md5(content).hexdigest()[:8]}_{file.filename}"
    save_path = str(UPLOADS_DIR / sanitized_filename)
    with open(save_path, "wb") as f:
        f.write(content)

    # Extract text, quality, and fields via PyMuPDF extractor
    extraction_result = DocumentExtractor.extract_from_file(save_path)

    # Create Document record
    doc = Document(
        application_id=application_id,
        filename=file.filename,
        file_path=save_path,
        document_type=document_type,
        mime_type=file.content_type or "application/pdf",
        file_size=file_size,
        sha256_hash=sha256_hash,
        is_duplicate=is_duplicate,
        duplicate_of_id=duplicate_of_id,
        page_count=extraction_result["page_count"],
        extraction_status=extraction_result["extraction_status"],
        extraction_method=extraction_result["extraction_method"],
        image_quality_score=extraction_result["image_quality_score"],
        ocr_confidence=extraction_result["ocr_confidence"]
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Save extracted fields
    created_fields = []
    for f_data in extraction_result["fields"]:
        ef = ExtractedField(
            document_id=doc.id,
            application_id=application_id,
            field_name=f_data["field_name"],
            raw_value=f_data["raw_value"],
            normalized_value=f_data["normalized_value"],
            page_number=f_data["page_number"],
            bbox_json=f_data["bbox_json"],
            confidence=f_data["confidence"],
            extraction_method=f_data["extraction_method"]
        )
        db.add(ef)
        created_fields.append(ef)
    db.commit()

    # Log audit event for upload & hash
    log_audit_event(
        db=db,
        event_type="document_uploaded",
        actor="Officer",
        details={
            "application_id": application_id,
            "document_id": doc.id,
            "filename": file.filename,
            "sha256": sha256_hash,
            "is_duplicate": is_duplicate,
            "duplicate_of": existing_duplicate.filename if existing_duplicate else None
        }
    )

    # Log audit event for OCR/extraction
    log_audit_event(
        db=db,
        event_type="ocr_extracted",
        actor="Extraction Engine",
        details={
            "document_id": doc.id,
            "extraction_method": doc.extraction_method,
            "fields_count": len(created_fields),
            "quality_score": doc.image_quality_score
        }
    )

    # Re-run automated compliance verification
    VerificationEngine.verify_application(db, application_id)

    db.refresh(doc)
    return doc

@router.get("/{id}", response_model=DocumentOut)
def get_document(id: str, db: Session = Depends(get_db)):
    """Fetches document metadata and extracted fields."""
    doc = db.query(Document).filter(Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

@router.get("/{id}/file")
def get_document_file(id: str, db: Session = Depends(get_db)):
    """Serves the raw PDF/file stream for browser and PDF.js viewing."""
    doc = db.query(Document).filter(Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    return FileResponse(doc.file_path, media_type=doc.mime_type, filename=doc.filename)

@router.delete("/{id}")
def delete_document(id: str, db: Session = Depends(get_db)):
    """Deletes a document and triggers re-verification."""
    doc = db.query(Document).filter(Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    app_id = doc.application_id
    doc_name = doc.filename
    
    # Remove file from disk if exists
    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception:
            pass

    db.delete(doc)
    db.commit()

    log_audit_event(
        db=db,
        event_type="document_deleted",
        actor="Officer",
        details={"application_id": app_id, "document_id": id, "filename": doc_name}
    )

    # Re-run verification
    VerificationEngine.verify_application(db, app_id)

    return {"message": "Document deleted successfully"}
