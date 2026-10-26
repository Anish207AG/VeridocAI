import datetime
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field

# Reviewer Schemas
class ReviewerBase(BaseModel):
    name: str
    email: str
    role: str = "Compliance Officer"

class ReviewerOut(ReviewerBase):
    id: str
    created_at: datetime.datetime
    class Config:
        from_attributes = True

# Extracted Field Schemas
class ExtractedFieldBase(BaseModel):
    field_name: str
    raw_value: Optional[str] = None
    normalized_value: Optional[str] = None
    page_number: int = 1
    bbox_json: Optional[str] = None
    confidence: float = 1.0
    extraction_method: str = "pymupdf_digital"

class ExtractedFieldCorrection(BaseModel):
    corrected_value: str
    corrected_by: str = "Reviewer"
    correction_reason: Optional[str] = "Manual verification correction"

class ExtractedFieldOut(ExtractedFieldBase):
    id: str
    document_id: str
    application_id: str
    is_corrected: bool = False
    corrected_value: Optional[str] = None
    corrected_by: Optional[str] = None
    correction_reason: Optional[str] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    class Config:
        from_attributes = True

# Document Schemas
class DocumentBase(BaseModel):
    filename: str
    document_type: str
    mime_type: str = "application/pdf"
    file_size: int = 0
    sha256_hash: str
    is_duplicate: bool = False
    duplicate_of_id: Optional[str] = None
    page_count: int = 1
    extraction_status: str = "pending"
    extraction_method: str = "pymupdf_digital"
    image_quality_score: float = 1.0
    ocr_confidence: float = 1.0

class DocumentOut(DocumentBase):
    id: str
    application_id: str
    created_at: datetime.datetime
    fields: List[ExtractedFieldOut] = []
    class Config:
        from_attributes = True

# Compliance Rule Schemas
class ComplianceRuleBase(BaseModel):
    rule_code: str
    name: str
    description: str
    category: str
    severity: str = "medium"
    parameters_json: str = "{}"
    is_enabled: bool = True
    citation_reference: Optional[str] = None

class ComplianceRuleCreate(ComplianceRuleBase):
    pass

class ComplianceRuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    parameters_json: Optional[str] = None
    is_enabled: Optional[bool] = None
    citation_reference: Optional[str] = None

class ComplianceRuleOut(ComplianceRuleBase):
    id: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    class Config:
        from_attributes = True

# Verification Finding Schemas
class VerificationFindingBase(BaseModel):
    rule_code: str
    title: str
    description: str
    severity: str = "medium"
    review_status: str = "open"
    conflicting_values_json: str = "{}"
    source_documents_json: str = "[]"

class FindingResolveRequest(BaseModel):
    review_status: str = "resolved"  # open, in_review, resolved, escalated
    resolution_notes: str
    resolved_by: str = "Compliance Officer"

class VerificationFindingOut(VerificationFindingBase):
    id: str
    application_id: str
    rule_id: Optional[str] = None
    resolution_notes: Optional[str] = None
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime
    class Config:
        from_attributes = True

# Application Schemas
class ApplicationBase(BaseModel):
    application_number: str
    institution_name: str
    institution_id: str
    academic_year: str = "2026-2027"
    course_programme: Optional[str] = None
    approved_intake: Optional[int] = None
    notes: Optional[str] = None

class ApplicationCreate(ApplicationBase):
    pass

class ApplicationUpdate(BaseModel):
    institution_name: Optional[str] = None
    institution_id: Optional[str] = None
    academic_year: Optional[str] = None
    course_programme: Optional[str] = None
    approved_intake: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class ApplicationOut(ApplicationBase):
    id: str
    status: str
    risk_score: float
    created_at: datetime.datetime
    updated_at: datetime.datetime
    documents: List[DocumentOut] = []
    findings: List[VerificationFindingOut] = []
    class Config:
        from_attributes = True

# Audit Event Schemas
class AuditEventOut(BaseModel):
    id: str
    sequence_number: int
    timestamp: datetime.datetime
    event_type: str
    actor: str
    details_json: str
    prev_hash: str
    current_hash: str
    class Config:
        from_attributes = True

class AuditVerificationResult(BaseModel):
    is_valid: bool
    total_events: int
    first_verified_sequence: Optional[int] = None
    last_verified_sequence: Optional[int] = None
    tampered_sequence: Optional[int] = None
    details: str
    checked_at: datetime.datetime

# Dashboard & Graph Schemas
class DashboardStats(BaseModel):
    total_applications: int
    clean_applications: int
    applications_with_findings: int
    under_review_applications: int
    total_documents: int
    total_duplicates_detected: int
    total_findings: int
    findings_by_severity: Dict[str, int]
    review_queue_count: int
    audit_chain_valid: bool
    audit_event_count: int

class GraphNode(BaseModel):
    id: str
    label: str
    type: str  # application, document, claim, rule, finding
    severity: Optional[str] = None
    status: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

class GraphEdge(BaseModel):
    source: str
    target: str
    relationship: str  # contains, claims, evaluated_by, contradicts, violates

class GraphData(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
