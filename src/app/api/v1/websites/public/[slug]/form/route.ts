import { captureWebsiteFormSubmission } from "@dg/platform-core";
import { NextResponse } from "next/server";

import {
  mapWebsiteFormFields,
  readPublicFormRecord,
} from "@/lib/public-website-form-fields";

type Ctx = { params: Promise<{ slug: string }> };

function captureStatus(code: string): number {
  if (code === "not_found") return 404;
  if (code === "validation_error") return 422;
  if (code === "slot_unavailable") return 409;
  return 500;
}

/** Public contact form → CRM Contact/Lead */
export async function POST(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const raw = await readPublicFormRecord(req);
  if (!raw) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "JSON or form body required" } },
      { status: 422 },
    );
  }

  const mapped = mapWebsiteFormFields(raw);
  if (mapped.honeypot) {
    return NextResponse.json({ data: { ok: true } }, { status: 201 });
  }

  const result = await captureWebsiteFormSubmission({
    siteSlug: slug,
    name: mapped.name,
    email: mapped.email,
    phone: mapped.phone,
    message: mapped.message,
    pageSlug: mapped.pageSlug,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: { code: result.code, message: result.message } },
      { status: captureStatus(result.code) },
    );
  }

  return NextResponse.json({ data: result }, { status: 201 });
}
