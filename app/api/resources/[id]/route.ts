import { NextResponse } from "next/server";
import { deleteResource, updateResource } from "@/lib/resource-store";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const body = (await request.json()) as {
      titleEn?: string;
      titleAr?: string;
      descriptionEn?: string;
      descriptionAr?: string;
    };

    const { id } = await params;
    const resource = await updateResource(id, {
      titleEn: body.titleEn,
      titleAr: body.titleAr,
      descriptionEn: body.descriptionEn,
      descriptionAr: body.descriptionAr,
    });

    return NextResponse.json({ resource });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update resource.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await deleteResource(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to delete resource.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
