/**
 * Roe Realty Gen 2 cutover — WP / Oxygen / demo leftovers.
 * Used by middleware (410 + 308) and the public by-host renderer (aliases).
 * Keep this file Edge-safe (no Prisma / Node-only imports).
 *
 * Host scope: apex + www only (not report.roerealty.com.au).
 */

export const ROE_HOST_RE = /^(www\.)?roerealty\.com\.au$/i;
export const ROE_CANONICAL_HOST = "roerealty.com.au";
export const ROE_CANONICAL_ORIGIN = "https://roerealty.com.au";
export const ROE_REPORT_URL = "https://report.roerealty.com.au/";

function normalizePublicPath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");
  return (trimmed || "/").toLowerCase();
}

/** Exact path (no trailing slash) → same-host path or absolute URL. */
export const ROE_LEGACY_REDIRECTS: Record<string, string> = {
  "/property": "/properties",
  "/showcase": "/properties",
  "/process": "/sell",
  "/services": "/sell",
  "/get-in-touch": "/contact",
  "/contact-us": "/contact",
  "/connect": "/contact",
  "/terms": "/terms-conditions",
  "/free-appraisal": "/property-appraisal",
  "/free-property-appraisal": "/property-appraisal",
  "/property-appraisal-gold-coast": "/property-appraisal",
  "/free-buyer-consultation": "/buyer-consultation",
  "/property-report": ROE_REPORT_URL,
  "/property-value-buyer-demand-report": ROE_REPORT_URL,
};

export type RoeLegacyResolution =
  | { kind: "gone" }
  | { kind: "redirect"; location: string; status: 301 | 308 };

export function isRoePublicHost(hostname: string): boolean {
  return ROE_HOST_RE.test(hostname);
}

function isRoeJunkRequest(pathname: string): boolean {
  const path = normalizePublicPath(pathname);
  if (path === "/cgi-bin" || path.startsWith("/cgi-bin/")) return true;
  if (path === "/api.php") return true;
  if (path === "/xmlrpc.php" || path === "/xmlrpc") return true;
  if (/^\/wp-[^/]*\.php$/i.test(path)) return true;
  if (path.startsWith("/wp-content/themes")) return true;
  if (path.startsWith("/wp-content/plugins")) return true;
  if (path.startsWith("/wp-includes")) return true;
  if (path === "/wp-admin" || path.startsWith("/wp-admin/")) return true;
  if (
    path === "/real-estate-single-page-layout" ||
    path.startsWith("/real-estate-single-page-layout/")
  ) {
    return true;
  }
  return false;
}

export function resolveRoeLegacyRequest(
  pathname: string,
  _search = "",
): RoeLegacyResolution | null {
  if (isRoeJunkRequest(pathname)) return { kind: "gone" };

  const path = normalizePublicPath(pathname);

  if (/^\/agent(\/|$)/.test(path) && !path.startsWith("/agent-disclaimer")) {
    const agentSlug = path.replace(/^\/agent\/?/, "").replace(/\/+$/, "");
    return {
      kind: "redirect",
      location: /^ben-roe/.test(agentSlug) ? "/card" : "/agents",
      status: 308,
    };
  }

  const mapped = ROE_LEGACY_REDIRECTS[path];
  if (mapped) return { kind: "redirect", location: mapped, status: 308 };

  return null;
}

/** by-host page query aliases (no leading slash; same-host only). */
export const ROE_PAGE_ALIASES: Record<string, string> = Object.fromEntries(
  Object.entries(ROE_LEGACY_REDIRECTS)
    .filter(([, to]) => to.startsWith("/"))
    .map(([from, to]) => [from.replace(/^\/+/, ""), to.replace(/^\/+/, "")]),
);
