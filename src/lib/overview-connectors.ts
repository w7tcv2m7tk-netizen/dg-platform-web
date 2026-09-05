import {
  buildNativeWebsiteHealth,
  getStripeSetupStatus,
  listLeads,
  listOrganisationDomains,
  listReBookings,
  listWebsitesWithPages,
  pickWebsiteForHealthProbe,
  probeCommsConnector,
  resolvePrimaryLinkedDomain,
  type OverviewConnectorProbes,
  type WebsiteProbe,
} from "@dg/platform-core";

import { buildAccommodationSummary } from "@/lib/accommodation-summary";

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

async function probeNativeRealEstate(
  organisationId: string,
): Promise<OverviewConnectorProbes["reSummary"]> {
  try {
    const [vendorLeads, buyerLeads, bookings] = await Promise.all([
      listLeads({ organisationId, leadType: "vendor", limit: 1 }),
      listLeads({ organisationId, leadType: "buyer", limit: 1 }),
      listReBookings(organisationId, 100),
    ]);
    const monthPrefix = new Date().toISOString().slice(0, 7);
    return {
      ok: true,
      vendorPipelineTotal: vendorLeads.meta.total,
      buyerPipelineTotal: buyerLeads.meta.total,
      bookingsThisMonth: bookings.filter((booking) =>
        booking.scheduledAt?.startsWith(monthPrefix),
      ).length,
    };
  } catch {
    return { ok: false };
  }
}

async function probeNativeAccommodation(
  organisationId: string,
): Promise<OverviewConnectorProbes["accommodation"]> {
  try {
    const summary = await buildAccommodationSummary(organisationId);
    return {
      ok: true,
      occupancyRate: Math.round(summary.occupancy_rate * 100),
      revenueMtd: summary.revenue_mtd,
      checkinsTomorrow: summary.checkins_tomorrow,
    };
  } catch {
    return { ok: false };
  }
}

/** Probe native Gen 2 systems for Business intelligence surfaces. */
export async function fetchOverviewConnectorProbes(
  enabledAppIds: string[],
  organisationId: string,
): Promise<OverviewConnectorProbes> {
  const stripe = getStripeSetupStatus();
  const [nativeWebsite, reSummary, accommodation, comms] = await Promise.all([
    probeNativeWebsite(organisationId),
    enabledAppIds.includes("real-estate")
      ? probeNativeRealEstate(organisationId)
      : Promise.resolve(undefined),
    enabledAppIds.includes("accommodation")
      ? probeNativeAccommodation(organisationId)
      : Promise.resolve(undefined),
    probeCommsConnector(organisationId, enabledAppIds),
  ]);

  const probes: OverviewConnectorProbes = {
    stripeOk: stripe.ok,
    stripeMode: stripe.mode,
    comms,
    website: nativeWebsite ?? { ok: false },
  };

  if (reSummary) probes.reSummary = reSummary;
  if (accommodation) probes.accommodation = accommodation;

  return probes;
}
