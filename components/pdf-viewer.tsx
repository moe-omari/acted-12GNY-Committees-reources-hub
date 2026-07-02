"use client";

export function PdfViewer({ url, title }: { url: string; title: string }) {
  return (
    <div className="pdf-viewer-wrap">
      <iframe
        src={url}
        title={title}
        className="pdf-viewer-frame"
        allow="fullscreen"
      />
    </div>
  );
}
