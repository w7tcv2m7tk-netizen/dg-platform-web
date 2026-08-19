/**
 * Stable public hostname → Gen 2 website slug.
 * Prefer this over InfrastructureDomain lookup on known brand apexes so a
 * missing/stale domain row cannot 404 the live site.
 */

export const KNOWN_PUBLIC_HOST_SLUGS: Record<string, string> = {
  "digitalgate.com.au": "digitalgate",
  "www.digitalgate.com.au": "digitalgate",
  "digitalgate.co.nz": "digitalgate",
  "www.digitalgate.co.nz": "digitalgate",
  "audit.digitalgate.com.au": "digitalgate-audit",
  "roerealty.com.au": "roe-realty",
  "www.roerealty.com.au": "roe-realty",
  "report.roerealty.com.au": "roe-realty-report",
  "currumbinvalleyhideaway.com.au": "currumbin-valley-hideaway",
  "www.currumbinvalleyhideaway.com.au": "currumbin-valley-hideaway",
  "circle.currumbinvalleyhideaway.com.au": "currumbin-valley-hideaway-circle",
  "aetherra.com.au": "aetheriel-com-au",
  "www.aetherra.com.au": "aetheriel-com-au",
  "aetheriel.com.au": "aetheriel-com-au",
  "www.aetheriel.com.au": "aetheriel-com-au",
};

export function knownSlugForPublicHost(hostname: string): string | null {
  const host = hostname.toLowerCase().split(":")[0]?.replace(/\.$/, "") ?? "";
  if (!host) return null;
  return KNOWN_PUBLIC_HOST_SLUGS[host] ?? null;
}
