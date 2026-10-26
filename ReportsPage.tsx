import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Application } from '../types';
import { FileText, Download, Plus, RefreshCw, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Generate modal
  const [selectedAppId, setSelectedAppId] = useState<string>('');
  const [generating, setGenerating] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchReportsData = async () => {
    try {
      setLoading(true);
      const [reportsData, appsData] = await Promise.all([
        api.getReports(),
        api.getApplications({}),
      ]);
      setReports(reportsData);
      setApplications(appsData);
      if (!selectedAppId && appsData.length > 0) {
        setSelectedAppId(appsData[0].id);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, []);

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppId) return;
    try {
      setGenerating(true);
      setSuccessMsg(null);
      const res = await api.generateReport(selectedAppId);
      setSuccessMsg(`Official compliance PDF generated: ${res.filename}`);
      await fetchReportsData();
    } catch (err: any) {
      alert(`Report compilation failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Institutional Compliance Reports</h1>
          <p className="text-sm text-slate-500 mt-1">
            Formal ReportLab PDF verification dossiers with findings matrices, evidence notes, and sign-offs.
          </p>
        </div>
        <button
          onClick={fetchReportsData}
          className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 text-[10px] font-bold">Dismiss</button>
        </div>
      )}

      {/* Generate New Report Widget */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-2">Compile Formal Verification Dossier (PDF)</h3>
        <p className="text-xs text-slate-500 mb-4">
          Select an application below to render an audit-ready verification summary including extracted claims, active discrepancies, and institutional details.
        </p>

        <form onSubmit={handleGenerateReport} className="flex flex-col sm:flex-row items-center gap-3">
          <select
            value={selectedAppId}
            onChange={(e) => setSelectedAppId(e.target.value)}
            className="flex-1 w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white"
          >
            {applications.map((a) => (
              <option key={a.id} value={a.id}>
                {a.application_number} — {a.institution_name} ({a.status.replace(/_/g, ' ')})
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={generating || !selectedAppId}
            className="w-full sm:w-auto flex items-center justify-center space-x-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            <span>{generating ? 'Generating PDF...' : 'Compile & Save PDF Report'}</span>
          </button>
        </form>
      </div>

      {/* Reports Archive Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Compiled PDF Archive</h3>
          <span className="text-xs text-slate-400 font-mono">{reports.length} Reports</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Report File Name</th>
                <th className="px-5 py-3">Date Compiled</th>
                <th className="px-5 py-3">File Size</th>
                <th className="px-5 py-3">Format</th>
                <th className="px-5 py-3 text-right">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                    Loading compiled reports...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                    No PDF reports compiled yet. Use the tool above to generate your first verification dossier.
                  </td>
                </tr>
              ) : (
                reports.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80">
                    <td className="px-5 py-3.5 font-medium text-slate-900 flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-rose-500 flex-shrink-0" />
                      <span>{r.filename}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-500">
                      {(r.file_size / 1024).toFixed(1)} KB
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded text-[10px] font-bold">
                        PDF
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <a
                        href={r.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[11px] font-semibold transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </a>
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
