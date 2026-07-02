"use client";

import { useLanguage } from "@/components/language-context";

export function PdfViewer({ url, title }: { url: string; title: string }) {
  const { isArabic } = useLanguage();

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
        {isArabic ? "📄 عرض الملف" : "📄 View PDF"}
      </a>
    </div>
  );
}
