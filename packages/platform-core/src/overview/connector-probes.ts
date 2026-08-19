/** Connector probe results — fetched in app layer, passed to overview builder. */

export interface WebsiteProbe {
  ok: boolean;
  score?: number;
  pass?: number;
  warn?: number;
  fail?: number;
  siteLabel?: string;
}

export interface WordPressProbe {
  ok: boolean;
  /** Org explicitly configured a WP connector (not env/preset fallback). */
  configured?: boolean;
  lastSyncAt?: string;
  vendorLeadCount?: number;
}

export interface ReSummaryProbe {
  ok: boolean;
  vendorPipelineTotal?: number;
  buyerPipelineTotal?: number;
  bookingsThisMonth?: number;
  newVendorLeads?: number;
}

export interface AccommodationProbe {
  ok: boolean;
  occupancyRate?: number;
  revenueMtd?: number;
  checkinsTomorrow?: number;
}

export interface OverviewConnectorProbes {
  website?: WebsiteProbe;
  wordpress?: WordPressProbe;
  stripeOk?: boolean;
  stripeMode?: string;
  reSummary?: ReSummaryProbe;
  accommodation?: AccommodationProbe;
}
