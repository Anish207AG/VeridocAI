import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Application } from '../types';
import { Upload, ArrowLeft, FileText, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';

export const DocumentUploadPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedAppId = searchParams.get('app_id') || '';

  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string>(preselectedAppId);
  const [documentType, setDocumentType] = useState<string>('approval_letter');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileHash, setFileHash] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successDoc, setSuccessDoc] = useState<any | null>(null);

  useEffect(() => {
    api.getApplications({}).then((apps) => {
      setApplications(apps);
      if (!selectedAppId && apps.length > 0) {
        setSelectedAppId(apps[0].id);
      }
    });
  }, []);

  // Compute SHA-256 on client for instant duplicate preview
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setError(null);
    setSuccessDoc(null);

    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      setFileHash(hashHex);
    } catch {
      setFileHash(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !selectedAppId) {
      setError('Please select both a target application and a valid document file.');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      const doc = await api.uploadDocument(selectedAppId, documentType, selectedFile);
      setSuccessDoc(doc);
    } catch (err: any) {
      setError(err.message || 'Upload processing failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center space-x-3">
        <Link
          to="/applications"
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Upload Institutional Document</h1>
          <p className="text-xs text-slate-500">
            Automated cryptographic hashing, text extraction, scan quality inspection, and rule validation
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successDoc && (
        <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
          <div className="flex items-center space-x-2 text-emerald-800 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>Document Successfully Processed and Ingested</span>
          </div>
          <p className="text-xs text-emerald-700 leading-relaxed">
            File <strong>{successDoc.filename}</strong> parsed with method <code>{successDoc.extraction_method}</code>.
            {successDoc.is_duplicate && (
              <span className="block mt-1 font-semibold text-amber-800">
                Notice: Exact duplicate SHA-256 hash match identified and recorded.
              </span>
            )}
          </p>
          <div className="flex items-center space-x-3 pt-2">
            <Link
              to={`/documents/${successDoc.id}`}
              className="px-3.5 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-semibold hover:bg-emerald-800"
            >
              Open in Evidence Viewer &rarr;
            </Link>
            <Link
              to={`/applications/${selectedAppId}`}
              className="px-3.5 py-1.5 bg-white border border-emerald-300 text-emerald-800 rounded-lg text-xs font-semibold hover:bg-emerald-100"
            >
              View Application Dossier
            </Link>
          </div>
        </div>
      )}

      <form onSubmit={handleUpload} className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-5">
        {/* Target Application Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Target Institutional Application Dossier *
          </label>
          <select
            value={selectedAppId}
            onChange={(e) => setSelectedAppId(e.target.value)}
            required
            className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="">-- Select an Institutional Application --</option>
            {applications.map((app) => (
              <option key={app.id} value={app.id}>
                {app.application_number} — {app.institution_name} ({app.academic_year})
              </option>
            ))}
          </select>
        </div>

        {/* Document Classification */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Statutory Document Category *
          </label>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="approval_letter">Regulatory Approval Letter (Central/Council)</option>
            <option value="affiliation_certificate">University Affiliation Sanction Order</option>
            <option value="building_safety_certificate">Building Fire &amp; Structural Safety Certificate</option>
            <option value="land_affidavit">Campus Land Ownership &amp; Title Affidavit</option>
            <option value="faculty_list">Approved Faculty &amp; Staff Registry</option>
            <option value="other">Other Institutional Compliance Document</option>
          </select>
        </div>

        {/* File Dropzone */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Select Document File (PDF, PNG, JPEG) *
          </label>
          <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-8 text-center bg-slate-50/50 transition-colors">
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-700">
              Drag and drop your file here, or browse from your computer
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Supports PDF (digital or scanned), PNG, and JPG up to 50MB</p>
            <input
              type="file"
              required
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileChange}
              className="mt-4 block mx-auto text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
            />
          </div>
        </div>

        {/* Pre-upload SHA-256 Hash Digest */}
        {fileHash && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
            <span className="font-semibold text-slate-700">Pre-computed SHA-256 Digest:</span>
            <div className="font-mono text-[11px] text-slate-500 break-all select-all">{fileHash}</div>
          </div>
        )}

        {/* Submit */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
          <Link
            to="/applications"
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={uploading || !selectedFile}
            className="flex items-center space-x-1.5 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            <span>{uploading ? 'Extracting & Validating...' : 'Upload & Begin Verification'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
