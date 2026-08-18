/**
 * Prefer website.metadata.customHostname / customDomainId when a site has
 * multiple linked domains (e.g. aetherra.com.au primary + aetheriel.com.au alias).
 */
export function resolvePrimaryLinkedDomain<
  T extends { id: string; name: string; websiteId: string | null },
>(
  website: { id: string; metadata?: Record<string, unknown> | null },
  domains: T[],
): T | null {
  const linked = domains.filter((d) => d.websiteId === website.id);
  if (linked.length === 0) return null;

  const meta = website.metadata ?? {};
  const preferredId =
    typeof meta.customDomainId === "string" ? meta.customDomainId : null;
  const preferredHost =
    typeof meta.customHostname === "string"
      ? meta.customHostname.trim().toLowerCase()
      : null;

  if (preferredId) {
    const byId = linked.find((d) => d.id === preferredId);
    if (byId) return byId;
  }
  if (preferredHost) {
    const byHost = linked.find((d) => d.name.toLowerCase() === preferredHost);
    if (byHost) return byHost;
  }
  return linked[0] ?? null;
}
