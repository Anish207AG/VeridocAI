import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Application, Document, ExtractedField, VerificationFinding } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { EvidenceGraph } from '../components/graph/EvidenceGraph';
import {
  ArrowLeft,
  FileText,
  Upload,
  AlertTriangle,
  CheckCircle2,
  GitBranch,
  FileCheck,
  Download,
  Play,
  RotateCw,
  ExternalLink,
  Edit2,
  Trash2,
  Copy,
  Info
} from 'lucide-react';

export const ApplicationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [app, setApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'fields' | 'findings' | 'graph'>('overview');
  const [graphData, setGraphData] = useState<any>(null);

  // Field Correction Modal State
  const [editingField, setEditingField] = useState<ExtractedField | null>(null);
  const [correctedVal, setCorrectedVal] = useState<string>('');
  const [correctionReason, setCorrectionReason] = useState<string>('');
  const [savingCorrection, setSavingCorrection] = useState<boolean>(false);

  // Finding Resolution Modal State
  const [resolvingFinding, setResolvingFinding] = useState<VerificationFinding | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState<string>('resolved');
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const [savingResolution, setSavingResolution] = useState<boolean>(false);

  // Document Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<string>('approval_letter');
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Action status message
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [generatingReport, setGeneratingReport] = useState<boolean>(false);

  const fetchApplication = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await api.getApplication(id);
      setApp(data);
      if (activeTab === 'graph') {
        const gData = await api.getGraph(id);
        setGraphData(gData);
      }
    } catch (err) {
      console.error('Failed to load application:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplication();
  }, [id, activeTab]);

  const handleTriggerVerification = async () => {
    if (!id) return;
    try {
      setVerifying(true);
      await api.triggerVerification(id);
      setStatusMessage('Cross-document compliance verification completed.');
      await fetchApplication();
    } catch (err: any) {
      alert(`Verification error: ${err.message}`);
    } finally {
      setVerifying(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!id) return;
    try {
      setGeneratingReport(true);
      const res = await api.generateReport(id);
      setStatusMessage(`Report compiled: ${res.filename}`);
      window.open(res.download_url, '_blank');
    } catch (err: any) {
      alert(`Report generation error: ${err.message}`);
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !id) return;
    try {
      setUploading(true);
      setUploadError(null);
      await api.uploadDocument(id, uploadType, uploadFile);
      setUploadFile(null);
      setStatusMessage('Document uploaded, extracted, and verified.');
      await fetchApplication();
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveCorrection = async () => {
    if (!editingField) return;
    try {
      setSavingCorrection(true);
      await api.correctField(editingField.id, correctedVal, correctionReason, 'Officer Roy');
      setEditingField(null);
      setStatusMessage('Field manually corrected and logged to audit hash chain.');
      await fetchApplication();
    } catch (err: any) {
      alert(`Correction error: ${err.message}`);
    } finally {
      setSavingCorrection(false);
    }
  };

  const handleSaveResolution = async () => {
    if (!resolvingFinding) return;
    try {
      setSavingResolution(true);
      await api.resolveFinding(resolvingFinding.id, resolutionStatus, resolutionNotes, 'Officer Roy');
      setResolvingFinding(null);
      setStatusMessage('Finding status updated and recorded in audit log.');
      await fetchApplication();
    } catch (err: any) {
      alert(`Resolution error: ${err.message}`);
    } finally {
      setSavingResolution(false);
    }
  };

  if (loading && !app) {
    return (
      <div className="p-12 text-center text-slate-400">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        Loading institutional dossier...
      </div>
    );
  }

  if (!app) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>Application not found.</p>
        <Link to="/applications" className="text-blue-600 underline text-xs mt-2 block">
          &larr; Return to Applications
        </Link>
      </div>
    );
  }

  const docs = app.documents || [];
  const findings = app.findings || [];
  const allFields = docs.flatMap((d) => d.fields || []);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Link to="/applications" className="text-slate-400 hover:text-slate-700">
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {app.application_number}
              </span>
              <Badge
                variant={
                  app.status === 'verified_clean'
                    ? 'success'
                    : app.status === 'verified_with_findings'
                    ? 'danger'
                    : app.status === 'needs_review'
                    ? 'warning'
                    : 'neutral'
                }
              >
                {app.status.replace(/_/g, ' ').toUpperCase()}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{app.institution_name}</h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span>ID: <strong className="text-slate-800 font-mono">{app.institution_id}</strong></span>
              <span>&bull;</span>
              <span>Session: <strong className="text-slate-800">{app.academic_year}</strong></span>
              <span>&bull;</span>
              <span>Course: <strong className="text-slate-800">{app.course_programme || 'General'}</strong></span>
              <span>&bull;</span>
              <span>Approved Intake: <strong className="text-slate-800">{app.approved_intake ?? 'N/A'}</strong></span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleTriggerVerification}
              disabled={verifying}
              className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <RotateCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
              <span>{verifying ? 'Re-Verifying...' : 'Re-Run Compliance Engine'}</span>
            </button>
            <button
              onClick={handleGenerateReport}
              disabled={generatingReport}
              className="flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{generatingReport ? 'Compiling PDF...' : 'Download Official Report (PDF)'}</span>
            </button>
          </div>
        </div>

        {statusMessage && (
          <div className="mt-4 p-2.5 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-lg flex items-center justify-between">
            <span>{statusMessage}</span>
            <button onClick={() => setStatusMessage(null)} className="text-blue-500 text-[10px] font-bold">Dismiss</button>
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 bg-white px-6 rounded-t-xl">
        <nav className="flex space-x-8 text-xs font-semibold">
          {[
            { key: 'overview', label: 'Dossier Overview' },
            { key: 'documents', label: `Documents (${docs.length})` },
            { key: 'fields', label: `Extracted Claims (${allFields.length})` },
            { key: 'findings', label: `Compliance Findings (${findings.length})` },
            { key: 'graph', label: 'Claim–Evidence Graph' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-4 border-b-2 font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* TAB CONTENT: 1. OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* Risk & Compliance Summary */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Compliance Integrity Assessment</h3>
              <div className="flex items-center space-x-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
                <div
                  className={`text-3xl font-extrabold font-mono ${
                    app.risk_score > 30 ? 'text-rose-600' : app.risk_score > 0 ? 'text-amber-600' : 'text-emerald-600'
                  }`}
                >
                  {app.risk_score} <span className="text-xs text-slate-400 font-normal">/ 100</span>
                </div>
                <div className="text-xs text-slate-600 leading-relaxed">
                  {app.risk_score === 0 ? (
                    <span className="text-emerald-700 font-medium">
                      All cross-document integrity checks and regulatory compliance rules satisfied. No discrepancies.
                    </span>
                  ) : (
                    <span>
                      Detected <strong>{findings.length} inconsistency flag(s)</strong> across uploaded documents. Review findings tab for evidence-linked reconciliation.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Findings Snapshot */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900">Active Discrepancies &amp; Findings</h3>
                <button
                  onClick={() => setActiveTab('findings')}
                  className="text-xs text-blue-600 hover:underline"
                >
                  View All Findings &rarr;
                </button>
              </div>
              {findings.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">Clean filing. No active findings.</p>
              ) : (
                <div className="space-y-2">
                  {findings.map((f) => (
                    <div
                      key={f.id}
                      className="p-3 rounded-lg border border-slate-200 flex items-start justify-between bg-slate-50/50"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={f.severity === 'high' ? 'danger' : f.severity === 'medium' ? 'warning' : 'info'} size="sm">
                            {f.severity.toUpperCase()}
                          </Badge>
                          <span className="font-semibold text-xs text-slate-900">{f.title}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1">{f.description}</p>
                      </div>
                      <Badge variant={f.review_status === 'resolved' ? 'success' : 'neutral'} size="sm">
                        {f.review_status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Upload Document Quick Widget */}
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-2">Upload Supporting Document</h3>
              <p className="text-xs text-slate-500 mb-4">
                Add PDF approvals, affiliations, or safety clearances for automated extraction.
              </p>

              {uploadError && (
                <div className="mb-3 p-2 bg-rose-50 border border-rose-200 rounded text-[11px] text-rose-700">
                  {uploadError}
                </div>
              )}

              <form onSubmit={handleUploadSubmit} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Document Category</label>
                  <select
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white"
                  >
                    <option value="approval_letter">Regulatory Approval Letter</option>
                    <option value="affiliation_certificate">University Affiliation Certificate</option>
                    <option value="building_safety_certificate">Building Fire &amp; Safety Certificate</option>
                    <option value="land_affidavit">Campus Land Affidavit</option>
                    <option value="faculty_list">Approved Faculty List</option>
                    <option value="other">Other Clearance Document</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Choose PDF / Image</label>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>

                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="w-full mt-2 flex items-center justify-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploading ? 'Processing Extraction...' : 'Upload & Verify'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 2. DOCUMENTS */}
      {activeTab === 'documents' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Uploaded Document Inventory</h3>
            <span className="text-xs text-slate-500 font-mono">{docs.length} Files</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Document Name</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Pages</th>
                  <th className="px-5 py-3">Extraction Method</th>
                  <th className="px-5 py-3">Quality Score</th>
                  <th className="px-5 py-3">SHA-256 Digest</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {docs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                      No documents uploaded yet. Use the upload widget to add files.
                    </td>
                  </tr>
                ) : (
                  docs.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/80">
                      <td className="px-5 py-3 font-medium text-slate-900 flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <div>
                          <span>{d.filename}</span>
                          {d.is_duplicate && (
                            <Badge variant="warning" size="sm" className="ml-2">
                              Exact Duplicate
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 font-medium">{d.document_type.replace(/_/g, ' ').toUpperCase()}</td>
                      <td className="px-5 py-3">{d.page_count}</td>
                      <td className="px-5 py-3 font-mono text-[11px] text-slate-500">
                        {d.extraction_method}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`font-semibold font-mono text-[11px] ${
                            d.image_quality_score < 0.7 ? 'text-amber-600' : 'text-emerald-600'
                          }`}
                        >
                          {Math.round(d.image_quality_score * 100)}%
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono text-[10px] text-slate-400" title={d.sha256_hash}>
                        {d.sha256_hash.slice(0, 16)}...
                      </td>
                      <td className="px-5 py-3 text-right space-x-2">
                        <Link
                          to={`/documents/${d.id}`}
                          className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[11px] font-medium"
                        >
                          View PDF &amp; BBoxes
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 3. EXTRACTED CLAIMS / FIELDS */}
      {activeTab === 'fields' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Extracted Claims &amp; Institutional Fields</h3>
              <p className="text-xs text-slate-500">
                Click "Correct" to manually override values; updates are recorded in the immutable audit trail.
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">{allFields.length} Claims Total</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Field Name</th>
                  <th className="px-5 py-3">Raw Value</th>
                  <th className="px-5 py-3">Normalized / Active Value</th>
                  <th className="px-5 py-3">Page</th>
                  <th className="px-5 py-3">Confidence</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {allFields.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                      No fields extracted.
                    </td>
                  </tr>
                ) : (
                  allFields.map((field) => (
                    <tr key={field.id} className="hover:bg-slate-50/80">
                      <td className="px-5 py-3 font-semibold text-slate-900">
                        {field.field_name.replace(/_/g, ' ').toUpperCase()}
                      </td>
                      <td className="px-5 py-3 text-slate-600 max-w-xs truncate">{field.raw_value || '—'}</td>
                      <td className="px-5 py-3 font-medium text-slate-900">
                        {field.is_corrected ? (
                          <span className="text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded">
                            {field.corrected_value}
                          </span>
                        ) : (
                          field.normalized_value || field.raw_value || '—'
                        )}
                      </td>
                      <td className="px-5 py-3 font-mono">Pg {field.page_number}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`font-mono text-[11px] font-semibold ${
                            field.confidence < 0.8 ? 'text-amber-600' : 'text-emerald-600'
                          }`}
                        >
                          {Math.round(field.confidence * 100)}%
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {field.is_corrected ? (
                          <Badge variant="info" size="sm">
                            Manually Corrected
                          </Badge>
                        ) : field.confidence < 0.8 ? (
                          <Badge variant="warning" size="sm">
                            Low Confidence
                          </Badge>
                        ) : (
                          <Badge variant="success" size="sm">
                            Verified
                          </Badge>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right space-x-2">
                        <button
                          onClick={() => {
                            setEditingField(field);
                            setCorrectedVal(field.corrected_value || field.normalized_value || field.raw_value || '');
                            setCorrectionReason('');
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-medium text-[11px] transition-colors"
                        >
                          Correct
                        </button>
                        <Link
                          to={`/documents/${field.document_id}`}
                          className="px-2 py-1 text-blue-600 hover:underline text-[11px]"
                        >
                          Evidence &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 4. FINDINGS */}
      {activeTab === 'findings' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Cross-Document Verification Findings</h3>
              <p className="text-xs text-slate-500">
                Rule-generated anomalies, intake capacity discrepancies, and clearance expirations.
              </p>
            </div>
            <button
              onClick={handleTriggerVerification}
              className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg"
            >
              Re-Evaluate Rules
            </button>
          </div>

          <div className="space-y-3">
            {findings.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-800">Clean Application — No Findings</h4>
                <p className="text-xs text-slate-500 mt-1">
                  All supporting documents and extracted claims passed compliance validation rules.
                </p>
              </div>
            ) : (
              findings.map((f) => (
                <div
                  key={f.id}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant={f.severity === 'high' ? 'danger' : f.severity === 'medium' ? 'warning' : 'info'}
                        >
                          {f.severity.toUpperCase()} SEVERITY
                        </Badge>
                        <span className="font-mono text-xs text-slate-500 font-semibold">{f.rule_code}</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">{f.title}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{f.description}</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Badge variant={f.review_status === 'resolved' ? 'success' : 'neutral'}>
                        {f.review_status.toUpperCase()}
                      </Badge>
                      <button
                        onClick={() => {
                          setResolvingFinding(f);
                          setResolutionStatus(f.review_status === 'resolved' ? 'in_review' : 'resolved');
                          setResolutionNotes(f.resolution_notes || '');
                        }}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded-lg"
                      >
                        Action / Resolve
                      </button>
                    </div>
                  </div>

                  {/* Conflicting Values Detail Box */}
                  {f.conflicting_values_json && f.conflicting_values_json !== '{}' && (
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                      <span className="font-semibold text-slate-700 block mb-1">Conflicting Evidentiary Matrix:</span>
                      <pre className="text-[11px] font-mono text-slate-600 whitespace-pre-wrap">
                        {JSON.stringify(JSON.parse(f.conflicting_values_json), null, 2)}
                      </pre>
                    </div>
                  )}

                  {f.resolution_notes && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-lg">
                      <strong>Resolution Note:</strong> {f.resolution_notes} &bull; <em>By: {f.resolved_by || 'Officer'}</em>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 5. CLAIM-EVIDENCE GRAPH */}
      {activeTab === 'graph' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Claim–Evidence Graph Visualization</h3>
              <p className="text-xs text-slate-500">
                NetworkX-backed directed relational model linking application, documents, claims, and verification findings.
              </p>
            </div>
          </div>
          {graphData ? (
            <EvidenceGraph graphData={graphData} />
          ) : (
            <div className="p-12 text-center text-slate-400">Loading Relational Graph...</div>
          )}
        </div>
      )}

      {/* MODAL: Correct Extracted Field */}
      <Modal
        isOpen={editingField !== null}
        onClose={() => setEditingField(null)}
        title={`Correct Extracted Field: ${editingField?.field_name.replace(/_/g, ' ').toUpperCase()}`}
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Raw Extracted Value</label>
            <input
              type="text"
              readOnly
              disabled
              value={editingField?.raw_value || '—'}
              className="w-full p-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Human-Corrected Value *</label>
            <input
              type="text"
              value={correctedVal}
              onChange={(e) => setCorrectedVal(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
              placeholder="Enter verified correct value..."
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Justification / Reason *</label>
            <textarea
              rows={2}
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="e.g. Scanned font anomaly, official amendment gazette order..."
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
            <button
              onClick={() => setEditingField(null)}
              className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveCorrection}
              disabled={savingCorrection || !correctedVal}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {savingCorrection ? 'Saving...' : 'Apply Correction & Re-Verify'}
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL: Resolve Finding */}
      <Modal
        isOpen={resolvingFinding !== null}
        onClose={() => setResolvingFinding(null)}
        title={`Review Finding: ${resolvingFinding?.title}`}
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 leading-relaxed">{resolvingFinding?.description}</p>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Resolution Status</label>
            <select
              value={resolutionStatus}
              onChange={(e) => setResolutionStatus(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg bg-white"
            >
              <option value="resolved">Resolved (Approved / Reconciled)</option>
              <option value="in_review">In Review (Under Investigation)</option>
              <option value="escalated">Escalated (Further Scrutiny Required)</option>
              <option value="open">Open</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Reviewer Justification Notes</label>
            <textarea
              rows={3}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="State the regulatory evidence or institutional justification for this determination..."
              className="w-full p-2 border border-slate-200 rounded-lg"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
            <button
              onClick={() => setResolvingFinding(null)}
              className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveResolution}
              disabled={savingResolution}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              {savingResolution ? 'Saving...' : 'Commit Finding Resolution'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
