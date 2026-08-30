/**
 * Clerk Frontend API proxy — keeps handshake/session refresh on the app origin
 * so installed PWAs (display: standalone) do not open clerk.* in an external browser.
 *
 * Opt-in only via server env CLERK_PROXY_URL. Do NOT enable until Clerk Dashboard
 * → Domains → Frontend API → Set proxy has been validated, or Clerk returns
 * host_invalid and SignIn never loads email/password.
 *
 * Order:
 * 1. Deploy app (middleware can serve /__clerk)
 * 2. Dashboard proxy → https://app.digitalgate.com.au/__clerk (must validate)
 * 3. Vercel: CLERK_PROXY_URL=https://app.digitalgate.com.au/__clerk
 * 4. Redeploy
 */

import { clerkConfig } from "@/lib/clerk-config";

export const CLERK_PROXY_PATH = "/__clerk";

const PRODUCTION_APP_HOST = "app.digitalgate.com.au";

/** True when FAPI proxy is configured via server env. */
export function isClerkFrontendApiProxyConfigured(): boolean {
  return clerkConfig.isFrontendApiProxyEnabled;
}

/** Absolute proxy URL for ClerkProvider (only when CLERK_PROXY_URL is set). */
export function clerkProxyUrl(): string | undefined {
  return clerkConfig.proxyUrl;
}

/** Enable middleware FAPI proxy only when Dashboard + env are ready. */
export function shouldEnableClerkFrontendApiProxy(_url: URL): boolean {
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
