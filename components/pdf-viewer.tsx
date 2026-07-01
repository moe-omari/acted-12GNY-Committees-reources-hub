"use client";

import { useState, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Use the bundled worker from pdfjs-dist (shipped with react-pdf)
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export function PdfViewer({ url, title }: { url: string; title: string }) {
  const [numPages, setNumPages] = useState<number>(0);
  const [error, setError] = useState(false);

  const onLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  }, []);

  const onLoadError = useCallback(() => {
    setError(true);
  }, []);

  if (error) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="resource-pdf-mobile-open"
      >
        📄 افتح ملف PDF / Open PDF
      </a>
    );
  }

  return (
    <div className="pdf-viewer-wrap">
      <Document
        file={url}
        onLoadSuccess={onLoadSuccess}
        onLoadError={onLoadError}
        loading={<div className="pdf-viewer-loading">جاري التحميل… / Loading…</div>}
        error={
          <a href={url} target="_blank" rel="noopener noreferrer" className="resource-pdf-mobile-open">
            📄 افتح ملف PDF / Open PDF
          </a>
        }
      >
        {Array.from({ length: numPages }, (_, i) => (
          <Page
            key={i + 1}
            pageNumber={i + 1}
            className="pdf-viewer-page"
            width={typeof window !== "undefined" ? Math.min(window.innerWidth - 32, 900) : 900}
            renderTextLayer
            renderAnnotationLayer
          />
        ))}
      </Document>
      {numPages > 1 && (
        <p className="pdf-viewer-pagecount">{numPages} pages</p>
      )}
    </div>
  );
}
