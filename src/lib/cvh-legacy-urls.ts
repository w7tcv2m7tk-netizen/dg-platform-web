/**
 * Currumbin Valley Hideaway Gen 2 cutover — WP / Woo / MotoPress leftovers.
 * Used by middleware (410 + 308) and the public by-host renderer (aliases).
 * Keep this file Edge-safe (no Prisma / Node-only imports).
 * Host scope: apex + www only (not circle.currumbinvalleyhideaway.com.au).
 */

export const CVH_HOST_RE = /^(www\.)?currumbinvalleyhideaway\.com\.au$/i;
export const CVH_CIRCLE_URL = "https://circle.currumbinvalleyhideaway.com.au/";

const CVH_UNIT_LEAVES = new Set([
  "tiny-home",
  "garden-studio",
  "private-studio",
  "sanctuary-dome",
  "rainforest-dome",
  "canopy-dome",
  "starlight-dome",
  "the-shed",
]);

/** Exact path (no trailing slash) → canonical path. */
export const CVH_LEGACY_REDIRECTS: Record<string, string> = {
  "/search-room": "/stay",
  "/search-results": "/stay",
  "/search-availability": "/stay",
  "/accommodations": "/stay",
  "/accommodation": "/stay",
  "/room-booking": "/stay",
  "/book-tiny-home": "/tiny-home",
  "/book-studio": "/garden-studio",
  "/book-rainforest-dome": "/rainforest-dome",
  "/book-sanctuary-dome": "/sanctuary-dome",
  "/booking-confirmation": "/booking-confirmed",
  "/wellness": "/experiences",
  "/currumbin-valley-guide/cougal-cascades": "/cougal-cascades",
  "/private-studio": "/garden-studio",
  "/accommodation/private-studio": "/garden-studio",
  "/hideaway-circle": CVH_CIRCLE_URL,
};

/** Woo / plugin / transactional URLs that should disappear from the index. */
const CVH_GONE_PATHS = new Set([
  "/my-account",
  "/booking-cancellation",
  "/booking-confirmation/booking-canceled",
]);

export type CvhLegacyResolution =
  | { kind: "gone" }
  | { kind: "redirect"; pathname: string };

export function isCvhPublicHost(hostname: string): boolean {
  return CVH_HOST_RE.test(hostname);
}

export function normalizePublicPath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");
  return (trimmed || "/").toLowerCase();
}

function isCvhJunkRequest(pathname: string, search: string): boolean {
  const path = normalizePublicPath(pathname);
  const query = search.startsWith("?") ? search.slice(1) : search;
  if (CVH_GONE_PATHS.has(path)) return true;
  if (path === "/wc-api" || path.startsWith("/wc-api/")) return true;
  if (path === "/category" || path.startsWith("/category/")) return true;
  if (path.includes("__trashed")) return true;
  if (path.startsWith("/booking-confirmation/")) return true;
  if (/kinsta-monitor/i.test(pathname) || /kinsta-monitor/i.test(query)) {
    return true;
  }
  if (/ao_speedup_cachebuster/i.test(pathname) || /ao_speedup_cachebuster/i.test(query)) {
    return true;
  }
  if (/(?:^|&)jetpack=comms(?:&|$)/i.test(query) || /jetpack=comms/i.test(pathname)) {
    return true;
  }
  return false;
}

export function resolveCvhLegacyRequest(
  pathname: string,
  search = "",
): CvhLegacyResolution | null {
  if (isCvhJunkRequest(pathname, search)) return { kind: "gone" };

  const path = normalizePublicPath(pathname);
  const mapped = CVH_LEGACY_REDIRECTS[path];
  if (mapped) return { kind: "redirect", pathname: mapped };

  const datePost = path.match(/^\/(\d{4})\/(\d{2})\/(\d{2})\/([^/]+)$/);
  if (datePost) {
    return { kind: "redirect", pathname: `/${datePost[4]}` };
  }

  const accommodation = path.match(/^\/accommodation\/([^/]+)$/);
  if (accommodation) {
    const leaf = accommodation[1];
    const dest = leaf === "private-studio" ? "garden-studio" : leaf;
    if (CVH_UNIT_LEAVES.has(leaf) || CVH_UNIT_LEAVES.has(dest)) {
      return { kind: "redirect", pathname: `/${dest}` };
    }
  }

  return null;
}

/** by-host page query aliases (no leading slash; same-host only). */
export const CVH_PAGE_ALIASES: Record<string, string> = Object.fromEntries(
  Object.entries(CVH_LEGACY_REDIRECTS)
    .filter(([, to]) => to.startsWith("/"))
    .map(([from, to]) => [
      from.replace(/^\/+/, ""),
      to.replace(/^\/+/, ""),
    ]),
);
