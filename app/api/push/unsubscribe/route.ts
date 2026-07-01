import { NextResponse } from "next/server";
import { removeSubscription } from "@/lib/push-store";

export const runtime = "nodejs";

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as { endpoint?: string };
    if (!body.endpoint) {
      return NextResponse.json({ error: "Missing endpoint." }, { status: 400 });
    }
    await removeSubscription(body.endpoint);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not remove subscription." }, { status: 500 });
  }
}
