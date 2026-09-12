/**
 * Safe post-OAuth return paths.
 *
 * ClerkProvider sets signInForceRedirectUrl=/dashboard. Returning from Google
 * can look like a fresh sign-in, so the browser lands on Overview instead of
 * Connected Services / Connectors. Callbacks set a short-lived cookie; middleware
 * sends /dashboard back to the intended page.
 */

export const OAUTH_RETURN_COOKIE = "dg_oauth_return";
export const OAUTH_RETURN_COOKIE_MAX_AGE_SEC = 180;

export const DEFAULT_GBP_OAUTH_RETURN = "/dashboard/settings/connected-services";

const ALLOWED_OAUTH_RETURN_PATHS = new Set([
  "/dashboard/settings/connected-services",
  "/dashboard/settings/connectors",
  "/apps/reviews",
  "/apps/reviews/sources",
  "/apps/reviews/inbox",
]);

function pathnameOf(raw: string): string {
  return raw.split("?")[0]?.split("#")[0] ?? "";
}

/** Allowlisted same-origin path (no query). */
export function sanitizeOAuthReturnTo(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  let value = raw.trim();
  try {
    if (value.startsWith("http://") || value.startsWith("https://")) {
      const url = new URL(value);
      value = url.pathname;
    }
  } catch {
    return null;
  }
  const path = pathnameOf(value);
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  if (!ALLOWED_OAUTH_RETURN_PATHS.has(path)) return null;
  return path;
}

export function gbpOAuthReturnPath(raw: string | null | undefined): string {
  return sanitizeOAuthReturnTo(raw) ?? DEFAULT_GBP_OAUTH_RETURN;
}

export function withGbpOAuthFlash(
  returnPath: string,
  status: "connected" | "error",
  message?: string,
): string {
  const path = sanitizeOAuthReturnTo(returnPath) ?? DEFAULT_GBP_OAUTH_RETURN;
  const dest = new URL(path, "https://app.digitalgate.com.au");
  dest.searchParams.set("google", status);
  if (message) dest.searchParams.set("message", message);
  return `${dest.pathname}${dest.search}`;
}

/** Cookie value is path + query; must still be an allowlisted pathname. */
export function sanitizeOAuthReturnDestination(
  raw: string | null | undefined,
): string | null {
  if (!raw?.trim()) return null;
  let value = raw.trim();
  try {
    if (value.startsWith("http://") || value.startsWith("https://")) {
      const url = new URL(value);
      value = `${url.pathname}${url.search}`;
    }
  } catch {
    return null;
  }
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  const path = pathnameOf(value);
  if (!ALLOWED_OAUTH_RETURN_PATHS.has(path)) return null;
  return value.split("#")[0] ?? path;
}

export function isDashboardOverviewPath(pathname: string): boolean {
  return pathname === "/dashboard" || pathname === "/dashboard/";
}
