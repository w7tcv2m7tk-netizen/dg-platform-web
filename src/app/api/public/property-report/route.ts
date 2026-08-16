import {
  resolvePublicPropertyReportAddress,
  submitPublicPropertyReport,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

function siteSlugFrom(req: Request, bodySite?: string | null) {
  if (bodySite?.trim()) return bodySite.trim();
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("site");
    if (q?.trim()) return q.trim();
  } catch {
    /* ignore */
  }
  return "roe-realty";
}

function hostnameFrom(req: Request) {
  const host =
    req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    req.headers.get("host")?.split(":")[0]?.trim() ||
    "";
  return host.toLowerCase();
}

/**
 * Public property-report funnel (Roe Gen 2).
 * Actions: resolve | submit
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    action?: string;
    siteSlug?: string;
    rawAddress?: string;
    propertyAddress?: string;
    address?: string;
    fullName?: string;
    name?: string;
    email?: string;
    phone?: string;
    propertyType?: string;
    timeframe?: string;
    website?: string;
  } | null;

  if (!body) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "JSON body required" } },
      { status: 422 },
    );
  }

  const siteSlug = siteSlugFrom(req, body.siteSlug);
  const hostname = hostnameFrom(req);
  const action = (body.action || "submit").trim().toLowerCase();

  if (action === "resolve") {
    const raw =
      body.rawAddress?.trim() ||
      body.propertyAddress?.trim() ||
      body.address?.trim() ||
      "";
    const result = await resolvePublicPropertyReportAddress({
      rawAddress: raw,
      siteSlug,
      hostname,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: { code: result.code, message: result.message } },
        { status: result.code === "validation_error" ? 422 : 400 },
      );
    }
    return NextResponse.json({ data: result });
  }

  if (action === "submit") {
    const result = await submitPublicPropertyReport({
      siteSlug,
      hostname,
      propertyAddress:
        body.propertyAddress?.trim() ||
        body.rawAddress?.trim() ||
        body.address?.trim() ||
        "",
      fullName: body.fullName?.trim() || body.name?.trim() || "",
      email: body.email,
      phone: body.phone,
      propertyType: body.propertyType,
      timeframe: body.timeframe,
      website: body.website,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: { code: result.code, message: result.message } },
        { status: result.code === "validation_error" ? 422 : 400 },
      );
    }
    return NextResponse.json({ data: result });
  }

  return NextResponse.json(
    {
      error: {
        code: "unknown_action",
        message: "Supported: resolve, submit",
      },
    },
    { status: 400 },
  );
}
