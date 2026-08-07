import { resolveWpApiKeyForBaseUrl, type WpConnectorOverride } from "@/lib/dg-api";
import { wpConnectorForOrg } from "@/lib/org-wordpress-connector";

/** Prefer the org WordPress connector (CVH preset); fill host-safe env keys when needed. */
export async function accommodationConnectorForSession(
  organisationId: string | undefined,
): Promise<WpConnectorOverride | undefined> {
  if (!organisationId) return undefined;
  const connector = await wpConnectorForOrg(organisationId);
  if (!connector.baseUrl) return undefined;

  const apiKey = resolveWpApiKeyForBaseUrl(connector.baseUrl, connector.apiKey);
  return {
    baseUrl: connector.baseUrl,
    apiKey,
    label: connector.label,
  };
}
