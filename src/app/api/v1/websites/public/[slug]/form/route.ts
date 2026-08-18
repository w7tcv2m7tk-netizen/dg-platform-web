import { captureWebsiteFormSubmission } from "@dg/platform-core";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ slug: string }> };

/** Public contact form → CRM Contact/Lead */
export async function POST(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const body = (await req.json().catch(() => null)) as {
    name?: string;
    email?: string;
    phone?: string;
    message?: string;
    pageSlug?: string;
  } | null;

  const result = await captureWebsiteFormSubmission({
    siteSlug: slug,
    name: body?.name ?? "",
    email: body?.email,
    phone: body?.phone,
    message: body?.message,
    pageSlug: body?.pageSlug,
  });

  if (!result.ok) {
    const status =
      result.code === "not_found"
        ? 404
        : result.code === "validation_error"
          ? 422
          : result.code === "slot_unavailable"
            ? 409
            : 500;
    return NextResponse.json(
      { error: { code: result.code, message: result.message } },
      { status },
    );
  }

  return NextResponse.json({ data: result }, { status: 201 });
}
