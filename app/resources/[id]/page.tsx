import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getPublicResourceById } from "@/lib/resource-store";

function pickText(primary: string, fallback: string) {
  return primary.trim() || fallback.trim();
}

export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const resource = await getPublicResourceById(id);

  if (!resource || resource.kind === "url") {
    notFound();
  }

  const titleEn = pickText(resource.titleEn, resource.titleAr || resource.originalName);
  const titleAr = pickText(resource.titleAr, resource.titleEn || resource.originalName);
  const descriptionEn = pickText(resource.descriptionEn, resource.descriptionAr);
  const descriptionAr = pickText(resource.descriptionAr, resource.descriptionEn);
  const fileUrl = resource.storedPath;
  const isPdf = resource.fileType === "pdf";
  const isImage = resource.fileType === "image";

  return (
    <div className="min-h-screen page-shell">
      <main className="container admin-stack">
        <section className="panel-glass">
          <div className="hero-header-row">
            <h1 className="hero-title admin-title">{titleEn}</h1>
            <Link href="/" className="action-chip">
              Back | العودة
            </Link>
          </div>
          <p className="hero-subtitle">{descriptionEn || "-"}</p>
        </section>

        <section className="panel-glass" dir="rtl">
          <h2 className="form-title">{titleAr}</h2>
          <p className="resource-description">{descriptionAr || "-"}</p>
        </section>

        <section className="panel-glass resource-card">
          <p className="resource-kind">{resource.fileType.toUpperCase()} FILE</p>
          <p className="resource-description">
            Original name: {resource.originalName || "-"}
          </p>

          {isPdf ? (
            <div className="resource-preview-shell">
              {/* Desktop: inline iframe */}
              <iframe
                title={titleEn}
                src={fileUrl}
                className="resource-pdf-frame"
              />
              {/* Mobile: iframe doesn't render PDFs — show an open button instead */}
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="resource-pdf-mobile-open"
              >
                📄 افتح ملف PDF / Open PDF
              </a>
            </div>
          ) : null}

          {isImage ? (
            <div className="resource-preview-shell">
              <Image
                src={fileUrl}
                alt={titleEn}
                width={1600}
                height={1000}
                className="resource-image-preview"
              />
            </div>
          ) : null}

          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="resource-link"
          >
            Open file | فتح الملف
          </a>
        </section>
      </main>
    </div>
  );
}
