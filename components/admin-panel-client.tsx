"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  useMemo,
  useState,
} from "react";
import { isResourceNew } from "@/lib/resource-time";
import { ResourceItem } from "@/lib/resource-types";

type ResourceMode = "file" | "url";
type TagLanguage = "en" | "ar";

const labels = {
  title: "Admin Control Panel | لوحة التحكم",
  subtitle:
    "Upload and manage PDFs, images, and links with bilingual metadata and tags.",
  back: "Back to public page | العودة للصفحة العامة",
  create: "Add Resource | إضافة مورد",
  type: "Resource Type | نوع المورد",
  file: "File upload | رفع ملف",
  url: "URL link | رابط",
  titleEn: "Title (English)",
  titleAr: "العنوان (عربي)",
  descriptionEn: "Description (English)",
  descriptionAr: "الوصف (عربي)",
  tagsEn: "Tags (English)",
  tagsAr: "الوسوم (عربي)",
  tagsHintEn: "Type a tag and press Enter",
  tagsHintAr: "اكتب الوسم ثم اضغط Enter",
  addTag: "Add",
  urlLabel: "URL",
  fileLabel: "File (PDF / Image)",
  submit: "Save Resource | حفظ",
  loading: "Loading...",
  noResources: "No resources yet.",
  delete: "Delete",
  new: "New (3 days)",
};

function normalizeTag(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function AdminPanelClient({ initialResources }: { initialResources: ResourceItem[] }) {
  const router = useRouter();
  const [resources, setResources] = useState<ResourceItem[]>(initialResources);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resourceMode, setResourceMode] = useState<ResourceMode>("file");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [tagEnInput, setTagEnInput] = useState("");
  const [tagArInput, setTagArInput] = useState("");
  const [adminSearch, setAdminSearch] = useState("");
  const [adminSelectedTags, setAdminSelectedTags] = useState<string[]>([]);

  const [form, setForm] = useState({
    titleEn: "",
    titleAr: "",
    descriptionEn: "",
    descriptionAr: "",
    tagsEn: [] as string[],
    tagsAr: [] as string[],
    url: "",
  });

  async function refreshResources() {
    const response = await fetch("/api/resources?admin=1", { cache: "no-store" });
    const data = (await response.json()) as { resources: ResourceItem[] };
    setResources(data.resources ?? []);
  }


  const sortedResources = useMemo(
    () =>
      [...resources].sort((a, b) =>
        a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0,
      ),
    [resources],
  );

  const existingTagsEn = useMemo(() => {
    const values = new Set(resources.flatMap((item) => item.tagsEn));
    return [...values].sort((a, b) => a.localeCompare(b));
  }, [resources]);

  const existingTagsAr = useMemo(() => {
    const values = new Set(resources.flatMap((item) => item.tagsAr));
    return [...values].sort((a, b) => a.localeCompare(b));
  }, [resources]);

  const allAdminTags = useMemo(() => {
    const tags = new Set<string>();
    for (const r of resources) {
      for (const t of [...r.tagsEn, ...r.tagsAr]) {
        const v = t.trim();
        if (v) tags.add(v);
      }
    }
    return [...tags].sort((a, b) => a.localeCompare(b));
  }, [resources]);

  const adminFilteredResources = useMemo(() => {
    const query = adminSearch.trim().toLowerCase();
    return sortedResources.filter((r) => {
      const text = [r.titleEn, r.titleAr, r.descriptionEn, r.descriptionAr].join(" ").toLowerCase();
      const matchesText = !query || text.includes(query);
      const resourceTags = [...r.tagsEn, ...r.tagsAr].map((t) => t.toLowerCase());
      const matchesTags = adminSelectedTags.length === 0 ||
        adminSelectedTags.every((t) => resourceTags.includes(t.toLowerCase()));
      return matchesText && matchesTags;
    });
  }, [sortedResources, adminSearch, adminSelectedTags]);

  function toggleAdminTag(tag: string) {
    setAdminSelectedTags((current) =>
      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]
    );
  }

  function onFieldChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function addTag(language: TagLanguage, rawValue: string) {
    const value = normalizeTag(rawValue);
    if (!value) {
      return;
    }

    if (language === "en") {
      setForm((current) => ({
        ...current,
        tagsEn: current.tagsEn.includes(value)
          ? current.tagsEn
          : [...current.tagsEn, value],
      }));
      setTagEnInput("");
      return;
    }

    setForm((current) => ({
      ...current,
      tagsAr: current.tagsAr.includes(value)
        ? current.tagsAr
        : [...current.tagsAr, value],
    }));
    setTagArInput("");
  }

  function removeTag(language: TagLanguage, tag: string) {
    if (language === "en") {
      setForm((current) => ({
        ...current,
        tagsEn: current.tagsEn.filter((value) => value !== tag),
      }));
      return;
    }

    setForm((current) => ({
      ...current,
      tagsAr: current.tagsAr.filter((value) => value !== tag),
    }));
  }

  function onTagKeyDown(language: TagLanguage, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag(language, language === "en" ? tagEnInput : tagArInput);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const payload = new FormData();
      payload.set("resourceType", resourceMode);
      payload.set("titleEn", form.titleEn);
      payload.set("titleAr", form.titleAr);
      payload.set("descriptionEn", form.descriptionEn);
      payload.set("descriptionAr", form.descriptionAr);
      payload.set("tagsEn", form.tagsEn.join(","));
      payload.set("tagsAr", form.tagsAr.join(","));

      if (resourceMode === "url") {
        payload.set("url", form.url);
      } else if (file) {
        // Upload file directly to Vercel Blob (bypasses serverless body size limit)
        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/upload",
        });
        payload.set("storedPath", blob.url);
        payload.set("originalName", file.name);
        const ft = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
          ? "pdf"
          : file.type.startsWith("image/")
          ? "image"
          : "other";
        payload.set("fileType", ft);
      }

      const response = await fetch("/api/resources", {
        method: "POST",
        body: payload,
      });

      let data: { error?: string; resource?: ResourceItem } = {};
      try {
        data = (await response.json()) as { error?: string; resource?: ResourceItem };
      } catch {
        if (!response.ok) throw new Error(`Upload failed (${response.status})`);
      }

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save resource.");
      }

      setForm({
        titleEn: "",
        titleAr: "",
        descriptionEn: "",
        descriptionAr: "",
        tagsEn: [],
        tagsAr: [],
        url: "",
      });
      setTagEnInput("");
      setTagArInput("");
      setFile(null);
      setMessage("Resource saved successfully.");
      // Optimistically prepend the new resource — no extra round-trip needed
      if (data.resource) {
        setResources((prev) => [data.resource!, ...prev]);
      } else {
        await refreshResources();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save resource.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(resource: ResourceItem) {
    const shouldDelete = window.confirm(
      `Delete this resource?${resource.titleEn ? ` ${resource.titleEn}` : ""}`,
    );

    if (!shouldDelete) {
      return;
    }

    const response = await fetch(`/api/resources/${resource.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setMessage("Could not delete resource.");
      return;
    }

    await refreshResources();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/cp-admin/login");
  }

  return (
    <div className="min-h-screen page-shell admin-shell">
      <main className="container admin-stack">
        <section className="panel-glass">
          <h1 className="hero-title admin-title">{labels.title}</h1>
          <p className="hero-subtitle">{labels.subtitle}</p>
          <div className="admin-header-actions">
            <Link href="/" className="action-chip inline-flex">
              {labels.back}
            </Link>
            <button type="button" className="action-chip danger-chip" onClick={logout}>
              Sign out
            </button>
          </div>
        </section>

        <section className="panel-glass">
          <h2 className="form-title">{labels.create}</h2>
          <form onSubmit={onSubmit} className="admin-form">

            {/* ── Resource type & file/url ─────────────────────────── */}
            <div className="form-section">
              <p className="form-section-label">Resource</p>
              <div className="form-pair">
                <label className="form-field">
                  <span>{labels.type}</span>
                  <select
                    value={resourceMode}
                    onChange={(event) => setResourceMode(event.target.value as ResourceMode)}
                  >
                    <option value="file">{labels.file}</option>
                    <option value="url">{labels.url}</option>
                  </select>
                </label>

                {resourceMode === "url" ? (
                  <label className="form-field">
                    <span>{labels.urlLabel}</span>
                    <input
                      name="url"
                      type="url"
                      value={form.url}
                      onChange={onFieldChange}
                      placeholder="https://"
                      required
                    />
                  </label>
                ) : (
                  <div className="form-field">
                    <span>{labels.fileLabel}</span>
                    <label
                      className={`file-dropzone${dragOver ? " file-dropzone--active" : ""}`}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                        const dropped = e.dataTransfer.files[0];
                        if (dropped) setFile(dropped);
                      }}
                    >
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        className="file-dropzone-input"
                        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                        required
                      />
                      <svg className="file-dropzone-icon" width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="16 16 12 12 8 16"/>
                        <line x1="12" y1="12" x2="12" y2="21"/>
                        <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>
                      </svg>
                      <span className="file-dropzone-main">
                        {file ? file.name : "Drag and drop your file here"}
                      </span>
                      <span className="file-dropzone-hint">PDF or Image</span>
                      <span className="file-dropzone-btn">Browse files</span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* ── Bilingual content ────────────────────────────────── */}
            <div className="form-section">
              <p className="form-section-label">Bilingual Content</p>

              {/* Titles */}
              <div className="form-pair">
                <label className="form-field">
                  <span>{labels.titleEn}</span>
                  <input name="titleEn" value={form.titleEn} onChange={onFieldChange} />
                </label>
                <label className="form-field">
                  <span>{labels.titleAr}</span>
                  <input name="titleAr" value={form.titleAr} onChange={onFieldChange} dir="rtl" />
                </label>
              </div>

              {/* Descriptions */}
              <div className="form-pair">
                <label className="form-field">
                  <span>{labels.descriptionEn}</span>
                  <textarea
                    name="descriptionEn"
                    value={form.descriptionEn}
                    onChange={onFieldChange}
                    rows={3}
                  />
                </label>
                <label className="form-field">
                  <span>{labels.descriptionAr}</span>
                  <textarea
                    name="descriptionAr"
                    value={form.descriptionAr}
                    onChange={onFieldChange}
                    rows={3}
                    dir="rtl"
                  />
                </label>
              </div>

              {/* Tags */}
              <div className="form-pair">
                <div className="form-field">
                  <span className="form-field-label">{labels.tagsEn}</span>
                  <div className="tag-editor-row">
                    <input
                      list="tags-en-list"
                      value={tagEnInput}
                      onChange={(event) => setTagEnInput(event.target.value)}
                      onKeyDown={(event) => onTagKeyDown("en", event)}
                      onBlur={() => addTag("en", tagEnInput)}
                      placeholder={labels.tagsHintEn}
                    />
                    <button type="button" className="action-chip" onClick={() => addTag("en", tagEnInput)}>
                      {labels.addTag}
                    </button>
                  </div>
                  <datalist id="tags-en-list">
                    {existingTagsEn.map((tag) => <option key={tag} value={tag} />)}
                  </datalist>
                  <div className="tag-chip-wrap">
                    {form.tagsEn.map((tag) => (
                      <button key={tag} type="button" className="tag-chip" onClick={() => removeTag("en", tag)}>
                        {tag} ×
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-field">
                  <span className="form-field-label">{labels.tagsAr}</span>
                  <div className="tag-editor-row">
                    <input
                      list="tags-ar-list"
                      value={tagArInput}
                      onChange={(event) => setTagArInput(event.target.value)}
                      onKeyDown={(event) => onTagKeyDown("ar", event)}
                      onBlur={() => addTag("ar", tagArInput)}
                      placeholder={labels.tagsHintAr}
                      dir="rtl"
                    />
                    <button type="button" className="action-chip" onClick={() => addTag("ar", tagArInput)}>
                      {labels.addTag}
                    </button>
                  </div>
                  <datalist id="tags-ar-list">
                    {existingTagsAr.map((tag) => <option key={tag} value={tag} />)}
                  </datalist>
                  <div className="tag-chip-wrap">
                    {form.tagsAr.map((tag) => (
                      <button key={tag} type="button" className="tag-chip" onClick={() => removeTag("ar", tag)}>
                        {tag} ×
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Submit row ───────────────────────────────────────── */}
            <div className="form-footer-row">
              <button type="submit" disabled={saving} className="action-chip action-chip--accent">
                {saving ? labels.loading : labels.submit}
              </button>
            </div>

          </form>
          {message ? <p className="status-line mt-4">{message}</p> : null}
        </section>

        <section className="panel-glass">
          <h2 className="form-title">Resources</h2>

          {/* ── Admin filters ──────────────────────────────── */}
          {!loading && sortedResources.length > 0 ? (
            <div className="admin-filters">
              <input
                type="search"
                className="search-input"
                placeholder="Search by title or description…"
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
              />
              {allAdminTags.length > 0 ? (
                <div className="admin-tag-filter-wrap">
                  {allAdminTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className={`tag-chip${
                        adminSelectedTags.includes(tag) ? " tag-chip--active" : ""
                      }`}
                      onClick={() => toggleAdminTag(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {loading ? (
            <p className="status-line">{labels.loading}</p>
          ) : adminFilteredResources.length === 0 ? (
            <p className="status-line">{sortedResources.length === 0 ? labels.noResources : "No resources match the current filters."}</p>
          ) : (
            <div className="resource-grid admin-resource-grid">
              {adminFilteredResources.map((resource) => {
                const linkHref =
                  resource.kind === "url"
                    ? resource.url
                    : `/resources/${resource.id}`;
                const displayName =
                  resource.titleEn || resource.titleAr || resource.originalName;
                const isExternal = resource.kind === "url";
                const isNew = isResourceNew(resource.createdAt);

                return (
                  <article
                    key={resource.id}
                    className="resource-card admin-resource-card"
                  >
                    <div className="admin-card-body">
                      <div className="resource-meta-row">
                        <p className="resource-kind">
                          {resource.kind === "url"
                            ? "URL"
                            : `${resource.fileType.toUpperCase()} FILE`}
                        </p>
                        <div className="resource-meta-badges">
                          {isNew ? (
                            <span className="new-badge" aria-label={labels.new}>
                              <Image
                                src="/glimmer.png"
                                alt=""
                                width={12}
                                height={12}
                                className="glimmer-image"
                                aria-hidden="true"
                              />
                              {labels.new}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <h3 className="resource-title">{displayName}</h3>
                      <p className="resource-description">
                        {resource.descriptionEn || resource.descriptionAr || "-"}
                      </p>
                      <div className="tag-chip-wrap">
                        {resource.tagsEn.map((tag) => (
                          <span key={`${resource.id}-en-${tag}`} className="tag-chip tag-chip--readonly">
                            {tag}
                          </span>
                        ))}
                        {resource.tagsAr.map((tag) => (
                          <span key={`${resource.id}-ar-${tag}`} className="tag-chip tag-chip--readonly" dir="rtl">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="admin-actions">
                      {isExternal ? (
                        <a
                          href={linkHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="action-chip"
                        >
                          Open ↗
                        </a>
                      ) : (
                        <Link href={linkHref} className="action-chip">
                          Open
                        </Link>
                      )}
                      <button
                        type="button"
                        className="action-chip danger-chip"
                        onClick={() => deleteItem(resource)}
                      >
                        {labels.delete}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
