import { captureWebsiteFormSubmission, findDomainByHostname } from "@dg/platform-core";
import { NextResponse } from "next/server";

import {
  mapWebsiteFormFields,
  readPublicFormRecord,
} from "@/lib/public-website-form-fields";
import { spamGuardResponse } from "@/lib/public-form-spam-response";

import { knownSlugForPublicHost } from "@/lib/public-host-slugs";

function hostnameFrom(req: Request): string {
  return (
    req.headers.get("x-dg-custom-host") ||
    req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    req.headers.get("host")?.split(":")[0]?.trim() ||
    ""
  ).toLowerCase();
}

async function resolveSiteSlug(
  req: Request,
  bodySlug?: string,
): Promise<string | null> {
  if (bodySlug?.trim()) return bodySlug.trim();
  const host = hostnameFrom(req);
  if (!host) return null;
  const known = knownSlugForPublicHost(host);
  if (known) return known;
  try {
    const match = await findDomainByHostname(host);
    if (match?.website?.slug) return match.website.slug;
    const alt = host.startsWith("www.") ? host.slice(4) : `www.${host}`;
    const match2 = await findDomainByHostname(alt);
    return match2?.website?.slug ?? knownSlugForPublicHost(alt);
  } catch {
    return knownSlugForPublicHost(host);
  }
}

function captureStatus(code: string): number {
  if (code === "not_found") return 404;
  if (code === "validation_error") return 422;
  if (code === "slot_unavailable") return 409;
  return 500;
}

/**
 * Public contact form on any Gen 2 brand host.
 * Replaces leftover WP/PHP handlers (admin-ajax, send-contact.php, CF7).
 */
export async function POST(req: Request) {
  const raw = await readPublicFormRecord(req);
  if (!raw) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "JSON or form body required" } },
      { status: 422 },
    );
  }

  const mapped = mapWebsiteFormFields(raw);
  const siteSlug = await resolveSiteSlug(req, mapped.siteSlug);
  const blocked = spamGuardResponse(
    req,
    mapped,
    siteSlug ?? mapped.siteSlug ?? (hostnameFrom(req) || "website-form"),
  );
  if (blocked) return blocked;

  if (!siteSlug) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Website not found for this host" } },
      { status: 404 },
    );
  }

  const result = await captureWebsiteFormSubmission({
    siteSlug,
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

  const wantsHtml =
    (req.headers.get("accept") || "").includes("text/html") ||
    (req.headers.get("content-type") || "").includes("form");
  if (wantsHtml) {
    const next = new URL("/contact", req.url);
    next.searchParams.set("sent", "1");
    return NextResponse.redirect(next, 303);
  }

  return NextResponse.json({ data: result }, { status: 201 });
}
