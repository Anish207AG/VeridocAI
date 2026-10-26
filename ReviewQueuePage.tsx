import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import {
  Inbox,
  AlertTriangle,
  FileText,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Eye,
  Check,
  ShieldCheck
} from 'lucide-react';

export const ReviewQueuePage: React.FC = () => {
  const [queueData, setQueueData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Quick Resolve Modal State
  const [resolvingItem, setResolvingItem] = useState<any | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState<string>('resolved');
  const [notes, setNotes] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const data = await api.getReviewQueue();
      setQueueData(data);
    } catch (err) {
      console.error('Failed to load review queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleResolveSubmit = async () => {
    if (!resolvingItem) return;
    try {
      setSaving(true);
      await api.resolveFinding(resolvingItem.id, resolutionStatus, notes, 'Compliance Reviewer');
      setResolvingItem(null);
      setAlertMsg('Item resolved and updated in audit ledger.');
      await fetchQueue();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const summary = queueData?.summary;
  const findings = queueData?.findings || [];
  const flaggedDocs = queueData?.flagged_documents || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Manual Review Queue</h1>
          <p className="text-sm text-slate-500 mt-1">
            Priority routing for low-confidence extractions, optical scan degradation, and cross-document discrepancies.
          </p>
        </div>
        <button
          onClick={fetchQueue}
          className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {alertMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center justify-between">
          <span>{alertMsg}</span>
          <button onClick={() => setAlertMsg(null)} className="text-emerald-700 text-[10px] font-bold">Dismiss</button>
        </div>
      )}

      {/* Queue Statistics Header */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Action Items</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{summary?.total_action_items ?? 0}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Critical Discrepancies</p>
          <p className="text-2xl font-bold text-rose-600 mt-1">{summary?.critical_findings ?? 0}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Moderate Inconsistencies</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{summary?.moderate_findings ?? 0}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Flagged Scans</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{summary?.flagged_documents ?? 0}</p>
        </div>
      </div>

      {/* Section 1: Inconsistency Findings Requiring Adjudication */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            1. Cross-Document Findings Awaiting Review ({findings.length})
          </h2>
        </div>

        {findings.length === 0 ? (
          <div className="bg-white p-8 text-center rounded-xl border border-slate-200 text-xs text-slate-400">
            No unresolved compliance discrepancies currently queued.
          </div>
        ) : (
          <div className="space-y-3">
            {findings.map((f: any) => (
              <div
                key={f.id}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Badge
                        variant={f.severity === 'high' ? 'danger' : f.severity === 'medium' ? 'warning' : 'info'}
                      >
                        {f.severity.toUpperCase()}
                      </Badge>
                      <span className="font-mono text-xs font-semibold text-blue-600">
                        {f.application_number}
                      </span>
                      <span className="text-xs text-slate-400">&bull;</span>
                      <span className="text-xs font-medium text-slate-700">{f.institution_name}</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">{f.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{f.description}</p>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <button
                      onClick={() => {
                        setResolvingItem(f);
                        setResolutionStatus('resolved');
                        setNotes('');
                      }}
                      className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 shadow-xs"
                    >
                      Resolve / Clear
                    </button>
                    <Link
                      to={`/applications/${f.application_id}`}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium"
                    >
                      Open Dossier &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Flagged Scans & Degraded Quality Documents */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          2. Flagged Documents &amp; Degraded Scans ({flaggedDocs.length})
        </h2>

        {flaggedDocs.length === 0 ? (
          <div className="bg-white p-8 text-center rounded-xl border border-slate-200 text-xs text-slate-400">
            All document scans met high quality readability criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {flaggedDocs.map((doc: any) => (
              <div
                key={doc.id}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-slate-900 flex items-center space-x-1.5">
                      <FileText className="w-4 h-4 text-blue-500" />
                      <span>{doc.filename}</span>
                    </span>
                    <Badge variant="warning" size="sm">
                      {Math.round(doc.quality_score * 100)}% Quality
                    </Badge>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Filing: <strong>{doc.institution_name}</strong> ({doc.application_number})
                  </div>
                  <div className="mt-2 text-xs font-medium text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                    {doc.flag_reason}
                  </div>
                </div>

                  <span className="text-[10px] text-slate-500 font-medium">
                    {doc.extraction_method === 'pymupdf_digital'
                      ? 'Digital Parsing'
                      : doc.extraction_method === 'scanned_pdf_unassisted'
                      ? 'Optical Scan Processing'
                      : 'Standard Intake'}
                  </span>
                  <Link
                    to={`/documents/${doc.id}`}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-medium"
                  >
                    Inspect Document &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolution Modal */}
      <Modal
        isOpen={resolvingItem !== null}
        onClose={() => setResolvingItem(null)}
        title={`Adjudicate Finding: ${resolvingItem?.title}`}
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">{resolvingItem?.description}</p>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Action Determination</label>
            <select
              value={resolutionStatus}
              onChange={(e) => setResolutionStatus(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg bg-white"
            >
              <option value="resolved">Resolved (Approved / Inconsistency Accepted)</option>
              <option value="in_review">Keep in Review (Awaiting Clarification)</option>
              <option value="escalated">Escalate to Senior Inspection Board</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Reviewer Justification / Evidence Note</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="State the administrative reason or verified authority for this decision..."
              className="w-full p-2 border border-slate-200 rounded-lg"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
            <button
              onClick={() => setResolvingItem(null)}
              className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleResolveSubmit}
              disabled={saving}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              {saving ? 'Recording...' : 'Commit Adjudication'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
