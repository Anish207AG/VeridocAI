import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Application } from '../types';
import { Badge } from '../components/common/Badge';
import { FolderPlus, Search, Filter, RefreshCw, ChevronRight, FileText } from 'lucide-react';

export const ApplicationsPage: React.FC = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const fetchApps = async () => {
    try {
      setLoading(true);
      const data = await api.getApplications({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchTerm || undefined,
      });
      setApplications(data);
    } catch (err) {
      console.error('Failed to load applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchApps();
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Institutional Applications</h1>
          <p className="text-sm text-slate-500 mt-1">
            Search, filter, and review institutional compliance dossiers and regulatory filings.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchApps}
            className="p-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            to="/applications/new"
            className="flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Create New Application</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Institution Name, ID, or Application Number..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </form>

        {/* Status Dropdown */}
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="all">All Verification Statuses</option>
            <option value="verified_clean">Verified Clean</option>
            <option value="verified_with_findings">Verified with Findings</option>
            <option value="needs_review">Needs Review</option>
            <option value="in_review">In Review</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Application Ref</th>
                <th className="px-5 py-3">Institution Name</th>
                <th className="px-5 py-3">Institution ID</th>
                <th className="px-5 py-3">Academic Session</th>
                <th className="px-5 py-3">Course / Intake</th>
                <th className="px-5 py-3">Risk Score</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading institutional applications...
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                    No applications matched your criteria.
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-medium text-blue-600">
                      <Link to={`/applications/${app.id}`} className="hover:underline flex items-center space-x-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-500" />
                        <span>{app.application_number}</span>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-900">{app.institution_name}</td>
                    <td className="px-5 py-3.5 font-mono text-slate-500">{app.institution_id}</td>
                    <td className="px-5 py-3.5 text-slate-500">{app.academic_year}</td>
                    <td className="px-5 py-3.5">
                      <div>{app.course_programme || 'Institutional'}</div>
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
                        className="inline-flex items-center space-x-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-medium text-[11px] transition-colors"
                      >
                        <span>Details</span>
                        <ChevronRight className="w-3 h-3" />
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
