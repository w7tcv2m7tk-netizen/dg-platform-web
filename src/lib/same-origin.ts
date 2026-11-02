const FIXED_TRUSTED_ORIGINS = [
  "https://app.digitalgate.com.au",
  "https://dg-platform-web.vercel.app",
];

function normalizeOrigin(value: string | undefined): string | null {
  try {
    const url = new URL(value ?? "");
    return url.origin === "null" ? null : url.origin;
  } catch {
    return null;
  }
}

export function trustedAppOrigins(): Set<string> {
  const configured = (process.env.DG_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map(value => normalizeOrigin(value.trim()))
    .filter((value): value is string => Boolean(value));
  const platformOrigins = [
    ...FIXED_TRUSTED_ORIGINS,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    process.env.VERCEL_BRANCH_URL ? `https://${process.env.VERCEL_BRANCH_URL}` : undefined,
    ...(process.env.NODE_ENV !== "production" ? ["http://localhost:3000"] : []),
    ...configured,
  ]
    .map(normalizeOrigin)
    .filter((value): value is string => Boolean(value));
  return new Set(platformOrigins);
}

/** Require an exact trusted Origin and reject cross-site Fetch Metadata. */
export function isTrustedSameOriginRequest(req: Request): boolean {
  const origin = req.headers.get("origin");
  const fetchSite = req.headers.get("sec-fetch-site");
  if (!origin || (fetchSite && fetchSite !== "same-origin")) return false;
  try {
    const requestOrigin = new URL(req.url).origin;
    const originUrl = new URL(origin);
    return originUrl.origin === requestOrigin && trustedAppOrigins().has(originUrl.origin);
  } catch {
    return false;
  }
}
