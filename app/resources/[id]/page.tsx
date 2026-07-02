import Image from "next/image";
import { notFound } from "next/navigation";
import { getPublicResourceById } from "@/lib/resource-store";
import { PdfViewer } from "@/components/pdf-viewer";
import { ResourceDetailInfo } from "@/components/resource-detail-info";
import { ResourceDetailActions } from "@/components/resource-detail-actions";

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

  return (
    <div className="min-h-screen page-shell">
      <main className="container admin-stack">

        {/* Language-aware action bar */}
        <ResourceDetailActions
          resourceId={resource.id}
          fileUrl={fileUrl}
          originalName={resource.originalName || `file-${resource.id}`}
        />

        {/* Language-aware info card (client component reads lang from context) */}
        <ResourceDetailInfo
          titleEn={titleEn}
          titleAr={titleAr}
          descriptionEn={descriptionEn}
          descriptionAr={descriptionAr}
          tagsEn={tagsEn}
          tagsAr={tagsAr}
        />

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
        </section>

      </main>
    </div>
  );
}
