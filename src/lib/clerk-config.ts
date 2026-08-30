/**
 * Server-only Clerk configuration.
 *
 * Do not use NEXT_PUBLIC_* for the FAPI proxy URL — it is read on the server
 * (middleware + root layout) and passed to ClerkProvider as a prop when needed.
 * The browser still receives proxyUrl at runtime via RSC; it is not inlined into
 * the client bundle as a build-time public env constant.
 *
 * Middleware can forward `/__clerk` on the app host before Dashboard validates.
 * ClerkProvider `proxyUrl` must wait until Dashboard marks the proxy Valid —
 * otherwise the browser gets `host_invalid` and SignIn blanks.
 */
export const clerkConfig = {
  /** Absolute proxy URL for ClerkProvider (e.g. https://app.digitalgate.com.au/__clerk). */
  get proxyUrl(): string | undefined {
    const fromEnv = process.env.CLERK_PROXY_URL?.trim();
    if (!fromEnv) return undefined;
    return fromEnv.replace(/\/$/, "");
  },

  /**
   * True when the browser should call FAPI via the app proxy.
   * Only after Dashboard → Domains → Proxy Configuration is Valid.
   */
  get isClientProxyEnabled(): boolean {
    return Boolean(this.proxyUrl);
  },
} as const;
