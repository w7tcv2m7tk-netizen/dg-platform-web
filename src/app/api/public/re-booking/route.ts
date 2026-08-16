import { submitPublicReBooking } from "@dg/platform-core";
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
 * Public Roe Realty booking (property appraisal / buyer consultation).
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    siteSlug?: string;
    kind?: string;
    fullName?: string;
    name?: string;
    email?: string;
    phone?: string;
    date?: string;
    time?: string;
    notes?: string;
    website?: string;
  } | null;

  if (!body) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "JSON body required" } },
      { status: 422 },
    );
  }

  const kind =
    body.kind === "buyer_consultation" ? "buyer_consultation" : "appraisal";

  const result = await submitPublicReBooking({
    siteSlug: siteSlugFrom(req, body.siteSlug),
    hostname: hostnameFrom(req),
    kind,
    fullName: body.fullName || body.name || "",
    email: body.email || "",
    phone: body.phone,
    date: body.date || "",
    time: body.time || "",
    notes: body.notes,
    website: body.website,
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
