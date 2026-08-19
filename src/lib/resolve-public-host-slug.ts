import { findDomainByHostname } from "@dg/platform-core";

import { knownSlugForPublicHost } from "@/lib/public-host-slugs";

/**
 * Map a public hostname to a website slug.
 * Known brand apexes skip InfrastructureDomain lookup so a stale or failed
 * domain row cannot 404 the live site.
 */
export async function resolvePublicHostSlug(
  hostname: string,
): Promise<string | null> {
  const host = hostname.toLowerCase().split(":")[0]?.replace(/\.$/, "") ?? "";
  if (!host) return null;

  const known = knownSlugForPublicHost(host);
  if (known) return known;

  try {
    const match = await findDomainByHostname(host);
    if (match?.website?.slug) return match.website.slug;
    const alt = host.startsWith("www.") ? host.slice(4) : `www.${host}`;
    const match2 = await findDomainByHostname(alt);
    return match2?.website?.slug ?? knownSlugForPublicHost(alt);
  } catch (err) {
    console.error("[public-host] domain lookup failed", err);
    return knownSlugForPublicHost(host);
  }
}
