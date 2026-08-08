/**
 * Clerk Frontend API proxy — keeps handshake/session refresh on the app origin
 * so installed PWAs (display: standalone) do not open clerk.* in an external browser.
 *
 * Dashboard: Domains → Frontend API → Set proxy → https://app.digitalgate.com.au/__clerk
 * Env (Vercel Production): NEXT_PUBLIC_CLERK_PROXY_URL=https://app.digitalgate.com.au/__clerk
 *
 * Clerk only supports proxying on production instances (not pk_test_ / localhost).
 */

export const CLERK_PROXY_PATH = "/__clerk";

const PRODUCTION_APP_HOST = "app.digitalgate.com.au";

/** Absolute proxy URL for ClerkProvider / env (trailing slash optional; Clerk accepts both). */
export function clerkProxyUrl(): string | undefined {
  const fromEnv = process.env.NEXT_PUBLIC_CLERK_PROXY_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  // Sensible production default once Dashboard proxy is enabled.
  if (process.env.VERCEL_ENV === "production") {
    return `https://${PRODUCTION_APP_HOST}${CLERK_PROXY_PATH}`;
  }

  return undefined;
}

/** Enable middleware FAPI proxy for hosts that should never leave the PWA origin. */
export function shouldEnableClerkFrontendApiProxy(url: URL): boolean {
  if (process.env.NEXT_PUBLIC_CLERK_PROXY_URL?.trim()) return true;
  return url.hostname === PRODUCTION_APP_HOST;
}
