"use client";

export function PdfViewer({ url, title }: { url: string; title: string }) {
  return (
    <div className="pdf-viewer-wrap">
      {/* Desktop: native browser iframe PDF viewer */}
      <iframe
        src={url}
        title={title}
        className="pdf-viewer-frame"
        allow="fullscreen"
      />
      {/* Mobile: iframes don't render PDFs — open natively in a new tab */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="pdf-mobile-open-btn"
      >
        📄 View PDF / عرض الملف
      </a>
    </div>
  );
}
