import { resolveOrgWordPressConnector } from "@dg/platform-core";

import type { WpConnectorOverride } from "@/lib/dg-api";

export async function wpConnectorForOrg(
  organisationId: string,
): Promise<WpConnectorOverride & { source: "org" | "env" | "preset" }> {
  const resolved = await resolveOrgWordPressConnector(organisationId);
  return {
    baseUrl: resolved.baseUrl,
    apiKey: resolved.apiKey,
    label: resolved.label,
    source: resolved.source,
  };
}
