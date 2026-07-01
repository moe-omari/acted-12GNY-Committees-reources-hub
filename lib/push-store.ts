import { put, list } from "@vercel/blob";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import webpush from "web-push";

const USE_BLOB = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const BLOB_SUBS_PATH = "data/subscriptions.json";

let cachedSubsUrl: string | null = null;
const DATA_DIR = path.join(process.cwd(), "data");
const SUBS_FILE = path.join(DATA_DIR, "subscriptions.json");

type StoredSubscription = {
  endpoint: string;
  expirationTime: number | null;
  keys: { p256dh: string; auth: string };
};

export async function readSubs(): Promise<StoredSubscription[]> {
  if (USE_BLOB) {
    try {
      let url = cachedSubsUrl;
      if (!url) {
        const { blobs } = await list({ prefix: BLOB_SUBS_PATH });
        if (blobs.length === 0) return [];
        url = blobs[0].downloadUrl;
        cachedSubsUrl = url;
      }
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        cachedSubsUrl = null;
        return [];
      }
      return (await res.json()) as StoredSubscription[];
    } catch {
      cachedSubsUrl = null;
      return [];
    }
  }

  try {
    await mkdir(DATA_DIR, { recursive: true });
    const raw = await readFile(SUBS_FILE, "utf-8");
    return JSON.parse(raw) as StoredSubscription[];
  } catch {
    return [];
  }
}

async function writeSubs(subs: StoredSubscription[]): Promise<void> {
  const json = JSON.stringify(subs, null, 2);
  if (USE_BLOB) {
    const result = await put(BLOB_SUBS_PATH, json, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
    cachedSubsUrl = result.downloadUrl;
    return;
  }
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(SUBS_FILE, json, "utf-8");
}

export async function addSubscription(sub: StoredSubscription): Promise<void> {
  const subs = await readSubs();
  if (!subs.some((s) => s.endpoint === sub.endpoint)) {
    subs.push(sub);
    await writeSubs(subs);
  }
}

export async function removeSubscription(endpoint: string): Promise<void> {
  const subs = await readSubs();
  await writeSubs(subs.filter((s) => s.endpoint !== endpoint));
}

export type SendResult = {
  endpoint: string;
  ok: boolean;
  status?: number;
  error?: string;
};

export async function sendNotificationToAll(payload: {
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
  url?: string;
}): Promise<SendResult[]> {
  const { NEXT_PUBLIC_VAPID_PUBLIC_KEY: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.error("[push] Missing VAPID keys — cannot send notifications.", {
      hasPublic: Boolean(VAPID_PUBLIC_KEY),
      hasPrivate: Boolean(VAPID_PRIVATE_KEY),
    });
    return [];
  }

  webpush.setVapidDetails(
    VAPID_SUBJECT || "mailto:admin@example.com",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY,
  );

  const subs = await readSubs();
  if (subs.length === 0) return [];

  const expired: string[] = [];
  const results: SendResult[] = [];

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, JSON.stringify(payload));
        results.push({ endpoint: sub.endpoint, ok: true });
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        const errStr = String(err);
        console.error("[push] send failed:", sub.endpoint.slice(0, 40), "status:", status, errStr);
        results.push({ endpoint: sub.endpoint, ok: false, status, error: errStr });
        if (status === 410 || status === 404) {
          expired.push(sub.endpoint);
        }
      }
    }),
  );

  if (expired.length > 0) {
    await writeSubs(subs.filter((s) => !expired.includes(s.endpoint)));
  }

  return results;
}
