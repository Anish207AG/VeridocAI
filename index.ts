export interface Application {
  id: string;
  application_number: string;
  institution_name: string;
  institution_id: string;
  academic_year: string;
  course_programme?: string;
  approved_intake?: number;
  status: 'draft' | 'in_review' | 'verified_clean' | 'verified_with_findings' | 'needs_review';
  risk_score: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  documents?: Document[];
  findings?: VerificationFinding[];
}

export interface Document {
  id: string;
  application_id: string;
  filename: string;
  file_path: string;
  document_type: string;
  mime_type: string;
  file_size: number;
  sha256_hash: string;
  is_duplicate: boolean;
  duplicate_of_id?: string;
  page_count: number;
  extraction_status: 'pending' | 'completed' | 'failed' | 'low_confidence';
  extraction_method: string;
  image_quality_score: number;
  ocr_confidence: number;
  created_at: string;
  fields?: ExtractedField[];
}

export interface ExtractedField {
  id: string;
  document_id: string;
  application_id: string;
  field_name: string;
  raw_value?: string;
  normalized_value?: string;
  page_number: number;
  bbox_json?: string;
  confidence: number;
  extraction_method: string;
  is_corrected: boolean;
  corrected_value?: string;
  corrected_by?: string;
  correction_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface ComplianceRule {
  id: string;
  rule_code: string;
  name: string;
  description: string;
  category: string;
  severity: 'high' | 'medium' | 'low' | 'info';
  parameters_json: string;
  is_enabled: boolean;
  citation_reference?: string;
  created_at: string;
  updated_at: string;
}

export interface VerificationFinding {
  id: string;
  application_id: string;
  rule_id?: string;
  rule_code: string;
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low' | 'info';
  review_status: 'open' | 'in_review' | 'resolved' | 'escalated';
  conflicting_values_json: string;
  source_documents_json: string;
  resolution_notes?: string;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}

export interface AuditEvent {
  id: string;
  sequence_number: number;
  timestamp: string;
  event_type: string;
  actor: string;
  details_json: string;
  prev_hash: string;
  current_hash: string;
}

export interface AuditVerificationResult {
  is_valid: boolean;
  total_events: number;
  first_verified_sequence?: number;
  last_verified_sequence?: number;
  tampered_sequence?: number;
  details: string;
  checked_at: string;
}

export interface DashboardStats {
  total_applications: number;
  clean_applications: number;
  applications_with_findings: number;
  under_review_applications: number;
  total_documents: number;
  total_duplicates_detected: number;
  total_findings: number;
  findings_by_severity: {
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  review_queue_count: number;
  audit_chain_valid: boolean;
  audit_event_count: number;
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'application' | 'document' | 'claim' | 'rule' | 'finding';
  severity?: string;
  status?: string;
  details?: Record<string, any>;
}

export interface GraphEdge {
  source: string;
  target: string;
  relationship: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
