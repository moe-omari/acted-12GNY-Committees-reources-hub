"use client";

import { useLanguage } from "@/components/language-context";

interface Props {
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  tagsEn: string[];
  tagsAr: string[];
}

export function ResourceDetailInfo({
  titleEn,
  titleAr,
  descriptionEn,
  descriptionAr,
  tagsEn,
  tagsAr,
}: Props) {
  const { isArabic } = useLanguage();

  const title = isArabic ? titleAr : titleEn;
  const description = isArabic ? descriptionAr : descriptionEn;
  const tags = isArabic ? tagsAr : tagsEn;

  return (
    <section className="panel-glass resource-detail-card" dir={isArabic ? "rtl" : "ltr"}>
      {tags.length > 0 && (
        <div className="tag-chip-wrap">
          {tags.map((tag) => (
            <span key={tag} className="tag-chip tag-chip--readonly">{tag}</span>
          ))}
        </div>
      )}

      <h1 className="resource-detail-title-en">{title}</h1>

      {description && (
        <p className="resource-description">{description}</p>
      )}
    </section>
  );
}
