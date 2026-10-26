import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Document, ExtractedField } from '../types';
import { PdfViewer } from '../components/pdf/PdfViewer';
import { Badge } from '../components/common/Badge';
import {
  ArrowLeft,
  FileText,
  ShieldAlert,
  Search,
  ExternalLink,
  Target,
  Sparkles,
  Info
} from 'lucide-react';

export const DocumentViewerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activePage, setActivePage] = useState<number>(1);
  const [activeBBox, setActiveBBox] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchDoc = async () => {
      try {
        setLoading(true);
        const data = await api.getDocument(id);
        setDoc(data);
      } catch (err) {
        console.error('Failed to load document:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [id]);

  const handleFieldClick = (field: ExtractedField) => {
    setSelectedFieldId(field.id);
    setActivePage(field.page_number);
    if (field.bbox_json) {
      try {
        const coords = JSON.parse(field.bbox_json);
        if (Array.isArray(coords) && coords.length === 4) {
          setActiveBBox({
            x0: coords[0],
            y0: coords[1],
            x1: coords[2],
            y1: coords[3],
          });
          return;
        }
      } catch {
        // ignore
      }
    }
    setActiveBBox(null);
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        Loading Document Stream...
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>Document not found.</p>
        <Link to="/applications" className="text-blue-600 underline text-xs mt-2 block">
          &larr; Return to Applications
        </Link>
      </div>
    );
  }

  const fields = doc.fields || [];
  const fileUrl = `/api/documents/${doc.id}/file`;

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-3">
          <Link
            to={`/applications/${doc.application_id}`}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold text-slate-900">{doc.filename}</h1>
              {doc.is_duplicate && (
                <Badge variant="warning" size="sm">
                  Exact Duplicate
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-3 text-[11px] text-slate-500 mt-0.5">
              <span>Type: <strong>{doc.document_type.replace(/_/g, ' ').toUpperCase()}</strong></span>
              <span>&bull;</span>
              <span>
                Processing:{' '}
                <strong>
                  {doc.extraction_method === 'pymupdf_digital'
                    ? 'High-Fidelity Digital Extraction'
                    : doc.extraction_method === 'scanned_pdf_unassisted'
                    ? 'Optical Document Parsing'
                    : 'Standard Text Extraction'}
                </strong>
              </span>
              <span>&bull;</span>
              <span>Quality Score: <strong>{Math.round(doc.image_quality_score * 100)}%</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to={`/fields?document_id=${doc.id}`}
            className="flex items-center space-x-1 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold rounded-lg transition-colors"
          >
            <span>Correct Fields</span>
          </Link>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Raw File</span>
          </a>
        </div>
      </div>

      {/* Degraded Scan / Low Confidence Warning Banner */}
      {(doc.image_quality_score < 0.70 || doc.extraction_status === 'low_confidence') && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start justify-between gap-3 text-xs text-amber-900 shadow-xs">
          <div className="flex items-start space-x-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-amber-900">Degraded Scan / Low-Confidence Extraction Notice</h4>
              <p className="text-amber-800 mt-0.5 leading-relaxed">
                Document scan clarity ({Math.round(doc.image_quality_score * 100)}%) is below standard high-confidence criteria. Some textual characters or stamps may be degraded. Compliance officers should verify extracted fields against the raw document stream below.
              </p>
            </div>
          </div>
          <Link
            to={`/fields?document_id=${doc.id}`}
            className="px-3 py-1.5 bg-amber-600 text-white hover:bg-amber-700 rounded-lg font-semibold flex-shrink-0 transition-colors"
          >
            Verify &amp; Correct Fields &rarr;
          </Link>
        </div>
      )}

      {/* Main 2-Column Layout: PDF Viewer + Evidence Claims Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-14rem)]">
        {/* Left Column: PDF.js Viewer (2 Cols) */}
        <div className="lg:col-span-2 h-full">
          <PdfViewer
            fileUrl={fileUrl}
            initialPage={activePage}
            activeBBox={activeBBox}
            onPageChange={(p) => setActivePage(p)}
          />
        </div>

        {/* Right Column: Evidence & Claims Selector */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Extracted Evidentiary Claims
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Select any claim below to jump to the page and highlight bounding box coordinates.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {fields.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No structured fields were extracted from this document.
              </div>
            ) : (
              fields.map((f) => {
                const isSelected = selectedFieldId === f.id;
                return (
                  <div
                    key={f.id}
                    onClick={() => handleFieldClick(f)}
                    className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/70 shadow-xs ring-1 ring-blue-500/30'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-900">
                        {f.field_name.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">Page {f.page_number}</span>
                    </div>

                    <div className="text-slate-800 font-medium break-words">
                      {f.is_corrected ? (
                        <span className="text-blue-700 font-bold bg-blue-100/60 px-1.5 py-0.5 rounded">
                          {f.corrected_value} (Corrected)
                        </span>
                      ) : (
                        f.normalized_value || f.raw_value || '—'
                      )}
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Conf: {Math.round(f.confidence * 100)}%</span>
                      {f.bbox_json && (
                        <span className="flex items-center space-x-1 text-blue-600 font-medium">
                          <Target className="w-3 h-3" />
                          <span>Coordinates Available</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Cryptographic SHA-256 Box */}
          <div className="p-3 border-t border-slate-100 bg-slate-50 text-[10px] space-y-0.5">
            <span className="font-semibold text-slate-700 block">SHA-256 Cryptographic Hash:</span>
            <div className="font-mono text-slate-500 break-all select-all">{doc.sha256_hash}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
