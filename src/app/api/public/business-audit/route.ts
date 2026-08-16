import {
  probePublicBusinessAuditWebsite,
  submitPublicBusinessAudit,
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
  return "digitalgate";
}

function hostnameFrom(req: Request) {
  return (
    req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    req.headers.get("host")?.split(":")[0]?.trim() ||
    ""
  ).toLowerCase();
}

/**
 * Public free Business Audit funnel (DigitalGate Gen 2).
 * Actions: probe | submit
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    action?: string;
    siteSlug?: string;
    websiteUrl?: string;
    website?: string;
    agency_website?: string;
    businessName?: string;
    company_name?: string;
    fullName?: string;
    name?: string;
    email?: string;
    phone?: string;
    /** honeypot */
    websiteHp?: string;
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
  const websiteUrl =
    body.websiteUrl?.trim() ||
    body.agency_website?.trim() ||
    body.website?.trim() ||
    "";

  if (action === "probe") {
    const result = await probePublicBusinessAuditWebsite({
      websiteUrl,
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
    const result = await submitPublicBusinessAudit({
      siteSlug,
      hostname,
      websiteUrl,
      businessName:
        body.businessName?.trim() || body.company_name?.trim() || "",
      fullName: body.fullName?.trim() || body.name?.trim() || "",
      email: body.email,
      phone: body.phone,
      website: body.websiteHp,
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
        message: "Supported: probe, submit",
      },
    },
    { status: 400 },
  );
}
