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

import { accommodationConnectorForSession } from "@/lib/accommodation-connector";
import {
  fetchWpAccommodationSummary,
  fetchWpReSummary,
  fetchWpSiteHealth,
} from "@/lib/dg-api";
import { wpConnectorForOrg } from "@/lib/org-wordpress-connector";
import { getLastWordPressSync } from "@/lib/wordpress-sync";

function sumPipelineCounts(
  pipeline?: Record<string, { count?: number }>,
): number | undefined {
  if (!pipeline) return undefined;
  const total = Object.values(pipeline).reduce((sum, stage) => sum + (stage.count ?? 0), 0);
  return total > 0 ? total : undefined;
}

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

/** Probe Design Studio, WordPress, Stripe, and site health for Business Overview. */
export async function fetchOverviewConnectorProbes(
  enabledAppIds: string[],
  organisationId: string,
): Promise<OverviewConnectorProbes> {
  const stripe = getStripeSetupStatus();
  const wpSync = await getLastWordPressSync(organisationId);
  const wpConfigured = await organisationHasWordPressConnector(organisationId);
  const orgConnector = await wpConnectorForOrg(organisationId);
  const accConnector = await accommodationConnectorForSession(organisationId);

  const [siteHealth, reSummary, accSummary, nativeWebsite, comms] = await Promise.all([
    wpConfigured ? fetchWpSiteHealth() : Promise.resolve({ ok: false as const }),
    enabledAppIds.includes("real-estate")
      ? fetchWpReSummary(30, orgConnector)
      : Promise.resolve(null),
    enabledAppIds.includes("accommodation")
      ? fetchWpAccommodationSummary(null, 30, accConnector)
      : Promise.resolve(null),
    probeNativeWebsite(organisationId),
    probeCommsConnector(organisationId, enabledAppIds),
  ]);

  const hasWpKey =
    Boolean(orgConnector.apiKey?.trim()) ||
    Boolean(process.env.DG_WP_CONNECTOR_API_KEY?.trim()) ||
    Boolean(process.env.DG_API_KEY?.trim());

  const probes: OverviewConnectorProbes = {
    stripeOk: stripe.ok,
    stripeMode: stripe.mode,
    comms,
  };

  if (nativeWebsite) {
    probes.website = nativeWebsite;
  } else if (siteHealth.ok) {
    probes.website = {
      ok: true,
      score: siteHealth.payload.score,
      pass: siteHealth.payload.pass,
      warn: siteHealth.payload.warn,
      fail: siteHealth.payload.fail,
      siteLabel: siteHealth.payload.site,
    };
  } else {
    probes.website = { ok: false };
  }

  const wpConnected =
    Boolean(wpSync?.lastVendorLeadSyncAt) ||
    reSummary?.ok === true ||
    accSummary?.ok === true ||
    (hasWpKey && siteHealth.ok);

  if (wpConfigured) {
    probes.wordpress = {
      ok: wpConnected,
      configured: true,
      lastSyncAt: wpSync?.lastVendorLeadSyncAt,
      vendorLeadCount: reSummary?.ok
        ? sumPipelineCounts(reSummary.data.vendor_pipeline)
        : undefined,
    };
  }

  if (reSummary?.ok) {
    const data = reSummary.data;
    probes.reSummary = {
      ok: true,
      vendorPipelineTotal: sumPipelineCounts(data.vendor_pipeline),
      buyerPipelineTotal: sumPipelineCounts(data.buyer_pipeline),
      bookingsThisMonth: data.bookings_this_month,
      newVendorLeads: data.vendor_pipeline?.new?.count,
    };
  }

  if (accSummary?.ok) {
    const rate = accSummary.data.occupancy_rate;
    probes.accommodation = {
      ok: true,
      occupancyRate:
        typeof rate === "number" ? Math.round(rate <= 1 ? rate * 100 : rate) : undefined,
      revenueMtd: accSummary.data.revenue_mtd ?? accSummary.data.revenue_month,
      checkinsTomorrow: accSummary.data.checkins_tomorrow,
    };
  }

  return probes;
}
