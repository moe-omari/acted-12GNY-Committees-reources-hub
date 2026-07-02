"use client";

import Link from "next/link";
import { useLanguage } from "@/components/language-context";

interface Props {
  resourceId: string;
  fileUrl: string;
  originalName: string;
}

export function ResourceDetailActions({ resourceId, fileUrl, originalName }: Props) {
  const { isArabic } = useLanguage();

  return (
    <div className="detail-top-bar">
      <Link href="/" className="action-chip inline-flex">
        {isArabic ? "→ العودة" : "← Back"}
      </Link>
      <a
        href={`/api/download/${resourceId}`}
        download={originalName}
        className="action-chip inline-flex"
      >
        {isArabic ? "⬇ تنزيل" : "⬇ Download"}
      </a>
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="action-chip inline-flex"
      >
        {isArabic ? "↗ فتح الملف" : "↗ Open file"}
      </a>
    </div>
  );
}
