import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { put, del, list } from "@vercel/blob";
import {
  ResourceCreatePayload,
  ResourceItem,
  ResourceUpdatePayload,
} from "@/lib/resource-types";

// When BLOB_READ_WRITE_TOKEN is present we use Vercel Blob for both files and
// metadata. When it is absent (local dev) we fall back to the filesystem.
const USE_BLOB = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "resources.json");
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
const BLOB_METADATA_PATH = "data/resources.json";

const EMPTY_RESOURCE_LIST: ResourceItem[] = [];

async function ensureStorage() {
  if (USE_BLOB) return; // no local dirs needed
  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(UPLOADS_DIR, { recursive: true });

  try {
    await readFile(DATA_FILE, "utf-8");
  } catch {
    await writeFile(DATA_FILE, JSON.stringify(EMPTY_RESOURCE_LIST, null, 2), "utf-8");
  }
}

function normalizeText(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function inferFileType(file: File): ResourceItem["fileType"] {
  const loweredName = file.name.toLowerCase();

  if (file.type.includes("pdf") || loweredName.endsWith(".pdf")) {
    return "pdf";
  }

  if (file.type.startsWith("image/")) {
    return "image";
  }

  return "other";
}

function sanitizeFileName(fileName: string): string {
  const normalized = fileName.toLowerCase().replace(/\s+/g, "-");
  return normalized.replace(/[^a-z0-9._-]/g, "");
}

function normalizeTags(tags: string[]): string[] {
  const cleaned = tags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => tag.replace(/\s+/g, " "));

  return [...new Set(cleaned)];
}

function parseTagList(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") {
    return [];
  }

  return normalizeTags(value.split(","));
}

async function readResources(): Promise<ResourceItem[]> {
  if (USE_BLOB) {
    // Fetch metadata JSON from Vercel Blob storage.
    // list() gives us the downloadUrl which bypasses CDN caching.
    const { blobs } = await list({ prefix: BLOB_METADATA_PATH });
    if (blobs.length === 0) return [];

    try {
      const response = await fetch(blobs[0].downloadUrl);
      if (!response.ok) return [];
      const parsed = (await response.json()) as Array<Partial<ResourceItem>>;
      return normalizeResourceList(parsed);
    } catch {
      return [];
    }
  }

  await ensureStorage();
  const raw = await readFile(DATA_FILE, "utf-8");

  try {
    const parsed = JSON.parse(raw) as Array<Partial<ResourceItem>>;
    return normalizeResourceList(parsed);
  } catch {
    return EMPTY_RESOURCE_LIST;
  }
}

function normalizeResourceList(parsed: Array<Partial<ResourceItem>>): ResourceItem[] {
  return parsed.map((item) => ({
    id: item.id ?? randomUUID(),
    kind: item.kind ?? "file",
    fileType: item.fileType ?? "other",
    titleEn: item.titleEn ?? "",
    titleAr: item.titleAr ?? "",
    descriptionEn: item.descriptionEn ?? "",
    descriptionAr: item.descriptionAr ?? "",
    tagsEn: normalizeTags(item.tagsEn ?? []),
    tagsAr: normalizeTags(item.tagsAr ?? []),
    url: item.url ?? "",
    storedPath: item.storedPath ?? "",
    originalName: item.originalName ?? "",
    createdAt: item.createdAt ?? new Date().toISOString(),
    updatedAt: item.updatedAt ?? new Date().toISOString(),
  }));
}

async function writeResources(resources: ResourceItem[]) {
  const json = JSON.stringify(resources, null, 2);

  if (USE_BLOB) {
    await put(BLOB_METADATA_PATH, json, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
    return;
  }

  await ensureStorage();
  await writeFile(DATA_FILE, json, "utf-8");
}

function buildMeta(payload: ResourceCreatePayload) {
  const titleEn = payload.titleEn.trim();
  const titleAr = payload.titleAr.trim();

  if (!titleEn && !titleAr) {
    throw new Error("At least one title is required (Arabic or English).");
  }

  return {
    titleEn,
    titleAr,
    descriptionEn: payload.descriptionEn.trim(),
    descriptionAr: payload.descriptionAr.trim(),
    tagsEn: normalizeTags(payload.tagsEn),
    tagsAr: normalizeTags(payload.tagsAr),
  };
}

export async function listPublicResources(): Promise<ResourceItem[]> {
  return readResources();
}

export async function listAdminResources(): Promise<ResourceItem[]> {
  return readResources();
}

export async function getResourceById(id: string): Promise<ResourceItem | null> {
  const resources = await readResources();
  return resources.find((item) => item.id === id) ?? null;
}

export async function getPublicResourceById(
  id: string,
): Promise<ResourceItem | null> {
  const resource = await getResourceById(id);

  if (!resource) {
    return null;
  }

  return resource;
}

export async function createUrlResource(
  payload: ResourceCreatePayload,
  url: string,
): Promise<ResourceItem> {
  const cleanUrl = url.trim();

  if (!cleanUrl) {
    throw new Error("URL is required for URL resources.");
  }

  try {
    new URL(cleanUrl);
  } catch {
    throw new Error("Please provide a valid URL.");
  }

  const now = new Date().toISOString();
  const resources = await readResources();

  const created: ResourceItem = {
    id: randomUUID(),
    kind: "url",
    fileType: "url",
    ...buildMeta(payload),
    url: cleanUrl,
    storedPath: "",
    originalName: "",
    createdAt: now,
    updatedAt: now,
  };

  resources.unshift(created);
  await writeResources(resources);
  return created;
}

export async function createFileResource(
  payload: ResourceCreatePayload,
  file: File,
): Promise<ResourceItem> {
  if (!file || file.size === 0) {
    throw new Error("A file is required.");
  }

  const now = new Date().toISOString();
  const ext = path.extname(file.name);
  const safeName = sanitizeFileName(path.basename(file.name, ext));
  const generatedName = `${Date.now()}-${safeName || "resource"}${ext}`;

  let storedPath: string;

  if (USE_BLOB) {
    const blob = await put(`uploads/${generatedName}`, await file.arrayBuffer(), {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type || "application/octet-stream",
    });
    storedPath = blob.url;
  } else {
    const absoluteFilePath = path.join(UPLOADS_DIR, generatedName);
    await ensureStorage();
    await writeFile(absoluteFilePath, Buffer.from(await file.arrayBuffer()));
    storedPath = `/uploads/${generatedName}`;
  }

  const resources = await readResources();
  const created: ResourceItem = {
    id: randomUUID(),
    kind: "file",
    fileType: inferFileType(file),
    ...buildMeta(payload),
    url: "",
    storedPath,
    originalName: file.name,
    createdAt: now,
    updatedAt: now,
  };

  resources.unshift(created);
  await writeResources(resources);
  return created;
}

export async function updateResource(
  id: string,
  updates: ResourceUpdatePayload,
): Promise<ResourceItem> {
  const resources = await readResources();
  const index = resources.findIndex((item) => item.id === id);

  if (index === -1) {
    throw new Error("Resource not found.");
  }

  const existing = resources[index];
  const next: ResourceItem = {
    ...existing,
    ...updates,
    tagsEn: updates.tagsEn ? normalizeTags(updates.tagsEn) : existing.tagsEn,
    tagsAr: updates.tagsAr ? normalizeTags(updates.tagsAr) : existing.tagsAr,
    updatedAt: new Date().toISOString(),
  };

  if (!next.titleEn.trim() && !next.titleAr.trim()) {
    throw new Error("At least one title is required (Arabic or English).");
  }

  resources[index] = next;
  await writeResources(resources);
  return next;
}

export async function deleteResource(id: string): Promise<void> {
  const resources = await readResources();
  const index = resources.findIndex((item) => item.id === id);

  if (index === -1) {
    throw new Error("Resource not found.");
  }

  const [removed] = resources.splice(index, 1);

  if (removed.kind === "file" && removed.storedPath) {
    try {
      if (USE_BLOB && removed.storedPath.startsWith("http")) {
        await del(removed.storedPath);
      } else if (!USE_BLOB) {
        const normalizedPath = removed.storedPath.replace(/^\//, "");
        const absoluteFile = path.join(process.cwd(), "public", normalizedPath);
        await unlink(absoluteFile);
      }
    } catch {
      // File might already be removed; continue deleting metadata.
    }
  }

  await writeResources(resources);
}

export function parseCreatePayload(formData: FormData): ResourceCreatePayload {
  return {
    titleEn: normalizeText(formData.get("titleEn")),
    titleAr: normalizeText(formData.get("titleAr")),
    descriptionEn: normalizeText(formData.get("descriptionEn")),
    descriptionAr: normalizeText(formData.get("descriptionAr")),
    tagsEn: parseTagList(formData.get("tagsEn")),
    tagsAr: parseTagList(formData.get("tagsAr")),
  };
}
