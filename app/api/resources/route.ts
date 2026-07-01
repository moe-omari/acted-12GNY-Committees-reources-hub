import { NextResponse } from "next/server";
import {
  createFileResource,
  createPreUploadedFileResource,
  createUrlResource,
  listAdminResources,
  listPublicResources,
  parseCreatePayload,
} from "@/lib/resource-store";
import { sendNotificationToAll } from "@/lib/push-store";
import type { ResourceItem } from "@/lib/resource-types";

function buildNotificationPayload(resource: ResourceItem, url: string) {
  const nameEn = resource.titleEn || resource.originalName || "New Resource";
  const nameAr = resource.titleAr || resource.originalName || "مورد جديد";
  return {
    titleEn: "📢 New Resource Available",
    titleAr: "📢 مورد جديد متاح",
    bodyEn: `Dear committee member, a new resource has been added:\n"${nameEn}"`,
    bodyAr: `عزيزي عضو اللجنة، تمت إضافة مورد جديد:\n"${nameAr}"`,
    url,
  };
}

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const isAdmin = searchParams.get("admin") === "1";

  const resources = isAdmin
    ? await listAdminResources()
    : await listPublicResources();

  return NextResponse.json({ resources });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const resourceType = formData.get("resourceType");
    const payload = parseCreatePayload(formData);

    if (resourceType === "url") {
      const url = typeof formData.get("url") === "string" ? String(formData.get("url")) : "";
      const resource = await createUrlResource(payload, url);
      // Fire-and-forget — don't block the response
      void sendNotificationToAll(buildNotificationPayload(resource, "/"));
      return NextResponse.json({ resource }, { status: 201 });
    }

    // Pre-uploaded via client-side blob upload
    const storedPath = formData.get("storedPath");
    const originalName = formData.get("originalName");
    const fileTypeField = formData.get("fileType");
    if (typeof storedPath === "string" && storedPath && typeof originalName === "string") {
      const fileType = (fileTypeField as ResourceItem["fileType"]) || "other";
      const resource = await createPreUploadedFileResource(payload, storedPath, originalName, fileType);
      void sendNotificationToAll(buildNotificationPayload(resource, `/resources/${resource.id}`));
      return NextResponse.json({ resource }, { status: 201 });
    }

    const fileCandidate = formData.get("file");

    if (!(fileCandidate instanceof File)) {
      return NextResponse.json(
        { error: "Please attach a valid file." },
        { status: 400 },
      );
    }

    const resource = await createFileResource(payload, fileCandidate);
    void sendNotificationToAll(buildNotificationPayload(resource, resource.kind === "file" ? `/resources/${resource.id}` : "/"));
    return NextResponse.json({ resource }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create resource.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
