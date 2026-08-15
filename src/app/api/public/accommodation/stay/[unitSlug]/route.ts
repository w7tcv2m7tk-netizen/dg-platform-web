import {
  createPublicStayCheckout,
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

/**
 * Public stay actions:
 * - default / action=enquire → CRM lead
 * - action=checkout + method=stripe|payid → Neon StayBooking + payment
 */
export async function POST(req: Request, ctx: Ctx) {
  const { unitSlug } = await ctx.params;
  const body = (await req.json().catch(() => null)) as {
    siteSlug?: string;
    action?: string;
    method?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    checkin?: string;
    checkout?: string;
    guests?: number;
    message?: string;
    returnBaseUrl?: string;
  } | null;

  const siteSlug = siteSlugFrom(req, body?.siteSlug);
  const action = (body?.action || "enquire").trim().toLowerCase();

  if (action === "checkout" || action === "pay") {
    const methodRaw = (body?.method || "").trim().toLowerCase();
    const method =
      methodRaw === "stripe" || methodRaw === "card"
        ? "stripe"
        : methodRaw === "payid"
          ? "payid"
          : null;
    if (!method) {
      return NextResponse.json(
        {
          error: {
            code: "validation_error",
            message: "method must be stripe or payid",
          },
        },
        { status: 422 },
      );
    }

    const result = await createPublicStayCheckout({
      siteSlug,
      unitSlug,
      method,
      firstName: body?.firstName ?? "",
      lastName: body?.lastName ?? "",
      email: body?.email ?? "",
      phone: body?.phone,
      checkin: body?.checkin ?? "",
      checkout: body?.checkout ?? "",
      guests: body?.guests,
      message: body?.message,
      returnBaseUrl: body?.returnBaseUrl,
    });

    if (!result.ok) {
      const status =
        result.code === "not_found"
          ? 404
          : result.code === "dates_unavailable"
            ? 409
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
