/**
 * Server-only Clerk configuration.
 *
 * Do not use NEXT_PUBLIC_* for the FAPI proxy URL — it is read on the server
 * (middleware + root layout) and passed to ClerkProvider as a prop when needed.
 * The browser still receives proxyUrl at runtime via RSC; it is not inlined into
 * the client bundle as a build-time public env constant.
 */
export const clerkConfig = {
  /** Absolute proxy URL (e.g. https://app.digitalgate.com.au/__clerk). */
  get proxyUrl(): string | undefined {
    const fromEnv = process.env.CLERK_PROXY_URL?.trim();
    if (!fromEnv) return undefined;
    return fromEnv.replace(/\/$/, "");
  },

  /** True when Dashboard FAPI proxy is enabled and CLERK_PROXY_URL is set. */
  get isFrontendApiProxyEnabled(): boolean {
    return Boolean(this.proxyUrl);
  },
} as const;
