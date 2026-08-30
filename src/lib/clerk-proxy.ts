/**
 * Clerk Frontend API proxy — keeps handshake/session refresh on the app origin
 * so installed PWAs (display: standalone) do not open clerk.* in an external browser.
 *
 * Clerk primary domain is digitalgate.com.au (Dashboard → Domains). Proxy URL:
 *   ✓ https://digitalgate.com.au/__clerk
 *
 * Two stages (order matters):
 * 1. Middleware forwards `/__clerk` on digitalgate.com.au (+ app host) so Dashboard
 *    can validate (no CLERK_PROXY_URL required yet).
 * 2. After Dashboard shows Valid, set Vercel
 *    CLERK_PROXY_URL=https://digitalgate.com.au/__clerk and redeploy so
 *    ClerkProvider routes the browser through the proxy.
 *
 * Do NOT set CLERK_PROXY_URL before Dashboard validates — that causes host_invalid.
 *
 * Upstream FAPI must be the instance custom host (clerk.digitalgate.com.au), not
 * generic frontend-api.clerk.dev — otherwise Dashboard validation gets host_invalid.
 */

import { parsePublishableKey } from "@clerk/shared/keys";

import { clerkConfig } from "@/lib/clerk-config";

export const CLERK_PROXY_PATH = "/__clerk";

/** Canonical Dashboard / ClerkProvider proxy URL (Clerk primary domain). */
export const CLERK_PROXY_PUBLIC_URL = "https://digitalgate.com.au/__clerk";

const PRODUCTION_APP_HOST = "app.digitalgate.com.au";
const PRODUCTION_PRIMARY_HOST = "digitalgate.com.au";
const PRODUCTION_FAPI_HOST = "clerk.digitalgate.com.au";

const PROXY_ENABLED_HOSTS = new Set([
  PRODUCTION_PRIMARY_HOST,
  `www.${PRODUCTION_PRIMARY_HOST}`,
  PRODUCTION_APP_HOST,
]);

/** True when ClerkProvider should use proxyUrl (Dashboard already Valid). */
export function isClerkFrontendApiProxyConfigured(): boolean {
  return clerkConfig.isClientProxyEnabled;
}

/** Absolute proxy URL for ClerkProvider (only when CLERK_PROXY_URL is set). */
export function clerkProxyUrl(): string | undefined {
  return clerkConfig.proxyUrl;
}

/**
 * Upstream Frontend API origin for middleware proxying.
 * Prefer CLERK_FAPI_URL, else the host encoded in the publishable key.
 */
export function clerkFrontendApiOrigin(): string {
  const fromEnv = process.env.CLERK_FAPI_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() ?? "";
  const frontendApi = parsePublishableKey(pk)?.frontendApi?.replace(/\$$/, "");
  if (frontendApi) return `https://${frontendApi}`;

  return `https://${PRODUCTION_FAPI_HOST}`;
}

/**
 * Enable middleware FAPI forwarding on Clerk primary + app hosts so Dashboard
 * can validate Proxy Configuration. Also on when CLERK_PROXY_URL is set.
 */
export function shouldEnableClerkFrontendApiProxy(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  if (PROXY_ENABLED_HOSTS.has(host)) return true;
  return isClerkFrontendApiProxyConfigured();
}

export function isClerkProxyPath(pathname: string): boolean {
  return pathname === CLERK_PROXY_PATH || pathname.startsWith(`${CLERK_PROXY_PATH}/`);
}

/**
 * Off-app Clerk hosts that break PWA scope (Account Portal / FAPI / accounts).
 * Used to rewrite middleware redirects back onto /login inside the app.
 */
export function isOffAppClerkNavigationUrl(target: string, requestOrigin: string): boolean {
  try {
    const url = new URL(target, requestOrigin);
    if (url.origin === new URL(requestOrigin).origin) return false;

    const host = url.hostname.toLowerCase();
    if (host === PRODUCTION_APP_HOST) return false;
    // Same-site FAPI proxy on primary domain — allow (not an off-app clerk.* hop).
    if (host === PRODUCTION_PRIMARY_HOST || host === `www.${PRODUCTION_PRIMARY_HOST}`) {
      return !url.pathname.startsWith(CLERK_PROXY_PATH);
    }

    return (
      host === PRODUCTION_FAPI_HOST ||
      host.endsWith(".clerk.accounts.dev") ||
      host.endsWith(".accounts.dev") ||
      host === "accounts.clerk.com" ||
      host.endsWith(".clerk.com") ||
      host.endsWith(".clerk.services") ||
      host === "frontend-api.clerk.dev" ||
      host.endsWith(".clerk.dev")
    );
  } catch {
    return false;
  }
}

/** Same-origin login URL with optional return path (never opens a new window). */
export function inAppSignInUrl(requestUrl: string | URL, returnPath?: string): URL {
  const base = typeof requestUrl === "string" ? new URL(requestUrl) : requestUrl;
  const login = new URL("/login", base.origin);
  const redirectTarget = returnPath || `${base.pathname}${base.search}`;
  if (redirectTarget && redirectTarget !== "/login" && !redirectTarget.startsWith("/login?")) {
    login.searchParams.set("redirect_url", redirectTarget);
  }
  return login;
}
