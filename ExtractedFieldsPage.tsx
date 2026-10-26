import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { ExtractedField, Application } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Search, Filter, RefreshCw, Edit3, FileText, CheckCircle2 } from 'lucide-react';

export const ExtractedFieldsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const appIdParam = searchParams.get('app_id') || '';

  const [fields, setFields] = useState<ExtractedField[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string>(appIdParam);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Edit Modal State
  const [editingField, setEditingField] = useState<ExtractedField | null>(null);
  const [correctedVal, setCorrectedVal] = useState<string>('');
  const [correctionReason, setCorrectionReason] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [fieldsData, appsData] = await Promise.all([
        api.getFields({ application_id: selectedAppId || undefined }),
        api.getApplications({}),
      ]);
      setFields(fieldsData);
      setApplications(appsData);
    } catch (err) {
      console.error('Failed to load fields:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedAppId]);

  const handleSaveCorrection = async () => {
    if (!editingField) return;
    try {
      setSaving(true);
      await api.correctField(editingField.id, correctedVal, correctionReason, 'Senior Officer');
      setEditingField(null);
      setSuccessMsg(`Field '${editingField.field_name}' successfully updated and logged to audit trail.`);
      await fetchData();
    } catch (err: any) {
      alert(`Correction error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const filteredFields = fields.filter((f) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      f.field_name.toLowerCase().includes(term) ||
      (f.raw_value && f.raw_value.toLowerCase().includes(term)) ||
      (f.normalized_value && f.normalized_value.toLowerCase().includes(term)) ||
      (f.corrected_value && f.corrected_value.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Extracted Institutional Claims</h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse and audit extracted entities, optical recognition confidence, and bounding box telemetry.
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

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 text-[10px] font-bold">Dismiss</button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search field name or extracted value..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <select
            value={selectedAppId}
            onChange={(e) => setSelectedAppId(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="">All Applications</option>
            {applications.map((app) => (
              <option key={app.id} value={app.id}>
                {app.application_number} — {app.institution_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Fields Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Field Classification</th>
                <th className="px-5 py-3">Raw Value</th>
                <th className="px-5 py-3">Active Normalized Value</th>
                <th className="px-5 py-3">Page</th>
                <th className="px-5 py-3">Confidence</th>
                <th className="px-5 py-3">Method</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                    Loading extracted claims...
                  </td>
                </tr>
              ) : filteredFields.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                    No extracted fields found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredFields.map((field) => (
                  <tr key={field.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-3.5 font-semibold text-slate-900">
                      {field.field_name.replace(/_/g, ' ').toUpperCase()}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 max-w-xs truncate">{field.raw_value || '—'}</td>
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      {field.is_corrected ? (
                        <span className="text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {field.corrected_value}
                        </span>
                      ) : (
                        field.normalized_value || field.raw_value || '—'
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-500">Pg {field.page_number}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`font-mono font-semibold text-[11px] ${
                          field.confidence < 0.8 ? 'text-amber-600' : 'text-emerald-600'
                        }`}
                      >
                        {Math.round(field.confidence * 100)}%
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[11px] font-mono text-slate-500">
                      {field.extraction_method}
                    </td>
                    <td className="px-5 py-3.5">
                      {field.is_corrected ? (
                        <Badge variant="info" size="sm">Manually Overridden</Badge>
                      ) : field.confidence < 0.8 ? (
                        <Badge variant="warning" size="sm">Low Confidence</Badge>
                      ) : (
                        <Badge variant="success" size="sm">Passed</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-2">
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

      {/* Edit Modal */}
      <Modal
        isOpen={editingField !== null}
        onClose={() => setEditingField(null)}
        title={`Manual Field Correction: ${editingField?.field_name.replace(/_/g, ' ').toUpperCase()}`}
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">OCR Raw Extracted String</label>
            <input
              type="text"
              readOnly
              disabled
              value={editingField?.raw_value || '—'}
              className="w-full p-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Verified Correct Value *</label>
            <input
              type="text"
              value={correctedVal}
              onChange={(e) => setCorrectedVal(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Correction Rationale / Citation *</label>
            <textarea
              rows={2}
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              placeholder="e.g. Verified against physical seal and gazette notification..."
              className="w-full p-2 border border-slate-200 rounded-lg"
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
              disabled={saving || !correctedVal}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Apply Correction & Recalculate'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
