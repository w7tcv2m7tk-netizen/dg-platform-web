import { getStripeSetupStatus, organisationHasWordPressConnector, type OverviewConnectorProbes } from "@dg/platform-core";

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

/** Probe WordPress, Stripe, and site health for Business Overview. */
export async function fetchOverviewConnectorProbes(
  enabledAppIds: string[],
  organisationId: string,
): Promise<OverviewConnectorProbes> {
  const stripe = getStripeSetupStatus();
  const wpSync = await getLastWordPressSync(organisationId);
  const wpConfigured = await organisationHasWordPressConnector(organisationId);
  const orgConnector = await wpConnectorForOrg(organisationId);
  const accConnector = await accommodationConnectorForSession(organisationId);

  const [siteHealth, reSummary, accSummary] = await Promise.all([
    fetchWpSiteHealth(),
    enabledAppIds.includes("real-estate")
      ? fetchWpReSummary(30, orgConnector)
      : Promise.resolve(null),
    enabledAppIds.includes("accommodation")
      ? fetchWpAccommodationSummary(null, 30, accConnector)
      : Promise.resolve(null),
  ]);

  const hasWpKey =
    Boolean(orgConnector.apiKey?.trim()) ||
    Boolean(process.env.DG_WP_CONNECTOR_API_KEY?.trim()) ||
    Boolean(process.env.DG_API_KEY?.trim());

  const probes: OverviewConnectorProbes = {
    stripeOk: stripe.ok,
    stripeMode: stripe.mode,
  };

  if (siteHealth.ok) {
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
