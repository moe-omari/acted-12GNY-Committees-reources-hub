"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/components/language-context";
import { ResourceItem } from "@/lib/resource-types";
import { isResourceNew } from "@/lib/resource-time";

type Language = "en" | "ar";

const content = {
  en: {
    heading: "Site Committee Resource Hub",
    subtitle:
      "A practical handover library with policy files, visuals, and useful links for long-term site management.",
    empty: "No resources are currently published.",
    new: "New",
  },
  ar: {
    heading: "مركز موارد لجنة إدارة الموقع",
    subtitle:
      "مكتبة تسليم عملية تضم الملفات والسياسات والروابط اللازمة لاستمرار إدارة الموقع بعد الخروج.",
    empty: "لا توجد موارد منشورة حالياً.",
    new: "جديد",
  },
};

function displayTitle(resource: ResourceItem, lang: Language) {
  if (lang === "ar") {
    return resource.titleAr || resource.titleEn;
  }

  return resource.titleEn || resource.titleAr;
}

function displayDescription(resource: ResourceItem, lang: Language) {
  if (lang === "ar") {
    return resource.descriptionAr || resource.descriptionEn;
  }

  return resource.descriptionEn || resource.descriptionAr;
}

export default function Home() {
  const { lang, isArabic } = useLanguage();
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    async function loadResources() {
      const response = await fetch("/api/resources", { cache: "no-store" });
      const data = (await response.json()) as { resources: ResourceItem[] };
      setResources(data.resources ?? []);
      setLoading(false);
    }

    loadResources().catch(() => setLoading(false));
  }, []);

  const copy = content[lang];

  const searchPlaceholder = isArabic
    ? "ابحث بالعنوان أو الوصف"
    : "Search by title or description";
  const tagFilterPlaceholder = isArabic ? "تصفية بالوسوم…" : "Filter by tag…";
  const addTagLabel = isArabic ? "إضافة" : "Add";
  const selectedLabel = isArabic ? "الوسوم المختارة" : "Selected tags";

  const sortedResources = useMemo(
    () =>
      [...resources].sort((a, b) =>
        a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0,
      ),
    [resources],
  );

  const availableTags = useMemo(() => {
    const tags = new Set<string>();

    for (const resource of sortedResources) {
      for (const tag of [...resource.tagsEn, ...resource.tagsAr]) {
        const normalized = tag.trim();
        if (normalized) {
          tags.add(normalized);
        }
      }
    }

    return [...tags].sort((a, b) => a.localeCompare(b));
  }, [sortedResources]);

  const filteredResources = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return sortedResources.filter((resource) => {
      const searchableText = [
        resource.titleEn,
        resource.titleAr,
        resource.descriptionEn,
        resource.descriptionAr,
      ]
        .join(" ")
        .toLowerCase();

      const matchesText = !query || searchableText.includes(query);

      const resourceTags = [...resource.tagsEn, ...resource.tagsAr].map((tag) =>
        tag.toLowerCase(),
      );
      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.every((tag) => resourceTags.includes(tag.toLowerCase()));

      return matchesText && matchesTags;
    });
  }, [searchTerm, selectedTags, sortedResources]);

  function addTagFilter(tag: string) {
    const value = tag.trim();
    if (!value || selectedTags.includes(value)) {
      return;
    }

    setSelectedTags((current) => [...current, value]);
    setTagInput("");
  }

  function onTagFilterKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTagFilter(tagInput);
    }

    if (event.key === "Backspace" && tagInput === "" && selectedTags.length > 0) {
      setSelectedTags((current) => current.slice(0, -1));
    }
  }

  function removeTagFilter(tag: string) {
    setSelectedTags((current) => current.filter((item) => item !== tag));
  }

  return (
    <div dir={isArabic ? "rtl" : "ltr"} className="min-h-screen page-shell">
      <section className="hero-wrap">
        <div className="container panel-glass">
          <p className="hero-subtitle">{copy.subtitle}</p>

          <div className="search-tools" role="search">
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={searchPlaceholder}
              className="search-input"
            />

            <div className="tag-filter-input-wrap">
              <input
                list="public-tags-list"
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={onTagFilterKeyDown}
                placeholder={tagFilterPlaceholder}
                className="search-input tag-filter-input"
                autoComplete="off"
              />
              <datalist id="public-tags-list">
                {availableTags
                  .filter((tag) => !selectedTags.includes(tag))
                  .map((tag) => (
                    <option key={tag} value={tag} />
                  ))}
              </datalist>
              <button
                type="button"
                className="action-chip action-chip--accent tag-filter-add-btn"
                onClick={() => addTagFilter(tagInput)}
                aria-label={addTagLabel}
              >
                {addTagLabel}
              </button>
            </div>

            {selectedTags.length > 0 ? (
              <div className="selected-tags-wrap" aria-label={selectedLabel}>
                {selectedTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="tag-filter-pill"
                    onClick={() => removeTagFilter(tag)}
                  >
                    {tag} ×
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <main className="container resource-grid">
        {loading ? (
          <p className="panel-glass status-line">Loading resources...</p>
        ) : filteredResources.length === 0 ? (
          <p className="panel-glass status-line">{copy.empty}</p>
        ) : (
          filteredResources.map((resource) => {
            const href =
              resource.kind === "url"
                ? resource.url
                : `/resources/${resource.id}`;
            const isExternal = resource.kind === "url";
            const isNew = isResourceNew(resource.createdAt);
            const title = displayTitle(resource, lang);
            const description = displayDescription(resource, lang) || "-";

            const cardBody = (
              <article className="panel-glass resource-card resource-card-clickable">
                <div className="resource-meta-row">
                  <span className="resource-kind">
                    {resource.kind === "url" ? "URL" : resource.fileType.toUpperCase()}
                  </span>
                  {isNew ? (
                    <span className="new-badge" aria-label={copy.new}>
                      <Image
                        src="/glimmer.png"
                        alt=""
                        width={12}
                        height={12}
                        className="glimmer-image"
                        aria-hidden="true"
                      />
                      {copy.new}
                    </span>
                  ) : null}
                </div>
                <h2 className="resource-title">{title}</h2>
                <p className="resource-description">{description}</p>
                {(() => {
                  const tags = isArabic
                    ? (resource.tagsAr.length ? resource.tagsAr : resource.tagsEn)
                    : (resource.tagsEn.length ? resource.tagsEn : resource.tagsAr);
                  return tags.length ? (
                    <div className="tag-chip-wrap card-tags">
                      {tags.map((tag) => (
                        <span key={tag} className="tag-chip tag-chip--readonly">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null;
                })()}
              </article>
            );

            if (isExternal) {
              return (
                <a
                  key={resource.id}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card-link-wrap"
                  aria-label={title}
                >
                  {cardBody}
                </a>
              );
            }

            return (
              <Link key={resource.id} href={href} className="card-link-wrap" aria-label={title}>
                {cardBody}
              </Link>
            );
          })
        )}
      </main>
    </div>
  );
}
