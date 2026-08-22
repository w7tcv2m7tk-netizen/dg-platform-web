export type CloudflareCredentials = {
  token: string;
  zoneId: string;
  accountId?: string;
  source: "env";
};

/** Platform Cloudflare API credentials (Vercel env). */
export function resolveCloudflareConfig(): CloudflareCredentials | null {
  const token =
    process.env.CLOUDFLARE_API_TOKEN?.trim() ||
    process.env.CF_API_TOKEN?.trim() ||
    "";
  const zoneId =
    process.env.CLOUDFLARE_ZONE_ID?.trim() ||
    process.env.CF_ZONE_ID?.trim() ||
    "";
  const accountId =
    process.env.CLOUDFLARE_ACCOUNT_ID?.trim() ||
    process.env.CF_ACCOUNT_ID?.trim() ||
    undefined;

  if (!token || !zoneId) return null;
  return { token, zoneId, accountId, source: "env" };
}

export function isCloudflareConfigured(): boolean {
  return resolveCloudflareConfig() !== null;
}
