import { wpConnectorForOrg } from "@/lib/org-wordpress-connector";
import type { WpConnectorOverride } from "@/lib/dg-api";

/** Prefer the org WordPress connector (CVH preset); fall back to site env list. */
export async function accommodationConnectorForSession(
  organisationId: string | undefined,
): Promise<WpConnectorOverride | undefined> {
  if (!organisationId) return undefined;
  const connector = await wpConnectorForOrg(organisationId);
  if (!connector.baseUrl) return undefined;
  return {
    baseUrl: connector.baseUrl,
    apiKey: connector.apiKey,
    label: connector.label,
  };
}
