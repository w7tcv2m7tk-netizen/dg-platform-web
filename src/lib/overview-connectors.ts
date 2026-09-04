import {
  buildNativeWebsiteHealth,
  getStripeSetupStatus,
  listOrganisationDomains,
  listWebsitesWithPages,
  organisationHasWordPressConnector,
  pickWebsiteForHealthProbe,
  probeCommsConnector,
  resolvePrimaryLinkedDomain,
  type OverviewConnectorProbes,
  type WebsiteProbe,
} from "@dg/platform-core";

import { getLastWordPressSync } from "@/lib/wordpress-sync";

async function probeNativeWebsite(
  organisationId: string,
): Promise<WebsiteProbe | null> {
  try {
    const [sites, domains] = await Promise.all([
      listWebsitesWithPages(organisationId),
      listOrganisationDomains(organisationId),
    ]);
    const site = pickWebsiteForHealthProbe(sites);
    if (!site) return null;
    const linked = domains.filter((d) => d.websiteId === site.id);
    const domain = resolvePrimaryLinkedDomain(site, linked);
    const snapshot = buildNativeWebsiteHealth({
      website: site,
      domain: domain
        ? {
            name: domain.name,
            status: domain.status,
            dnsConfiguredAt: domain.dnsConfiguredAt,
            sslState: domain.sslState,
            aliases: linked.map((d) => d.name),
          }
        : null,
    });
    return {
      ok: true,
      score: snapshot.score,
      pass: snapshot.pass,
      warn: snapshot.warn,
      fail: snapshot.fail,
      siteLabel: domain?.name ?? snapshot.site,
    };
  } catch {
    return null;
  }
}

/** Probe native platform connectors for Business Overview. */
export async function fetchOverviewConnectorProbes(
  enabledAppIds: string[],
  organisationId: string,
): Promise<OverviewConnectorProbes> {
  const stripe = getStripeSetupStatus();
  const [wpSync, wpConfigured, nativeWebsite, comms] = await Promise.all([
    getLastWordPressSync(organisationId),
    organisationHasWordPressConnector(organisationId),
    probeNativeWebsite(organisationId),
    probeCommsConnector(organisationId, enabledAppIds),
  ]);

  const probes: OverviewConnectorProbes = {
    stripeOk: stripe.ok,
    stripeMode: stripe.mode,
    comms,
    website: nativeWebsite ?? { ok: false },
  };

  if (wpConfigured) {
    probes.wordpress = {
      ok: Boolean(wpSync?.lastVendorLeadSyncAt),
      configured: true,
      lastSyncAt: wpSync?.lastVendorLeadSyncAt,
    };
  }

  return probes;
}
