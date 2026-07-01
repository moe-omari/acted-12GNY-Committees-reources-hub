import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { list } from "@vercel/blob";
import { addSubscription } from "@/lib/push-store";

export const runtime = "nodejs";

// Admin-only diagnostics endpoint
// Visit /api/push/debug while logged in as admin
export async function GET() {
  // Auth check
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("admin-session")?.value;
  const username = process.env.ADMIN_USERNAME ?? "";
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!username || !password) {
    return NextResponse.json({ error: "Credentials not configured." }, { status: 500 });
  }
  const expectedToken = createHash("sha256")
    .update(`${username}:${password}`)
    .digest("hex");
  if (sessionCookie !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Gather diagnostics
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

  let subsCount = 0;
  let subsError: string | null = null;
  let subsData: unknown[] = [];
  try {
    const { blobs } = await list({ prefix: "data/subscriptions.json" });
    if (blobs.length > 0) {
      const res = await fetch(blobs[0].downloadUrl);
      if (res.ok) {
        const data = await res.json() as unknown[];
        subsCount = data.length;
        subsData = data;
      } else {
        subsError = `Blob fetch failed: ${res.status}`;
      }
    } else {
      subsError = "No subscriptions.json blob found — no one has subscribed yet.";
    }
  } catch (e) {
    subsError = String(e);
  }

  return NextResponse.json({
    vapid: {
      publicKeySet: Boolean(vapidPublic),
      publicKeyPreview: vapidPublic
        ? `${vapidPublic.slice(0, 8)}...${vapidPublic.slice(-6)}`
        : null,
      privateKeySet: Boolean(vapidPrivate),
      subjectSet: Boolean(vapidSubject),
      subject: vapidSubject ?? null,
    },
    blob: {
      tokenSet: Boolean(blobToken),
    },
    subscriptions: {
      count: subsCount,
      error: subsError,
      endpoints: (subsData as { endpoint?: string }[]).map((s) =>
        s.endpoint ? `${s.endpoint.slice(0, 40)}...` : "unknown"
      ),
    },
  });
}

// POST: send a test notification to all subscribers
export async function POST() {
  // Auth check
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("admin-session")?.value;
  const username = process.env.ADMIN_USERNAME ?? "";
  const password = process.env.ADMIN_PASSWORD ?? "";
  const expectedToken = createHash("sha256")
    .update(`${username}:${password}`)
    .digest("hex");
  if (sessionCookie !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { sendNotificationToAll } = await import("@/lib/push-store");

  let errorMsg: string | null = null;
  try {
    await sendNotificationToAll({
      title: "Test Notification",
      body: "Push notifications are working!",
      url: "/",
    });
  } catch (e) {
    errorMsg = String(e);
  }

  return NextResponse.json({ sent: !errorMsg, error: errorMsg });
}
