/**
 * DigitalGate Gen 2 cutover — WP / Oxygen / old app leftovers.
 * Used by middleware (410 + 308) and the public by-host renderer (aliases).
 * Keep this file Edge-safe (no Prisma / Node-only imports).
 */

export const DG_HOST_RE = /^(www\.)?digitalgate\.com\.au$/i;

function normalizePublicPath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");
  return (trimmed || "/").toLowerCase();
}

export const DG_AUDIT_URL = "https://audit.digitalgate.com.au/";
export const DG_APP_LOGIN_URL = "https://app.digitalgate.com.au/login";

/**
 * Exact path (no trailing slash) → same-host path or absolute URL.
 *
 * Do NOT map live Gen 2 product URLs here (Growth landings / Apps), e.g.:
 * /automation, /seo, /ai-visibility, /prospecting, /analytics, /social,
 * /reputation, /ai-communications, /growth — those must render Studio pages.
 */
export const DG_LEGACY_REDIRECTS: Record<string, string> = {
  "/real-estate-marketing-automation": "/insights",
  "/real-estate-facebook-ads": "/insights",
  "/real-estate-vendor-leads": "/vendor-velocity-system",
  "/real-estate-lead-generation": "/vendor-velocity-system",
  "/listing-acquisition-websites": "/vendor-velocity-system",
  "/property-appraisal-lead-generation": "/appraisal-magnet-system",
  "/google-ads-for-real-estate-agents": "/insights",
  "/website-design-lead-generation": "/pricing",
  "/connect": "/contact",
  "/showcase": "/about",
  "/portfolio": "/about",
  "/free-digital-audit": DG_AUDIT_URL,
  "/free-agency-audit": DG_AUDIT_URL,
  "/business-audit": DG_AUDIT_URL,
  "/solutions": "/pricing",
  "/privacy": "/privacy-policy",
  "/privacy-and-cookies-policy": "/privacy-policy",
  "/contact-us": "/contact",
  "/sitemap": "/sitemap.xml",
  "/services": "/pricing",
  "/services/visibility-systems/real-estate-seo": "/ai-visibility-framework",
  "/services/advertising-systems/google-ads-for-real-estate-agents": "/insights",
  "/growth-systems": "/pricing",
  "/strategy-session": "/contact",
  "/calendar-page": "/contact",
  "/calendar": "/contact",
  "/book": "/contact",
  "/booking": "/contact",
  "/disclaimer": "/legal-notice",
  "/disclaimers": "/legal-notice",
  "/terms": "/terms-conditions",
  "/terms-of-service": "/terms-conditions",
  "/terms-and-conditions": "/terms-conditions",
  "/platform": "/",
  "/beta": "/founding-customers",
  "/founding": "/founding-customers",
  "/founding-application": "/founding-customers",
  "/sso": DG_APP_LOGIN_URL,
  "/account": DG_APP_LOGIN_URL,
  "/client-portal": DG_APP_LOGIN_URL,
  "/client-dashboard": DG_APP_LOGIN_URL,
  "/client-account": DG_APP_LOGIN_URL,
  "/client-reports": DG_APP_LOGIN_URL,
  "/customer-account": DG_APP_LOGIN_URL,
};

const DG_GONE_PATHS = new Set([
  "/*",
  "/ai/prompt",
  "/__static",
  "/domains",
]);

export type DgLegacyResolution =
  | { kind: "gone" }
  | { kind: "redirect"; location: string; status: 301 | 308 };

export function isDgPublicHost(hostname: string): boolean {
  return DG_HOST_RE.test(hostname);
}

function isDgJunkRequest(pathname: string, search: string): boolean {
  const path = normalizePublicPath(pathname);
  const query = search.startsWith("?") ? search.slice(1) : search;

  if (DG_GONE_PATHS.has(path)) return true;
  if (path.startsWith("/__static/")) return true;
  if (path === "/website" || path.startsWith("/website/")) return true;
  if (path === "/collection" || path.startsWith("/collection/")) return true;
  if (path === "/domains" || path.startsWith("/domains/")) return true;
  if (path.startsWith("/wp-content") || path.startsWith("/wp-includes")) return true;
  if (path === "/wp-admin" || path.startsWith("/wp-admin/")) return true;
  if (path.startsWith("/edd-api")) return true;
  if (path.startsWith("/blog-single-page-layout")) return true;
  if (/\.php$/i.test(path) || /^\/wp[^/]*\.php$/i.test(path)) return true;
  if (path === "/xmlrpc" || path === "/xmlrpc.php") return true;
  if (path.startsWith("/system-pages/")) return true;
  if (/(?:^|&)rest_route=/i.test(query)) return true;
  return false;
}

export function resolveDgLegacyRequest(
  pathname: string,
  search = "",
): DgLegacyResolution | null {
  if (isDgJunkRequest(pathname, search)) return { kind: "gone" };

  const path = normalizePublicPath(pathname);
  const query = search.startsWith("?") ? search.slice(1) : search;

  if (path === "/" && /(?:^|&)(?:p|page_id)=\d+/i.test(query)) {
    return { kind: "redirect", location: "/", status: 308 };
  }

  const mapped = DG_LEGACY_REDIRECTS[path];
  if (mapped) return { kind: "redirect", location: mapped, status: 308 };

  if (path.startsWith("/services/")) {
    return { kind: "redirect", location: "/pricing", status: 308 };
  }

  if (path.startsWith("/growth-systems/")) {
    return { kind: "redirect", location: "/pricing", status: 308 };
  }

  return null;
}

/** by-host page query aliases (no leading slash; same-host only). */
export const DG_PAGE_ALIASES: Record<string, string> = Object.fromEntries(
  Object.entries(DG_LEGACY_REDIRECTS)
    .filter(([, to]) => to.startsWith("/"))
    .map(([from, to]) => [from.replace(/^\/+/, ""), to.replace(/^\/+/, "")]),
);
