import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { FolderPlus, ArrowLeft, Building2, Hash, BookOpen, Users, Calendar, AlertCircle } from 'lucide-react';

export const CreateApplicationPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    application_number: `APP-2026-${Math.floor(100 + Math.random() * 900)}`,
    institution_name: '',
    institution_id: '',
    academic_year: '2026-2027',
    course_programme: '',
    approved_intake: 120,
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.institution_name || !formData.institution_id) {
      setError('Institution Name and Institutional ID are required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const newApp = await api.createApplication({
        ...formData,
        approved_intake: Number(formData.approved_intake) || null,
      });
      navigate(`/applications/${newApp.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create application.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center space-x-3">
        <Link
          to="/applications"
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create Institutional Application</h1>
          <p className="text-xs text-slate-500">Register a new compliance dossier for verification</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Application Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Application Reference Number
            </label>
            <div className="relative">
              <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={formData.application_number}
                onChange={(e) => setFormData({ ...formData, application_number: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Academic Year */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Academic Session / Year
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={formData.academic_year}
                onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Institution Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Official Institution Name *
          </label>
          <div className="relative">
            <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              required
              placeholder="e.g., Apex Institute of Technology"
              value={formData.institution_name}
              onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Institution ID */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Permanent Institution ID / Code *
            </label>
            <input
              type="text"
              required
              placeholder="e.g., INST-AICTE-1001"
              value={formData.institution_id}
              onChange={(e) => setFormData({ ...formData, institution_id: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
            />
          </div>

          {/* Approved Intake */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Proposed / Applied Intake Capacity
            </label>
            <div className="relative">
              <Users className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="number"
                min="0"
                value={formData.approved_intake}
                onChange={(e) => setFormData({ ...formData, approved_intake: parseInt(e.target.value) || 0 })}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Course / Programme */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Course or Academic Programme
          </label>
          <div className="relative">
            <BookOpen className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="e.g., B.Tech Computer Science and Engineering"
              value={formData.course_programme}
              onChange={(e) => setFormData({ ...formData, course_programme: e.target.value })}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Inspection &amp; Reviewer Notes
          </label>
          <textarea
            rows={3}
            placeholder="Optional internal remarks or specific verification context..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
          <Link
            to="/applications"
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
          >
            <FolderPlus className="w-4 h-4" />
            <span>{loading ? 'Creating Dossier...' : 'Create Application Dossier'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
