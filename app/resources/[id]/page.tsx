import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getPublicResourceById } from "@/lib/resource-store";
import { PdfViewer } from "@/components/pdf-viewer";

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

  const tagsEn = resource.tagsEn ?? [];
  const tagsAr = resource.tagsAr ?? [];
  const allTags = Array.from(new Set([...tagsEn, ...tagsAr]));

  return (
    <div className="min-h-screen page-shell">
      <main className="container admin-stack">

        {/* Back button — outside any card */}
        <div>
          <Link href="/" className="action-chip inline-flex">
            ← Back | العودة
          </Link>
        </div>

        {/* Single info card: tags + bilingual title + bilingual description */}
        <section className="panel-glass resource-detail-card">
          {allTags.length > 0 && (
            <div className="tag-chip-wrap">
              {allTags.map((tag) => (
                <span key={tag} className="tag-chip tag-chip--readonly">{tag}</span>
              ))}
            </div>
          )}

          <div className="resource-detail-titles">
            <h1 className="resource-detail-title-en">{titleEn}</h1>
            <h2 className="resource-detail-title-ar" dir="rtl">{titleAr}</h2>
          </div>

          {(descriptionEn || descriptionAr) && (
            <div className="resource-detail-descs">
              {descriptionEn && <p className="resource-description">{descriptionEn}</p>}
              {descriptionAr && <p className="resource-description" dir="rtl">{descriptionAr}</p>}
            </div>
          )}
        </section>

        {/* File preview card */}
        <section className="panel-glass resource-card">
          <p className="resource-kind">{resource.fileType.toUpperCase()} FILE</p>

          {isPdf && (
            <div className="resource-preview-shell">
              <PdfViewer url={fileUrl} title={titleEn} />
            </div>
          )}

          {isImage && (
            <div className="resource-preview-shell">
              <Image
                src={fileUrl}
                alt={titleEn}
                width={1600}
                height={1000}
                className="resource-image-preview"
              />
            </div>
          )}

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
