import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { DashboardStats, Application } from '../types';
import { Badge } from '../components/common/Badge';
import {
  FileCheck2,
  AlertTriangle,
  Inbox,
  ShieldCheck,
  Copy,
  ArrowUpRight,
  Sparkles,
  RefreshCw,
  FolderPlus,
  Scale,
  CheckCircle2,
  Clock
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentApps, setRecentApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingScenario, setLoadingScenario] = useState<string | null>(null);
  const [scenarioMessage, setScenarioMessage] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, appsData] = await Promise.all([
        api.getStats(),
        api.getApplications({}),
      ]);
      setStats(statsData);
      setRecentApps(appsData.slice(0, 5));
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleLaunchScenario = async (scenarioKey: string) => {
    try {
      setLoadingScenario(scenarioKey);
      setScenarioMessage(null);
      const res = await api.loadScenario(scenarioKey);
      setScenarioMessage(`Scenario initialized: Application ${res.application_id}`);
      await fetchDashboardData();
      // Navigate to newly created application
      setTimeout(() => {
        navigate(`/applications/${res.application_id}`);
      }, 700);
    } catch (err: any) {
      alert(`Failed to load scenario: ${err.message}`);
    } finally {
      setLoadingScenario(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Institutional Compliance Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Automated multi-document verification, cross-field integrity checks, and human review orchestration.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchDashboardData}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <Link
            to="/applications/new"
            className="flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
            <span>New Application</span>
          </Link>
        </div>
      </div>

      {scenarioMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center justify-between animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{scenarioMessage}</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">Opening application details...</span>
        </div>
      )}

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Applications */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Filings</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats?.total_applications ?? 0}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {stats?.clean_applications ?? 0} Clean &bull; {stats?.applications_with_findings ?? 0} with Findings
            </p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <FileCheck2 className="w-6 h-6" />
          </div>
        </div>

        {/* Verification Findings */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Findings</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{stats?.total_findings ?? 0}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {stats?.findings_by_severity.high ?? 0} High &bull; {stats?.findings_by_severity.medium ?? 0} Medium
            </p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Review Queue Items */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Manual Review Queue</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{stats?.review_queue_count ?? 0}</p>
            <Link to="/review-queue" className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5 mt-0.5">
              <span>Inspect Queue</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Inbox className="w-6 h-6" />
          </div>
        </div>

        {/* Cryptographic Audit Chain */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Audit Chain</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">
              {stats?.audit_chain_valid ? 'Verified' : 'Tampered'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {stats?.audit_event_count ?? 0} Immutable Blocks
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 1-Click Demonstration Scenarios Launcher */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-xl p-6 text-white shadow-md border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold">Interactive Demonstration Scenarios (Pre-Built)</h2>
          </div>
          <span className="text-xs text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
            Real PyMuPDF extraction &amp; compliance pipeline
          </span>
        </div>
        <p className="text-xs text-slate-300 mb-4 max-w-3xl leading-relaxed">
          Select any scenario below to automatically generate realistic institutional PDF files, execute OCR/digital extraction, run cross-document rules, and observe evidence highlighting:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Scenario A */}
          <button
            onClick={() => handleLaunchScenario('scenario_a')}
            disabled={loadingScenario !== null}
            className="p-3.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 text-left transition-all group flex flex-col justify-between"
          >
            <div>
              <span className="text-[10px] font-bold text-emerald-400 tracking-wider uppercase">Scenario A</span>
              <h4 className="text-xs font-semibold text-white mt-1 group-hover:text-emerald-300">Clean Application</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                Consistent 120 intake, valid affiliations, zero discrepancies.
              </p>
            </div>
            <div className="mt-3 text-[10px] font-medium text-emerald-400 flex items-center space-x-1">
              <span>{loadingScenario === 'scenario_a' ? 'Loading...' : 'Launch Scenario →'}</span>
            </div>
          </button>

          {/* Scenario B */}
          <button
            onClick={() => handleLaunchScenario('scenario_b')}
            disabled={loadingScenario !== null}
            className="p-3.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-rose-500/50 text-left transition-all group flex flex-col justify-between"
          >
            <div>
              <span className="text-[10px] font-bold text-rose-400 tracking-wider uppercase">Scenario B</span>
              <h4 className="text-xs font-semibold text-white mt-1 group-hover:text-rose-300">Intake Mismatch</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                Approval says 120, Affiliation says 90. Triggers High Severity.
              </p>
            </div>
            <div className="mt-3 text-[10px] font-medium text-rose-400 flex items-center space-x-1">
              <span>{loadingScenario === 'scenario_b' ? 'Loading...' : 'Launch Scenario →'}</span>
            </div>
          </button>

          {/* Scenario C */}
          <button
            onClick={() => handleLaunchScenario('scenario_c')}
            disabled={loadingScenario !== null}
            className="p-3.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/50 text-left transition-all group flex flex-col justify-between"
          >
            <div>
              <span className="text-[10px] font-bold text-amber-400 tracking-wider uppercase">Scenario C</span>
              <h4 className="text-xs font-semibold text-white mt-1 group-hover:text-amber-300">Expired Clearance</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                Fire Safety Certificate expired in 2023. Flagged invalid.
              </p>
            </div>
            <div className="mt-3 text-[10px] font-medium text-amber-400 flex items-center space-x-1">
              <span>{loadingScenario === 'scenario_c' ? 'Loading...' : 'Launch Scenario →'}</span>
            </div>
          </button>

          {/* Scenario D */}
          <button
            onClick={() => handleLaunchScenario('scenario_d')}
            disabled={loadingScenario !== null}
            className="p-3.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-blue-500/50 text-left transition-all group flex flex-col justify-between"
          >
            <div>
              <span className="text-[10px] font-bold text-blue-400 tracking-wider uppercase">Scenario D</span>
              <h4 className="text-xs font-semibold text-white mt-1 group-hover:text-blue-300">Duplicate Document</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                Identical SHA-256 hash file uploaded twice.
              </p>
            </div>
            <div className="mt-3 text-[10px] font-medium text-blue-400 flex items-center space-x-1">
              <span>{loadingScenario === 'scenario_d' ? 'Loading...' : 'Launch Scenario →'}</span>
            </div>
          </button>

          {/* Scenario E */}
          <button
            onClick={() => handleLaunchScenario('scenario_e')}
            disabled={loadingScenario !== null}
            className="p-3.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-purple-500/50 text-left transition-all group flex flex-col justify-between"
          >
            <div>
              <span className="text-[10px] font-bold text-purple-400 tracking-wider uppercase">Scenario E</span>
              <h4 className="text-xs font-semibold text-white mt-1 group-hover:text-purple-300">Degraded Scan</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                Low contrast / blur scan routed to Manual Review Queue.
              </p>
            </div>
            <div className="mt-3 text-[10px] font-medium text-purple-400 flex items-center space-x-1">
              <span>{loadingScenario === 'scenario_e' ? 'Loading...' : 'Launch Scenario →'}</span>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Applications & Review Queue Preview */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Institutional Applications</h3>
            <p className="text-xs text-slate-500">Live registry of active and inspected institution filings</p>
          </div>
          <Link
            to="/applications"
            className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center space-x-1"
          >
            <span>View All Filings</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Application Ref</th>
                <th className="px-5 py-3">Institution Name &amp; ID</th>
                <th className="px-5 py-3">Course / Intake</th>
                <th className="px-5 py-3">Risk Score</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {recentApps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    No applications created yet. Click any demonstration scenario above to begin.
                  </td>
                </tr>
              ) : (
                recentApps.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-medium text-blue-600">
                      <Link to={`/applications/${app.id}`} className="hover:underline">
                        {app.application_number}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-900">{app.institution_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{app.institution_id}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div>{app.course_programme || 'General'}</div>
                      <div className="text-[11px] text-slate-400">
                        Intake: <strong>{app.approved_intake ?? 'Pending'}</strong>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`font-semibold font-mono px-2 py-0.5 rounded text-[11px] ${
                          app.risk_score > 30
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : app.risk_score > 0
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {app.risk_score} / 100
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
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
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to={`/applications/${app.id}`}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-medium text-[11px] transition-colors"
                      >
                        View &rarr;
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
