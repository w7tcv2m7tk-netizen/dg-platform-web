const STATIC_AUTHORIZED_PARTIES = [
  "https://app.digitalgate.com.au",
  "https://dg-platform-web.vercel.app",
  "http://localhost:3000",
] as const;

function exactVercelPreviewOrigin(
  vercelEnv: string | undefined,
  vercelUrl: string | undefined,
): string | null {
  if (vercelEnv !== "preview" || !vercelUrl?.trim()) return null;

  try {
    const value = vercelUrl.trim();
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    if (
      url.protocol !== "https:" ||
      url.port ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      !url.hostname.endsWith(".vercel.app")
    ) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

/** Build Clerk's exact-origin allowlist, including this deployment's Preview host. */
export function resolveClerkAuthorizedParties(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  return [
    ...STATIC_AUTHORIZED_PARTIES,
    env.NEXT_PUBLIC_APP_URL,
    exactVercelPreviewOrigin(env.VERCEL_ENV, env.VERCEL_URL),
  ].filter((origin, index, all): origin is string => Boolean(origin) && all.indexOf(origin) === index);
}
