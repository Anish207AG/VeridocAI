import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import {
  ShieldCheck,
  FileCheck2,
  Inbox,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  RefreshCw,
  Copy,
  Clock,
  Layers,
  FileText,
  GitBranch,
  Upload,
  Search,
  Scale,
  Activity,
  ArrowRight,
  Shield,
  FileSearch,
  ExternalLink
} from 'lucide-react';

export const VerificationCentrePage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Reset Demo Modal State
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [resetConfirmText, setResetConfirmText] = useState<string>('');
  const [resetting, setResetting] = useState<boolean>(false);

  const fetchMetrics = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      const res = await api.getVerificationCentreMetrics();
      setData(res);
    } catch (err) {
      console.error('Failed to load verification centre metrics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const handleResetDemoData = async () => {
    if (resetConfirmText.toLowerCase() !== 'reset') return;
    try {
      setResetting(true);
      const res = await api.resetDemoData();
      setShowResetModal(false);
      setResetConfirmText('');
      setStatusMsg(res.message || 'Demonstration scenarios successfully reloaded.');
      await fetchMetrics(true);
    } catch (err: any) {
      alert(`Reset failed: ${err.message}`);
    } finally {
      setResetting(false);
    }
  };

  const metrics = data?.metrics || {
    total_documents_processed: 0,
    total_applications: 0,
    applications_requiring_review: 0,
    cross_document_mismatches: 0,
    missing_or_expired_documents: 0,
    duplicate_uploads: 0,
    low_confidence_extractions: 0
  };

  const serviceStatus = data?.service_status || {};
  const recentActivity = data?.recent_activity || [];

  // 7-Stage Workflow Pipeline definitions
  const workflowStages = [
    {
      step: 1,
      title: 'Document Upload & Intake',
      description: 'Intake institutional filings, calculate SHA-256 fingerprint, and check duplicate registry.',
      route: '/upload',
      actionLabel: 'Upload Documents',
      icon: Upload,
      accent: 'text-blue-600 bg-blue-50 border-blue-200'
    },
    {
      step: 2,
      title: 'OCR & Field Extraction',
      description: 'Perform optical & digital text parsing to identify key statutory fields and bounding boxes.',
      route: '/fields',
      actionLabel: 'Inspect Fields',
      icon: FileSearch,
      accent: 'text-indigo-600 bg-indigo-50 border-indigo-200'
    },
    {
      step: 3,
      title: 'Cross-Document Comparison',
      description: 'Reconcile figures across approval orders, affiliation certificates, and statutory filings.',
      route: '/findings',
      actionLabel: 'View Discrepancies',
      icon: GitBranch,
      accent: 'text-amber-600 bg-amber-50 border-amber-200'
    },
    {
      step: 4,
      title: 'Compliance Checking',
      description: 'Evaluate filings against statutory regulatory codes, thresholds, and mandatory checklists.',
      route: '/rules',
      actionLabel: 'Configure Rules',
      icon: Scale,
      accent: 'text-emerald-600 bg-emerald-50 border-emerald-200'
    },
    {
      step: 5,
      title: 'Evidence-Linked Review',
      description: 'Explore the interactive relational graph connecting applications, documents, claims, and rules.',
      route: '/graph',
      actionLabel: 'Explore Graph',
      icon: Layers,
      accent: 'text-purple-600 bg-purple-50 border-purple-200'
    },
    {
      step: 6,
      title: 'Manual Review & Adjudication',
      description: 'Compliance officer queue for adjudicating flagged findings and low-confidence scans.',
      route: '/review-queue',
      actionLabel: 'Open Review Queue',
      icon: Inbox,
      accent: 'text-rose-600 bg-rose-50 border-rose-200'
    },
    {
      step: 7,
      title: 'Report Generation',
      description: 'Compile multi-page institutional compliance verification reports with cryptographic digests.',
      route: '/reports',
      actionLabel: 'Generate Reports',
      icon: FileText,
      accent: 'text-teal-600 bg-teal-50 border-teal-200'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Verification Centre</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Institutional document intake, compliance reconciliation, and evidentiary workflow controls.
          </p>
        </div>
        <button
          onClick={() => fetchMetrics(true)}
          disabled={refreshing}
          className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh Metrics'}</span>
        </button>
      </div>

      {statusMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{statusMsg}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="text-emerald-700 text-[10px] font-bold">Dismiss</button>
        </div>
      )}

      {/* Real Database-Backed Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Metric 1: Total Documents Processed */}
        <div
          onClick={() => navigate('/applications')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 hover:shadow-sm cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Documents Processed</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 mt-2">{metrics.total_documents_processed}</p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500">{metrics.total_applications} active institutional filings</span>
            <span className="text-blue-600 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center">
              View filings &rarr;
            </span>
          </div>
        </div>

        {/* Metric 2: Applications Requiring Review */}
        <div
          onClick={() => navigate('/review-queue')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-amber-300 hover:shadow-sm cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Applications Requiring Review</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Inbox className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-amber-600 mt-2">{metrics.applications_requiring_review}</p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500">Pending officer adjudication</span>
            <span className="text-amber-600 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center">
              Open queue &rarr;
            </span>
          </div>
        </div>

        {/* Metric 3: Cross-Document Mismatches */}
        <div
          onClick={() => navigate('/findings')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-rose-300 hover:shadow-sm cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cross-Document Mismatches</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <GitBranch className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-rose-600 mt-2">{metrics.cross_document_mismatches}</p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500">Conflicting intake or claims</span>
            <span className="text-rose-600 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center">
              Review issues &rarr;
            </span>
          </div>
        </div>

        {/* Metric 4: Missing or Expired Documents */}
        <div
          onClick={() => navigate('/findings')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-rose-300 hover:shadow-sm cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Missing or Expired Clearances</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-rose-600 mt-2">{metrics.missing_or_expired_documents}</p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500">Lapsed validity or missing files</span>
            <span className="text-rose-600 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center">
              Inspect findings &rarr;
            </span>
          </div>
        </div>

        {/* Metric 5: Duplicate Uploads */}
        <div
          onClick={() => navigate('/findings')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-amber-300 hover:shadow-sm cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Exact Duplicate Uploads</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Copy className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-amber-600 mt-2">{metrics.duplicate_uploads}</p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500">Identical SHA-256 fingerprints</span>
            <span className="text-amber-600 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center">
              View duplicates &rarr;
            </span>
          </div>
        </div>

        {/* Metric 6: Low-Confidence Extractions */}
        <div
          onClick={() => navigate('/review-queue')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-purple-300 hover:shadow-sm cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Low-Confidence Extractions</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <FileSearch className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-purple-600 mt-2">{metrics.low_confidence_extractions}</p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500">Degraded scans flagged for review</span>
            <span className="text-purple-600 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center">
              Inspect scans &rarr;
            </span>
          </div>
        </div>
      </div>

      {/* 7-Stage Institutional Verification Workflow */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center space-x-2">
              <Activity className="w-5 h-5 text-blue-600" />
              <span>7-Stage Institutional Verification Workflow</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Sequential verification stages from document intake to final regulatory report generation.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-1">
          {workflowStages.map((stage) => {
            const Icon = stage.icon;
            return (
              <div
                key={stage.step}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-200 hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                      Stage {stage.step}
                    </span>
                    <div className={`p-1.5 rounded-lg border ${stage.accent}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 mt-2.5">{stage.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{stage.description}</p>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <Link
                    to={stage.route}
                    className="inline-flex items-center space-x-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <span>{stage.actionLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Service Operational Health & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Operational Health */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <Shield className="w-4 h-4 text-blue-600" />
              <span>Service Operational Status</span>
            </h2>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>All Services Active</span>
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            {Object.entries(serviceStatus).map(([key, s]: [string, any]) => {
              const isWarning = s.status === 'Needs Attention' || s.status === 'Integrity Warning';
              return (
                <div
                  key={key}
                  className="p-3 rounded-lg border border-slate-100 bg-slate-50/70 flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-900">{s.name}</div>
                    <div className="text-[11px] text-slate-500">{s.detail}</div>
                  </div>
                  <span
                    className={`font-semibold px-2.5 py-0.5 rounded text-[11px] border ${
                      isWarning
                        ? 'text-amber-700 bg-amber-50 border-amber-200'
                        : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    }`}
                  >
                    {s.status}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Cryptographic Ledger Status:</span>
            <Link to="/audit" className="text-blue-600 font-semibold hover:underline flex items-center space-x-1">
              <span>View Audit Trail</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Recent Verification Activity */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <Clock className="w-4 h-4 text-slate-600" />
              <span>Recent Verification Activity</span>
            </h2>
            <Link to="/audit" className="text-xs text-blue-600 font-semibold hover:underline">
              Full Ledger &rarr;
            </Link>
          </div>

          {recentActivity.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No recent verification activity recorded.</p>
          ) : (
            <div className="space-y-2 text-xs divide-y divide-slate-100">
              {recentActivity.map((ev: any) => (
                <div key={ev.sequence} className="pt-2 first:pt-0 flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-900 flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      <span>{ev.title}</span>
                      <span className="text-[10px] text-slate-400 font-normal">#{ev.sequence}</span>
                    </div>
                    {ev.details_snippet && (
                      <div className="text-[11px] text-slate-600 truncate max-w-xs sm:max-w-sm">
                        {ev.details_snippet}
                      </div>
                    )}
                    <div className="text-[10px] text-slate-400">
                      By {ev.actor} &bull; {ev.timestamp}
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded flex-shrink-0">
                    {ev.verified_hash}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Demonstration & Administration Section */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-900">
            <RotateCcw className="w-4 h-4 text-rose-600" />
            <h3 className="text-sm font-bold">Demonstration Environment Management</h3>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
            Administrative Controls
          </span>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed max-w-4xl">
          Safely reload the standard demonstration scenarios (A through E) to inspect benchmark cases including clean filings, intake mismatches, expired certificates, duplicate files, and degraded scans. Existing database structure and configured compliance rules are safely preserved.
        </p>

        <div className="pt-2">
          <button
            onClick={() => setShowResetModal(true)}
            className="px-4 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 border border-slate-200 hover:border-rose-200 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            <span>Reload Demonstration Scenarios</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Confirm Demonstration Data Reload"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              This action will reset demonstration applications and reload sample test filings (Scenarios A through E). Existing database tables and compliance rules will not be lost.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Type <strong className="text-rose-600">reset</strong> below to confirm reload:
            </label>
            <input
              type="text"
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              placeholder="reset"
              className="w-full p-2 border border-slate-200 rounded-lg font-mono text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
            <button
              onClick={() => setShowResetModal(false)}
              className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleResetDemoData}
              disabled={resetting || resetConfirmText.toLowerCase() !== 'reset'}
              className="px-4 py-1.5 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700 disabled:opacity-40 transition-colors"
            >
              {resetting ? 'Reloading Scenarios...' : 'Confirm & Reload Scenarios'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
