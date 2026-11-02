const FIXED_TRUSTED_ORIGINS = [
  "https://app.digitalgate.com.au",
  "https://dg-platform-web.vercel.app",
];

const LOCAL_ORIGIN = "http://localhost:3000";

function normalizeConfiguredOrigin(value: string | undefined, allowLocalHttp: boolean): string | null {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.includes("*")) return null;
  try {
    const url = new URL(trimmed);
    if (url.username || url.password || url.search || url.hash) return null;
    if (url.pathname !== "/" && url.pathname !== "") return null;
    const local = (url.hostname === "localhost" || url.hostname === "127.0.0.1") && allowLocalHttp;
    if (url.protocol !== "https:" && !(local && url.protocol === "http:")) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function normalizeVercelOrigin(value: string | undefined): string | null {
  const host = value?.trim().replace(/^https?:\/\//i, "").split("/")[0];
  if (!host || host.includes("*")) return null;
  return normalizeConfiguredOrigin(`https://${host}`, false);
}

export function trustedAppOrigins(): Set<string> {
  const nonProduction = process.env.NODE_ENV !== "production";
  const origins = new Set<string>(FIXED_TRUSTED_ORIGINS);
  const add = (value: string | null) => {
    if (value) origins.add(value);
  };

  add(normalizeConfiguredOrigin(process.env.NEXT_PUBLIC_APP_URL, nonProduction));
  if (process.env.VERCEL_ENV === "preview") {
    add(normalizeVercelOrigin(process.env.VERCEL_URL));
    add(normalizeVercelOrigin(process.env.VERCEL_BRANCH_URL));
  }
  for (const configured of (process.env.DG_TRUSTED_ORIGINS ?? "").split(",")) {
    add(normalizeConfiguredOrigin(configured, nonProduction));
  }
  if (nonProduction) add(LOCAL_ORIGIN);

  return origins;
}

export function authorizedClerkOrigins(): string[] {
  return [...trustedAppOrigins()];
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
