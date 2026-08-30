/**
 * Clerk Frontend API proxy — keeps handshake/session refresh on the app origin
 * so installed PWAs (display: standalone) do not open clerk.* in an external browser.
 *
 * Two stages (order matters):
 * 1. Middleware forwards `/__clerk` on app.digitalgate.com.au so Clerk Dashboard
 *    can validate the proxy URL (no CLERK_PROXY_URL required yet).
 * 2. After Dashboard shows Valid, set Vercel
 *    CLERK_PROXY_URL=https://app.digitalgate.com.au/__clerk and redeploy so
 *    ClerkProvider routes the browser through the proxy.
 *
 * Do NOT set CLERK_PROXY_URL before Dashboard validates — that causes host_invalid.
 *
 * Proxy URL must be the app host, not the marketing apex:
 *   ✓ https://app.digitalgate.com.au/__clerk
 *   ✗ https://digitalgate.com.au/__clerk
 */

import { clerkConfig } from "@/lib/clerk-config";

export const CLERK_PROXY_PATH = "/__clerk";

const PRODUCTION_APP_HOST = "app.digitalgate.com.au";

/** True when ClerkProvider should use proxyUrl (Dashboard already Valid). */
export function isClerkFrontendApiProxyConfigured(): boolean {
  return clerkConfig.isClientProxyEnabled;
}

/** Absolute proxy URL for ClerkProvider (only when CLERK_PROXY_URL is set). */
export function clerkProxyUrl(): string | undefined {
  return clerkConfig.proxyUrl;
}

/**
 * Enable middleware FAPI forwarding on the production app host so Clerk can
 * validate Proxy Configuration. Also on when CLERK_PROXY_URL is set (client stage).
 */
export function shouldEnableClerkFrontendApiProxy(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  if (host === PRODUCTION_APP_HOST) return true;
  return isClerkFrontendApiProxyConfigured();
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

    return (
      host === "clerk.digitalgate.com.au" ||
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
