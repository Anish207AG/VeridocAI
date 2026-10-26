import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, AlertCircle, FileText } from 'lucide-react';

interface BBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

interface PdfViewerProps {
  fileUrl: string;
  initialPage?: number;
  activeBBox?: BBox | null;
  onPageChange?: (page: number) => void;
}

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  fileUrl,
  initialPage = 1,
  activeBBox = null,
  onPageChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [numPages, setNumPages] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<{ width: number; height: number }>({ width: 600, height: 800 });

  useEffect(() => {
    setCurrentPage(initialPage);
  }, [initialPage]);

  // Load PDF Document
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);

    const loadPdf = async () => {
      try {
        if (!window.pdfjsLib) {
          // If PDF.js script isn't ready yet, retry briefly
          await new Promise((r) => setTimeout(r, 400));
        }

        if (window.pdfjsLib) {
          const loadingTask = window.pdfjsLib.getDocument(fileUrl);
          const pdf = await loadingTask.promise;
          if (!isCancelled) {
            setPdfDoc(pdf);
            setNumPages(pdf.numPages);
            setLoading(false);
          }
        } else {
          // Fallback to iframe if pdfjsLib not accessible
          setLoading(false);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error("PDF load error:", err);
          setError(err.message || "Failed to load PDF document.");
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [fileUrl]);

  // Render Page to Canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let renderTask: any = null;

    const render = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;
        setPageSize({ width: viewport.width, height: viewport.height });

        renderTask = page.render({
          canvasContext: context,
          viewport: viewport,
        });

        await renderTask.promise;
      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException') {
          console.error("Render error:", err);
        }
      }
    };

    render();

    return () => {
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, currentPage, scale]);

  const handlePrev = () => {
    if (currentPage > 1) {
      const nextP = currentPage - 1;
      setCurrentPage(nextP);
      onPageChange?.(nextP);
    }
  };

  const handleNext = () => {
    if (currentPage < numPages) {
      const nextP = currentPage + 1;
      setCurrentPage(nextP);
      onPageChange?.(nextP);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
      {/* Viewer Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-700 text-white text-xs">
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrev}
            disabled={currentPage <= 1}
            className="p-1 rounded hover:bg-slate-800 disabled:opacity-40 transition-colors"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono">
            Page {currentPage} of {numPages}
          </span>
          <button
            onClick={handleNext}
            disabled={currentPage >= numPages}
            className="p-1 rounded hover:bg-slate-800 disabled:opacity-40 transition-colors"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setScale((s) => Math.max(0.7, s - 0.2))}
            className="p-1 rounded hover:bg-slate-800 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="font-mono text-[11px]">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale((s) => Math.min(2.5, s + 0.2))}
            className="p-1 rounded hover:bg-slate-800 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Canvas Viewport with Bounding Box Overlay */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 flex items-center justify-center relative bg-slate-900/50"
      >
        {loading && (
          <div className="text-slate-400 text-xs flex flex-col items-center">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
            Loading Document Stream...
          </div>
        )}

        {error && (
          <div className="text-center p-6 bg-slate-800/90 rounded-lg border border-slate-700 max-w-md">
            <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-200">PDF Preview Fallback</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">{error}</p>
            <iframe src={fileUrl} className="w-full h-96 rounded border border-slate-600" title="PDF Fallback" />
          </div>
        )}

        {!loading && !error && (
          <div className="relative shadow-2xl rounded bg-white">
            <canvas ref={canvasRef} className="block rounded" />

            {/* Bounding Box Highlight Overlay */}
            {activeBBox && (
              <div
                className="absolute border-2 border-amber-500 bg-amber-400/25 pointer-events-none rounded transition-all duration-300 animate-pulse"
                style={{
                  left: `${activeBBox.x0 * 100}%`,
                  top: `${activeBBox.y0 * 100}%`,
                  width: `${(activeBBox.x1 - activeBBox.x0) * 100}%`,
                  height: `${(activeBBox.y1 - activeBBox.y0) * 100}%`,
                }}
              >
                <span className="absolute -top-5 left-0 bg-amber-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                  Evidence
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
