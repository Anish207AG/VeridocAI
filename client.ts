const API_BASE = '/api';

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('/') ? `${API_BASE}${endpoint}` : `${API_BASE}/${endpoint}`;
  
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || JSON.stringify(errJson);
    } catch {
      // ignore
    }
    throw new Error(errorDetail || `API Error: ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Applications
  getApplications: (params?: { status?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.append('status', params.status);
    if (params?.search) q.append('search', params.search);
    return apiFetch<any[]>(`/applications?${q.toString()}`);
  },
  getApplication: (id: string) => apiFetch<any>(`/applications/${id}`),
  createApplication: (data: any) => apiFetch<any>('/applications', { method: 'POST', body: JSON.stringify(data) }),
  updateApplication: (id: string, data: any) => apiFetch<any>(`/applications/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteApplication: (id: string) => apiFetch<any>(`/applications/${id}`, { method: 'DELETE' }),
  getStats: () => apiFetch<any>('/applications/stats'),

  // Documents
  uploadDocument: (applicationId: string, documentType: string, file: File) => {
    const fd = new FormData();
    fd.append('application_id', applicationId);
    fd.append('document_type', documentType);
    fd.append('file', file);
    return apiFetch<any>('/documents/upload', { method: 'POST', body: fd });
  },
  getDocument: (id: string) => apiFetch<any>(`/documents/${id}`),
  deleteDocument: (id: string) => apiFetch<any>(`/documents/${id}`, { method: 'DELETE' }),

  // Fields
  getFields: (params?: { application_id?: string; document_id?: string }) => {
    const q = new URLSearchParams();
    if (params?.application_id) q.append('application_id', params.application_id);
    if (params?.document_id) q.append('document_id', params.document_id);
    return apiFetch<any[]>(`/fields?${q.toString()}`);
  },
  correctField: (id: string, correctedValue: string, reason?: string, by?: string) =>
    apiFetch<any>(`/fields/${id}/correct`, {
      method: 'POST',
      body: JSON.stringify({
        corrected_value: correctedValue,
        correction_reason: reason || 'Manual review verification',
        corrected_by: by || 'Officer',
      }),
    }),

  // Verification & Findings
  triggerVerification: (applicationId: string) =>
    apiFetch<any[]>(`/verification/verify/${applicationId}`, { method: 'POST' }),
  getFindings: (params?: { application_id?: string; severity?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.application_id) q.append('application_id', params.application_id);
    if (params?.severity) q.append('severity', params.severity);
    if (params?.status) q.append('status', params.status);
    return apiFetch<any[]>(`/verification/findings?${q.toString()}`);
  },
  resolveFinding: (id: string, reviewStatus: string, notes: string, by?: string) =>
    apiFetch<any>(`/verification/findings/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({
        review_status: reviewStatus,
        resolution_notes: notes,
        resolved_by: by || 'Officer',
      }),
    }),

  // Graph
  getGraph: (applicationId: string) => apiFetch<any>(`/graph/${applicationId}`),

  // Review Queue
  getReviewQueue: () => apiFetch<any>('/review-queue'),

  // Compliance Rules
  getRules: () => apiFetch<any[]>('/rules'),
  createRule: (rule: any) => apiFetch<any>('/rules', { method: 'POST', body: JSON.stringify(rule) }),
  updateRule: (id: string, updates: any) => apiFetch<any>(`/rules/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
  toggleRule: (id: string) => apiFetch<any>(`/rules/${id}/toggle`, { method: 'POST' }),
  deleteRule: (id: string) => apiFetch<any>(`/rules/${id}`, { method: 'DELETE' }),

  // Audit Trail
  getAuditEvents: (eventType?: string) => {
    const q = new URLSearchParams();
    if (eventType) q.append('event_type', eventType);
    return apiFetch<any[]>(`/audit?${q.toString()}`);
  },
  verifyAuditChain: () => apiFetch<any>('/audit/verify'),

  // Reports
  getReports: () => apiFetch<any[]>('/reports'),
  generateReport: (applicationId: string) =>
    apiFetch<any>(`/reports/generate/${applicationId}`, { method: 'POST' }),

  // Demo
  loadScenario: (scenarioKey: string) =>
    apiFetch<any>(`/demo/load-scenario/${scenarioKey}`, { method: 'POST' }),
  resetDemoData: () =>
    apiFetch<any>('/demo/reset', { method: 'POST', body: JSON.stringify({ confirm: true }) }),

  // Verification Centre Metrics
  getVerificationCentreMetrics: () => apiFetch<any>('/verification/centre-metrics'),

  // Health
  getHealth: () => apiFetch<any>('/health'),
};
