import datetime
import uuid
from sqlalchemy import Column, String, Integer, Float, Boolean, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class Reviewer(Base):
    __tablename__ = "reviewers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(128), nullable=False)
    email = Column(String(128), unique=True, nullable=False)
    role = Column(String(64), default="Compliance Officer")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Application(Base):
    __tablename__ = "applications"

    id = Column(String(64), primary_key=True)  # e.g., APP-2026-001 or UUID
    application_number = Column(String(64), index=True, nullable=False)
    institution_name = Column(String(256), nullable=False)
    institution_id = Column(String(64), index=True, nullable=False)
    academic_year = Column(String(32), default="2026-2027")
    course_programme = Column(String(256), nullable=True)
    approved_intake = Column(Integer, nullable=True)
    status = Column(String(32), default="draft")  # draft, in_review, verified_clean, verified_with_findings, needs_review
    risk_score = Column(Float, default=0.0)  # 0 to 100
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    documents = relationship("Document", back_populates="application", cascade="all, delete-orphan")
    fields = relationship("ExtractedField", back_populates="application", cascade="all, delete-orphan")
    findings = relationship("VerificationFinding", back_populates="application", cascade="all, delete-orphan")

class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    application_id = Column(String(64), ForeignKey("applications.id"), nullable=False)
    filename = Column(String(256), nullable=False)
    file_path = Column(String(512), nullable=False)
    document_type = Column(String(64), nullable=False)  # approval_letter, affiliation_certificate, building_safety_certificate, land_affidavit, faculty_list, other
    mime_type = Column(String(64), default="application/pdf")
    file_size = Column(Integer, default=0)
    sha256_hash = Column(String(64), index=True, nullable=False)
    is_duplicate = Column(Boolean, default=False)
    duplicate_of_id = Column(String(36), nullable=True)
    page_count = Column(Integer, default=1)
    extraction_status = Column(String(32), default="pending")  # pending, completed, failed, low_confidence
    extraction_method = Column(String(64), default="pymupdf_digital")  # pymupdf_digital, paddleocr_scanned, fallback_ocr
    image_quality_score = Column(Float, default=1.0)  # 0.0 to 1.0 (Laplacian blur/contrast score)
    ocr_confidence = Column(Float, default=1.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    application = relationship("Application", back_populates="documents")
    fields = relationship("ExtractedField", back_populates="document", cascade="all, delete-orphan")

class ExtractedField(Base):
    __tablename__ = "extracted_fields"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    document_id = Column(String(36), ForeignKey("documents.id"), nullable=False)
    application_id = Column(String(64), ForeignKey("applications.id"), nullable=False)
    field_name = Column(String(64), index=True, nullable=False)  # institution_name, institution_id, approved_intake, etc.
    raw_value = Column(Text, nullable=True)
    normalized_value = Column(Text, nullable=True)
    page_number = Column(Integer, default=1)
    bbox_json = Column(Text, nullable=True)  # JSON [x0, y0, x1, y1] normalized coords
    confidence = Column(Float, default=1.0)
    extraction_method = Column(String(64), default="pymupdf_digital")
    is_corrected = Column(Boolean, default=False)
    corrected_value = Column(Text, nullable=True)
    corrected_by = Column(String(128), nullable=True)
    correction_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    document = relationship("Document", back_populates="fields")
    application = relationship("Application", back_populates="fields")

class ComplianceRule(Base):
    __tablename__ = "compliance_rules"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    rule_code = Column(String(32), unique=True, nullable=False)  # CR-REQ-001, CR-INTAKE-002, etc.
    name = Column(String(128), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(64), nullable=False)  # required_document, cross_document_consistency, validity_expiry, scan_quality, duplicate_detection
    severity = Column(String(32), default="medium")  # high, medium, low, info
    parameters_json = Column(Text, default="{}")
    is_enabled = Column(Boolean, default=True)
    citation_reference = Column(String(256), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class VerificationFinding(Base):
    __tablename__ = "verification_findings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    application_id = Column(String(64), ForeignKey("applications.id"), nullable=False)
    rule_id = Column(String(36), ForeignKey("compliance_rules.id"), nullable=True)
    rule_code = Column(String(32), nullable=False)
    title = Column(String(256), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String(32), default="medium")  # high, medium, low, info
    review_status = Column(String(32), default="open")  # open, in_review, resolved, escalated
    conflicting_values_json = Column(Text, default="{}")  # Details of conflicting records
    source_documents_json = Column(Text, default="[]")  # Document IDs, filenames, page numbers
    resolution_notes = Column(Text, nullable=True)
    resolved_by = Column(String(128), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    application = relationship("Application", back_populates="findings")

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    sequence_number = Column(Integer, unique=True, index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    event_type = Column(String(64), index=True, nullable=False)  # application_created, document_uploaded, ocr_extracted, field_corrected, rule_executed, finding_resolved, report_generated, demo_reset
    actor = Column(String(128), default="System")
    details_json = Column(Text, default="{}")
    prev_hash = Column(String(64), nullable=False)
    current_hash = Column(String(64), nullable=False)

    __table_args__ = (
        Index("idx_audit_seq_hash", "sequence_number", "current_hash"),
    )
