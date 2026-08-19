/**
 * Per-host public-site leftover URL resolution (410 + permanent redirects).
 * Edge-safe. Brand maps live in cvh / dg / roe / aetherra-legacy-urls.
 */

import { NextResponse, type NextRequest } from "next/server";

import {
  isAetherraPublicHost,
  resolveAetherraLegacyRequest,
} from "@/lib/aetherra-legacy-urls";
import {
  isCvhPublicHost,
  resolveCvhLegacyRequest,
} from "@/lib/cvh-legacy-urls";
import {
  isDgPublicHost,
  resolveDgLegacyRequest,
} from "@/lib/dg-legacy-urls";
import {
  isRoePublicHost,
  resolveRoeLegacyRequest,
} from "@/lib/roe-legacy-urls";
import { isLegacyWordpressFormPath } from "@/lib/legacy-wp-form-post";

export type PublicLegacyResolution =
  | { kind: "gone" }
  | { kind: "redirect"; location: string; status: 301 | 308 };

export function resolvePublicSiteLegacy(
  hostname: string,
  pathname: string,
  search = "",
): PublicLegacyResolution | null {
  if (isCvhPublicHost(hostname)) {
    const resolved = resolveCvhLegacyRequest(pathname, search);
    if (!resolved) return null;
    if (resolved.kind === "gone") return resolved;
    return {
      kind: "redirect",
      location: resolved.pathname,
      status: 308,
    };
  }
  if (isDgPublicHost(hostname)) {
    return resolveDgLegacyRequest(pathname, search);
  }
  if (isRoePublicHost(hostname)) {
    return resolveRoeLegacyRequest(pathname, search);
  }
  if (isAetherraPublicHost(hostname)) {
    return resolveAetherraLegacyRequest(pathname, search);
  }
  return null;
}

function shouldStripWww(hostname: string): boolean {
  return (
    (isDgPublicHost(hostname) ||
      isRoePublicHost(hostname) ||
      isAetherraPublicHost(hostname)) &&
    hostname.startsWith("www.")
  );
}

export function goneResponse(): NextResponse {
  return new NextResponse("Gone", {
    status: 410,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

/**
 * Force HTTPS for public brand hosts. Apex-strip www for DigitalGate, Roe, and
 * Aëtherra (do not change CVH www behaviour).
 */
export function canonicalPublicHostRedirect(
  req: NextRequest,
  hostname: string,
): NextResponse | null {
  const protoHeader = req.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();
  const forceHttps = protoHeader === "http";
  const forceApex = shouldStripWww(hostname);
  if (!forceHttps && !forceApex) return null;

  const dest = req.nextUrl.clone();
  dest.protocol = "https:";
  if (forceApex) dest.hostname = hostname.replace(/^www\./, "");
  return NextResponse.redirect(dest, 308);
}

function rewriteLegacyWordpressFormPost(
  req: NextRequest,
  hostname: string,
): NextResponse | null {
  if (req.method !== "POST") return null;
  const path = (req.nextUrl.pathname.replace(/\/+$/, "") || "/").toLowerCase();
  if (!isLegacyWordpressFormPath(path)) return null;

  const url = req.nextUrl.clone();
  url.pathname = isDgPublicHost(hostname)
    ? "/api/public/dg-enquiry"
    : "/api/public/website-form";
  const rewrite = NextResponse.rewrite(url);
  rewrite.headers.set("x-dg-custom-host", hostname);
  return rewrite;
}

export function applyPublicLegacyResponse(
  req: NextRequest,
  hostname: string,
): NextResponse | null {
  const wpForm = rewriteLegacyWordpressFormPost(req, hostname);
  if (wpForm) return wpForm;

  const resolved = resolvePublicSiteLegacy(
    hostname,
    req.nextUrl.pathname,
    req.nextUrl.search,
  );
  if (!resolved) return null;
  if (resolved.kind === "gone") return goneResponse();

  if (/^https?:\/\//i.test(resolved.location)) {
    const dest = new URL(resolved.location);
    if (!dest.search && req.nextUrl.search) dest.search = req.nextUrl.search;
    return NextResponse.redirect(dest, resolved.status);
  }

  const dest = req.nextUrl.clone();
  dest.protocol = "https:";
  if (shouldStripWww(hostname)) {
    dest.hostname = hostname.replace(/^www\./, "");
  }
  dest.pathname = resolved.location;
  dest.search = "";
  dest.hash = "";
  return NextResponse.redirect(dest, resolved.status);
}
