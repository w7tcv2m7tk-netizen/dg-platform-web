import {
  getPublicStayUnitForSite,
  submitPublicStayEnquiry,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ unitSlug: string }> };

function siteSlugFrom(req: Request, bodySite?: string | null) {
  if (bodySite?.trim()) return bodySite.trim();
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("site");
    if (q?.trim()) return q.trim();
  } catch {
    /* ignore */
  }
  return "currumbin-valley-hideaway";
}

/** Public stay unit + blocked dates for Gen 2 bookable pages (CVH). */
export async function GET(req: Request, ctx: Ctx) {
  const { unitSlug } = await ctx.params;
  const siteSlug = siteSlugFrom(req);
  const unit = await getPublicStayUnitForSite(siteSlug, unitSlug);
  if (!unit) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Stay not found" } },
      { status: 404 },
    );
  }
  return NextResponse.json({ data: unit });
}

/** Public booking enquiry — CRM lead (mirrors WP dg_accommodation_enquiry). */
export async function POST(req: Request, ctx: Ctx) {
  const { unitSlug } = await ctx.params;
  const body = (await req.json().catch(() => null)) as {
    siteSlug?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    checkin?: string;
    checkout?: string;
    guests?: number;
    message?: string;
  } | null;

  const siteSlug = siteSlugFrom(req, body?.siteSlug);
  const result = await submitPublicStayEnquiry({
    siteSlug,
    unitSlug,
    firstName: body?.firstName ?? "",
    lastName: body?.lastName ?? "",
    email: body?.email ?? "",
    phone: body?.phone,
    checkin: body?.checkin,
    checkout: body?.checkout,
    guests: body?.guests,
    message: body?.message,
  });

  if (!result.ok) {
    const status =
      result.code === "not_found"
        ? 404
        : result.code === "validation_error"
          ? 422
          : 500;
    return NextResponse.json(
      { error: { code: result.code, message: result.message } },
      { status },
    );
  }

  return NextResponse.json({ data: result }, { status: 201 });
}
