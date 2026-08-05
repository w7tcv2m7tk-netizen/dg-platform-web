import { importContactsFromCsv } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformSession } from "@/lib/platform-api";

export async function POST(req: Request) {
  const session = await requirePlatformSession();
  if (isNextResponse(session)) return session;

  const denied = requireFeature(session, "crm.contacts.import");
  if (denied) return denied;

  const contentType = req.headers.get("content-type") ?? "";
  let csv = "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: { code: "validation_error", message: "CSV file is required" } },
        { status: 422 },
      );
    }
    csv = await file.text();
  } else {
    const body = await req.json().catch(() => null);
    csv = typeof body?.csv === "string" ? body.csv : "";
  }

  if (!csv.trim()) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "CSV content is required" } },
      { status: 422 },
    );
  }

  const result = await importContactsFromCsv(
    session.organisationId,
    csv,
    session.clerkUserId,
  );

  return NextResponse.json({ data: result });
}
