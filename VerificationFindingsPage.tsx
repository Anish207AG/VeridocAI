import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { VerificationFinding, Application } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { AlertTriangle, Filter, RefreshCw, CheckCircle2, ChevronRight, FileText } from 'lucide-react';

export const VerificationFindingsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const appIdParam = searchParams.get('app_id') || '';

  const [findings, setFindings] = useState<VerificationFinding[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string>(appIdParam);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);

  // Resolution Modal
  const [resolvingFinding, setResolvingFinding] = useState<VerificationFinding | null>(null);
  const [resStatus, setResStatus] = useState<string>('resolved');
  const [resNotes, setResNotes] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [fData, aData] = await Promise.all([
        api.getFindings({
          application_id: selectedAppId || undefined,
          severity: severityFilter === 'all' ? undefined : severityFilter,
          status: statusFilter === 'all' ? undefined : statusFilter,
        }),
        api.getApplications({}),
      ]);
      setFindings(fData);
      setApplications(aData);
    } catch (err) {
      console.error('Failed to load findings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedAppId, severityFilter, statusFilter]);

  const handleCommitResolution = async () => {
    if (!resolvingFinding) return;
    try {
      setSaving(true);
      await api.resolveFinding(resolvingFinding.id, resStatus, resNotes, 'Senior Compliance Officer');
      setResolvingFinding(null);
      setAlertMsg('Finding resolution logged to tamper-evident audit chain.');
      await fetchData();
    } catch (err: any) {
      alert(`Resolution error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Institutional Compliance Findings</h1>
          <p className="text-sm text-slate-500 mt-1">
            Reconcile automated cross-document discrepancies, seat intake inconsistencies, and statutory expirations.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {alertMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center justify-between">
          <span>{alertMsg}</span>
          <button onClick={() => setAlertMsg(null)} className="text-emerald-700 text-[10px] font-bold">Dismiss</button>
        </div>
      )}

      {/* Filter Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Application Filter */}
          <select
            value={selectedAppId}
            onChange={(e) => setSelectedAppId(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white"
          >
            <option value="">All Applications</option>
            {applications.map((a) => (
              <option key={a.id} value={a.id}>
                {a.application_number} — {a.institution_name}
              </option>
            ))}
          </select>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white"
          >
            <option value="all">All Severities</option>
            <option value="high">High Severity</option>
            <option value="medium">Medium Severity</option>
            <option value="low">Low Severity</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white"
          >
            <option value="all">All Review Statuses</option>
            <option value="open">Open</option>
            <option value="in_review">In Review</option>
            <option value="resolved">Resolved</option>
            <option value="escalated">Escalated</option>
          </select>
        </div>

        <span className="text-xs text-slate-400 font-mono">{findings.length} Findings Total</span>
      </div>

      {/* Findings List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading compliance findings...</div>
        ) : findings.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800">No Discrepancies Found</h4>
            <p className="text-xs text-slate-500 mt-1">All selected applications are clear of active findings.</p>
          </div>
        ) : (
          findings.map((f) => (
            <div key={f.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Badge variant={f.severity === 'high' ? 'danger' : f.severity === 'medium' ? 'warning' : 'info'}>
                      {f.severity.toUpperCase()}
                    </Badge>
                    <span className="font-mono text-xs text-slate-500 font-semibold">{f.rule_code}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{f.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{f.description}</p>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  <Badge variant={f.review_status === 'resolved' ? 'success' : 'neutral'}>
                    {f.review_status.toUpperCase()}
                  </Badge>
                  <button
                    onClick={() => {
                      setResolvingFinding(f);
                      setResStatus(f.review_status === 'resolved' ? 'in_review' : 'resolved');
                      setResNotes(f.resolution_notes || '');
                    }}
                    className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-colors"
                  >
                    Action / Resolve
                  </button>
                  <Link
                    to={`/applications/${f.application_id}`}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                  >
                    Dossier &rarr;
                  </Link>
                </div>
              </div>

              {/* Conflicting JSON Box */}
              {f.conflicting_values_json && f.conflicting_values_json !== '{}' && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                  <span className="font-semibold text-slate-700 block mb-1">Conflicting Matrix:</span>
                  <pre className="text-[11px] font-mono text-slate-600 whitespace-pre-wrap">
                    {JSON.stringify(JSON.parse(f.conflicting_values_json), null, 2)}
                  </pre>
                </div>
              )}

              {f.resolution_notes && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-lg">
                  <strong>Resolution Notes:</strong> {f.resolution_notes} &bull; <em>By: {f.resolved_by || 'Officer'}</em>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Resolve Finding Modal */}
      <Modal
        isOpen={resolvingFinding !== null}
        onClose={() => setResolvingFinding(null)}
        title={`Action Finding: ${resolvingFinding?.title}`}
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">{resolvingFinding?.description}</p>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Updated Review Status</label>
            <select
              value={resStatus}
              onChange={(e) => setResStatus(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg bg-white"
            >
              <option value="resolved">Resolved (Inconsistency Accepted/Rectified)</option>
              <option value="in_review">In Review (Pending Secondary Documents)</option>
              <option value="escalated">Escalated (Referred to Statutory Committee)</option>
              <option value="open">Open</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Officer Resolution Rationale</label>
            <textarea
              rows={3}
              value={resNotes}
              onChange={(e) => setResNotes(e.target.value)}
              placeholder="State the regulatory basis or administrative justification..."
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
              onClick={handleCommitResolution}
              disabled={saving}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              {saving ? 'Saving...' : 'Commit Determination'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
