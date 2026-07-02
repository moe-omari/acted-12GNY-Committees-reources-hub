import { NextResponse } from "next/server";
import { getPublicResourceById } from "@/lib/resource-store";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const resource = await getPublicResourceById(id);

  if (!resource || !resource.storedPath || resource.kind === "url") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const upstream = await fetch(resource.storedPath);
  if (!upstream.ok) {
    return NextResponse.json({ error: "File unavailable." }, { status: 502 });
  }

  const filename = resource.originalName || `file-${id}`;
  const contentType =
    upstream.headers.get("Content-Type") || "application/octet-stream";

  return new Response(upstream.body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, max-age=86400",
    },
  });
}
