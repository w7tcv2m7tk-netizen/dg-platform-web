/**
 * Aëtherra Gen 2 cutover — WordPress leftovers on aetherra.com.au / aetheriel.com.au.
 * Used by middleware (410) and the public by-host renderer (exact slugs only).
 * Keep this file Edge-safe (no Prisma / Node-only imports).
 *
 * Neon website slug: aetheriel-com-au (primary host aetherra.com.au).
 */

export const AETHERRA_HOST_RE = /^(www\.)?(aetherra|aetheriel)\.com\.au$/i;

function normalizePublicPath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");
  return (trimmed || "/").toLowerCase();
}

/** GSC wildcard junk + exact leftovers that must not 301 to the homepage. */
const AETHERRA_GONE_PATHS = new Set(["/*"]);

export type AetherraLegacyResolution =
  | { kind: "gone" }
  | { kind: "redirect"; location: string; status: 301 | 308 };

export function isAetherraPublicHost(hostname: string): boolean {
  return AETHERRA_HOST_RE.test(hostname);
}

function isAetherraJunkRequest(pathname: string, search: string): boolean {
  const path = normalizePublicPath(pathname);
  const query = search.startsWith("?") ? search.slice(1) : search;

  if (AETHERRA_GONE_PATHS.has(path)) return true;
  if (path === "/wp-json" || path.startsWith("/wp-json")) return true;
  if (path.startsWith("/wp-content") || path.startsWith("/wp-includes")) {
    return true;
  }
  if (path === "/wp-admin" || path.startsWith("/wp-admin/")) return true;
  if (/\.php$/i.test(path) || /^\/wp[^/]*\.php$/i.test(path)) return true;
  if (path === "/xmlrpc" || path === "/xmlrpc.php") return true;
  if (/(?:^|&)rest_route=/i.test(query)) return true;
  return false;
}

export function resolveAetherraLegacyRequest(
  pathname: string,
  search = "",
): AetherraLegacyResolution | null {
  if (isAetherraJunkRequest(pathname, search)) return { kind: "gone" };
  return null;
}

/** by-host page query aliases (no leading slash). None — do not 301 junk home. */
export const AETHERRA_PAGE_ALIASES: Record<string, string> = {};
