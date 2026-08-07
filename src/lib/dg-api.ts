const DEFAULT_API_BASE = "https://digitalgate.com.au/wp-json/digitalgate/v1";

/** Production CVH site — used when env contains placeholder URLs. */
export const CVH_WP_REST_BASE =
  "https://currumbinvalleyhideaway.com.au/wp-json/digitalgate/v1";

function isPlaceholderWpUrl(baseUrl: string): boolean {
  return /YOUR-CVH-SITE|example\.com|localhost|placeholder/i.test(baseUrl);
}

function wpSiteConfigHint(baseUrl: string, envVar = "DG_WP_ACCOMMODATION_SITES"): string {
  if (isPlaceholderWpUrl(baseUrl)) {
    return `Replace the placeholder in ${envVar} with the live WordPress URL (CVH: ${CVH_WP_REST_BASE}).`;
  }
  return `Check ${envVar} baseUrl and that the DG Platform plugin is active on that site.`;
}

function normalizeWpSites<T extends WpHealthSite>(sites: T[], fallback: T[]): T[] {
  const valid = sites.filter((site) => !isPlaceholderWpUrl(site.baseUrl));
  return valid.length ? valid : fallback;
}

function wpNetworkErrorMessage(baseUrl: string, path: string, envVar?: string): string {
  const varName =
    envVar ??
    (path.includes("/accommodation/") ? "DG_WP_ACCOMMODATION_SITES" : "DG_WP_HEALTH_SITES");
  return `Could not reach ${baseUrl}${path} — ${wpSiteConfigHint(baseUrl, varName)}`;
}

export function getApiBase(): string {
  return process.env.DG_API_BASE_URL?.replace(/\/$/, "") ?? DEFAULT_API_BASE;
}

export function getOnboardingUrl(): string {
  return (
    process.env.DG_ONBOARDING_URL ??
    "https://digitalgate.com.au/onboarding/"
  );
}

export type PortalSetup = {
  account_created: boolean;
  payment_done: boolean;
  onboarding_done: boolean;
  platform_live: boolean;
};

export type PortalOnboardingProfile = {
  business_name?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  phone?: string;
  business_email?: string;
  abn?: string;
  gst_number?: string;
  industry_license_number?: string;
  position?: string;
  street_address?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  website_url?: string;
  industry_vertical?: string;
  platform_tier?: string;
  purchased_apps?: string[];
  purchased_premium?: string[];
  purchased_addons?: string[];
  logo_url?: string;
  brand_colours?: string;
};

export type PortalProfile = {
  linked: boolean;
  email: string;
  name?: string;
  contact_id?: number;
  organisation_id?: number;
  org_name?: string;
  purchase_label?: string;
  purchase?: PortalPurchaseProfile | null;
  clerk_user_id?: string;
  setup: PortalSetup;
  onboarding?: PortalOnboardingProfile | null;
};

export type PortalPurchaseProfile = {
  dg_category?: string;
  dg_plan?: string;
  dg_platform_tier?: string;
  purchase_label?: string;
  stripe_session_id?: string;
};

const DEFAULT_UNLINKED_PROFILE = (email: string): PortalProfile => ({
  linked: false,
  email,
  setup: {
    account_created: true,
    payment_done: false,
    onboarding_done: false,
    platform_live: false,
  },
});

function apiHeaders(clerkUserId?: string, email?: string): HeadersInit | null {
  const apiKey = process.env.DG_API_KEY;
  if (!apiKey) {
    return null;
  }

  const headers: HeadersInit = {
    Accept: "application/json",
    "X-API-Key": apiKey,
  };
  if (email) {
    headers["X-Portal-Email"] = email;
  }
  if (clerkUserId) {
    headers["X-Clerk-User-Id"] = clerkUserId;
  }
  return headers;
}

export async function fetchPortalMe(
  email: string,
  clerkUserId?: string,
): Promise<PortalProfile> {
  const fallback = DEFAULT_UNLINKED_PROFILE(email);
  const headers = apiHeaders(clerkUserId, email);
  if (!headers) {
    return fallback;
  }

  try {
    const url = `${getApiBase()}/portal/me?email=${encodeURIComponent(email)}`;
    const res = await fetch(url, {
      headers,
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as PortalProfile | null;
    if (!res.ok || !data || typeof data.linked !== "boolean") {
      return fallback;
    }
    return data;
  } catch {
    return fallback;
  }
}

export type OnboardingPayload = {
  business_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  abn?: string;
  gst_number?: string;
  industry_license_number?: string;
  industry_vertical?: string;
  platform_tier?: string;
  purchased_apps?: string[];
  purchased_premium?: string[];
  purchased_addons?: string[];
  source?: string;
};

export async function submitOnboarding(payload: OnboardingPayload) {
  const apiKey = process.env.DG_API_KEY;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["X-API-Key"] = apiKey;
  }

  const res = await fetch(`${getApiBase()}/onboarding`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      ...payload,
      source: payload.source ?? "dg-platform-web",
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { message?: string }).message ?? `API error ${res.status}`,
    );
  }
  return data;
}

export async function pingApi(): Promise<{ ok: boolean; base: string }> {
  try {
    const res = await fetch(`${getApiBase()}/onboarding`, {
      method: "OPTIONS",
      cache: "no-store",
    });
    return { ok: res.ok || res.status === 204 || res.status === 405, base: getApiBase() };
  } catch {
    return { ok: false, base: getApiBase() };
  }
}

export type WpConnectorOverride = {
  baseUrl?: string;
  apiKey?: string;
  label?: string;
};

/** WordPress connector — vendor leads from Gen 1 RE module */
export function getWpConnectorBase(): string {
  return (
    process.env.DG_WP_CONNECTOR_BASE_URL?.replace(/\/$/, "") ??
    "https://roerealty.com.au/wp-json/digitalgate/v1"
  );
}

export type WpConnectorProbeResult =
  | {
      ok: true;
      kind: "real-estate" | "accommodation" | "site";
      detail: string;
      leadCount?: number;
      occupancyRate?: number;
    }
  | {
      ok: false;
      code:
        | "missing_api_key"
        | "auth_failed"
        | "not_found"
        | "upstream_error"
        | "network_error";
      message: string;
      status?: number;
    };

function detectWpConnectorKind(
  connector?: WpConnectorOverride | null,
): "real-estate" | "accommodation" | "site" {
  const hay = `${connector?.baseUrl ?? ""} ${connector?.label ?? ""}`.toLowerCase();
  if (
    hay.includes("currumbin") ||
    hay.includes("hideaway") ||
    hay.includes("accommodation") ||
    hay.includes("cvh")
  ) {
    return "accommodation";
  }
  if (
    hay.includes("roe") ||
    hay.includes("realty") ||
    hay.includes("real-estate") ||
    hay.includes("realestate")
  ) {
    return "real-estate";
  }
  return "site";
}

/** Probe the right module endpoint for this WordPress connector (RE vs accommodation vs generic). */
export async function probeWordPressConnector(
  connector?: WpConnectorOverride,
): Promise<WpConnectorProbeResult> {
  const kind = detectWpConnectorKind(connector);

  if (kind === "accommodation") {
    const summary = await fetchWpAccommodationSummary(null, 30, connector);
    if (!summary.ok) {
      return {
        ok: false,
        code: summary.code,
        message: summary.message,
        status: summary.status,
      };
    }
    const rate = summary.data.occupancy_rate;
    const occupancy =
      typeof rate === "number" ? Math.round(rate <= 1 ? rate * 100 : rate) : undefined;
    return {
      ok: true,
      kind,
      detail:
        occupancy != null
          ? `Accommodation connected — occupancy ${occupancy}%`
          : "Accommodation connected",
      occupancyRate: occupancy,
    };
  }

  if (kind === "real-estate") {
    const leads = await fetchWpVendorLeads(3, connector);
    if (!leads.ok) {
      return {
        ok: false,
        code: leads.code === "empty" ? "upstream_error" : leads.code,
        message: leads.message,
        status: leads.status,
      };
    }
    return {
      ok: true,
      kind,
      detail: `Connected — ${leads.leads.length} vendor lead(s) found`,
      leadCount: leads.leads.length,
    };
  }

  const health = await wpConnectorFetch<{ score?: number }>(`/site/health`, {
    baseUrl: connector?.baseUrl,
    apiKey: connector?.apiKey,
  });
  if (!health.ok) {
    return {
      ok: false,
      code: health.code,
      message: health.message,
      status: health.status,
    };
  }
  return {
    ok: true,
    kind: "site",
    detail: `Connected — site health score ${health.data.score ?? "OK"}`,
  };
}

export type WpHealthSite = {
  id: string;
  label: string;
  baseUrl: string;
  /** Optional per-site API key; falls back to DG_WP_CONNECTOR_API_KEY / DG_API_KEY */
  apiKey?: string;
};

function siteLabelFromBaseUrl(baseUrl: string) {
  try {
    return new URL(baseUrl.replace(/\/wp-json.*/, "")).hostname;
  } catch {
    return baseUrl.replace(/\/wp-json.*/, "") || "WordPress site";
  }
}

/** Configured WordPress sites for Health Centre (JSON in DG_WP_HEALTH_SITES). */
export function listWpHealthSites(): WpHealthSite[] {
  const roeFallback: WpHealthSite[] = [
    {
      id: "default",
      label: siteLabelFromBaseUrl(getWpConnectorBase()),
      baseUrl: getWpConnectorBase(),
    },
  ];

  const raw = process.env.DG_WP_HEALTH_SITES?.trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as WpHealthSite[];
      if (Array.isArray(parsed) && parsed.length) {
        return normalizeWpSites(
          parsed.map((site) => ({
            id: site.id,
            label: site.label || siteLabelFromBaseUrl(site.baseUrl),
            baseUrl: site.baseUrl.replace(/\/$/, ""),
            apiKey: site.apiKey,
          })),
          roeFallback,
        );
      }
    } catch {
      /* fall through to default */
    }
  }

  return roeFallback;
}

export function getWpHealthSite(siteId?: string | null): WpHealthSite {
  const sites = listWpHealthSites();
  if (siteId) {
    return sites.find((s) => s.id === siteId) ?? sites[0];
  }
  return sites[0];
}

function isCvhWpHost(baseUrl: string): boolean {
  try {
    return /currumbinvalleyhideaway/i.test(new URL(baseUrl).hostname);
  } catch {
    return /currumbinvalleyhideaway/i.test(baseUrl);
  }
}

/**
 * Resolve a WordPress Dev API key for a specific host.
 * Never reuse the global Roe/DigitalGate connector key on CVH (or any other host).
 */
export function resolveWpApiKeyForBaseUrl(
  baseUrl: string,
  explicitKey?: string | null,
  site?: WpHealthSite,
): string | undefined {
  const trimmed = explicitKey?.trim();
  if (trimmed && !trimmed.startsWith("enc:v1:")) return trimmed;

  if (site?.apiKey?.trim() && !site.apiKey.trim().startsWith("enc:v1:")) {
    return site.apiKey.trim();
  }

  const dedicated = process.env.DG_WP_ACCOMMODATION_API_KEY?.trim();
  if (isCvhWpHost(baseUrl) && dedicated) return dedicated;

  const globalKey =
    process.env.DG_WP_CONNECTOR_API_KEY?.trim() ||
    process.env.DG_API_KEY?.trim();
  if (!globalKey) return undefined;

  try {
    const targetHost = new URL(baseUrl.replace(/\/$/, "")).hostname;
    const envBase = (
      process.env.DG_WP_CONNECTOR_BASE_URL || getWpConnectorBase()
    ).replace(/\/$/, "");
    const envHost = new URL(envBase).hostname;
    if (targetHost && envHost && targetHost === envHost) return globalKey;
  } catch {
    /* ignore */
  }

  return undefined;
}

function wpConnectorApiKey(site?: WpHealthSite): string | undefined {
  const baseUrl = site?.baseUrl?.replace(/\/$/, "") || "";
  return resolveWpApiKeyForBaseUrl(baseUrl, site?.apiKey, site);
}

export type WpVendorLeadRow = {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  property_address?: string;
  source?: string;
  stage?: string;
  status?: string;
  created_at?: string;
};

export type FetchWpVendorLeadsResult =
  | { ok: true; leads: WpVendorLeadRow[] }
  | {
      ok: false;
      code:
        | "missing_api_key"
        | "auth_failed"
        | "not_found"
        | "upstream_error"
        | "empty"
        | "network_error";
      message: string;
      status?: number;
    };

export async function fetchWpVendorLeads(
  limit = 100,
  connector?: WpConnectorOverride,
): Promise<FetchWpVendorLeadsResult> {
  const result = await wpConnectorFetch<{ leads?: WpVendorLeadRow[] }>(
    `/leads/vendor?limit=${limit}`,
    {
      baseUrl: connector?.baseUrl,
      apiKey: connector?.apiKey,
    },
  );
  if (!result.ok) {
    return result;
  }

  const leads = result.data.leads ?? [];
  if (!leads.length) {
    const label = connector?.label ?? "WordPress";
    return {
      ok: false,
      code: "empty",
      message: `${label} authenticated OK but returned 0 vendor leads. Add a test lead in wp-admin or check the Real Estate module is active.`,
    };
  }

  return { ok: true, leads };
}

type WpFetchErrorCode =
  | "missing_api_key"
  | "auth_failed"
  | "not_found"
  | "upstream_error"
  | "network_error";

async function wpConnectorFetch<T>(
  path: string,
  options?: {
    baseUrl?: string;
    apiKey?: string;
    allowEmpty?: boolean;
    method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
    body?: unknown;
  },
): Promise<
  | { ok: true; data: T }
  | { ok: false; code: WpFetchErrorCode; message: string; status?: number }
> {
  const baseUrl = (options?.baseUrl ?? getWpConnectorBase()).replace(/\/$/, "");
  const apiKey = resolveWpApiKeyForBaseUrl(baseUrl, options?.apiKey);

  if (!apiKey) {
    const host = (() => {
      try {
        return new URL(baseUrl).hostname;
      } catch {
        return baseUrl;
      }
    })();
    const isCvh = isCvhWpHost(baseUrl);
    return {
      ok: false,
      code: "missing_api_key",
      message: isCvh
        ? "Missing CVH API key. Copy it from currumbinvalleyhideaway.com.au → DG Platform → API Settings, then paste it under Settings → Connectors (CVH preset) and Save. Do not leave the key blank — the Roe/DigitalGate env key is never sent to CVH."
        : `Missing API key for ${host}. Paste the site Dev API key under Settings → Connectors, or set DG_WP_CONNECTOR_API_KEY when the env base URL matches this host.`,
    };
  }

  try {
    const method = options?.method ?? "GET";
    const headers: Record<string, string> = {
      Accept: "application/json",
      "X-API-Key": apiKey,
    };
    if (options?.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as T & {
      message?: string;
    } | null;

    if (res.status === 401 || res.status === 403) {
      const host = (() => {
        try {
          return new URL(baseUrl).hostname;
        } catch {
          return baseUrl;
        }
      })();
      const isCvh = isCvhWpHost(baseUrl);
      return {
        ok: false,
        code: "auth_failed",
        status: res.status,
        message: isCvh
          ? "CVH WordPress rejected the API key. Re-copy the key from currumbinvalleyhideaway.com.au → DG Platform → API Settings (regenerate if unsure), paste it on Settings → Connectors for the CVH business, then Save + Test. Do not use the Roe or DigitalGate key."
          : `WordPress rejected the API key for ${host} — check the org connector key matches that site's DG Platform → API Settings.`,
      };
    }

    if (res.status === 404) {
      return {
        ok: false,
        code: "not_found",
        status: res.status,
        message: `Endpoint not found: ${baseUrl}${path}`,
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        code: "upstream_error",
        status: res.status,
        message: data?.message ?? `WordPress returned HTTP ${res.status}`,
      };
    }

    return { ok: true, data: data as T };
  } catch {
    return {
      ok: false,
      code: "network_error",
      message: wpNetworkErrorMessage(baseUrl, path),
    };
  }
}

export type WpBuyerLeadRow = {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  property_address?: string;
  property_url?: string;
  requirements?: string;
  stage?: string;
  status?: string;
  created_at?: string;
};

export async function fetchWpBuyerLeads(limit = 100, connector?: WpConnectorOverride) {
  const result = await wpConnectorFetch<{ leads?: WpBuyerLeadRow[] }>(
    `/leads/buyer?limit=${limit}`,
    {
      baseUrl: connector?.baseUrl,
      apiKey: connector?.apiKey,
    },
  );
  if (!result.ok) return result;
  return { ok: true as const, leads: result.data.leads ?? [] };
}

export type WpReBookingRow = {
  id: number;
  contact?: string;
  email?: string;
  phone?: string;
  service?: string;
  type?: string;
  date?: string;
  time?: string;
  status?: string;
  created_at?: string;
};

export async function fetchWpRecentBookings(limit = 50, connector?: WpConnectorOverride) {
  const result = await wpConnectorFetch<{ bookings?: WpReBookingRow[] }>(
    `/bookings/recent?limit=${limit}`,
    {
      baseUrl: connector?.baseUrl,
      apiKey: connector?.apiKey,
      allowEmpty: true,
    },
  );
  if (!result.ok) return result;
  return { ok: true as const, bookings: result.data.bookings ?? [] };
}

export type WpPropertyListingRow = {
  id: number;
  dg_property_id?: string;
  title?: string;
  permalink?: string;
  post_status?: string;
  status?: string;
  address?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  price?: string | number;
  property_type?: string;
  bedrooms?: string | number;
  bathrooms?: string | number;
  car_spaces?: string | number;
  land_size?: string;
  building_size?: string;
  features?: string;
  description?: string;
  external_id?: string;
  images?: string[];
  featured_image?: string | null;
  agent?: {
    id?: number;
    name?: string;
    phone?: string;
    email?: string;
  };
  modified_at?: string;
};

export async function fetchWpProperties(limit = 100, connector?: WpConnectorOverride) {
  const result = await wpConnectorFetch<{ properties?: WpPropertyListingRow[] }>(
    `/properties?limit=${limit}`,
    {
      baseUrl: connector?.baseUrl,
      apiKey: connector?.apiKey,
      allowEmpty: true,
    },
  );
  if (!result.ok) return result;
  return { ok: true as const, properties: result.data.properties ?? [] };
}

export type WpRePipelineSummary = {
  site?: string;
  property_reports_this_month?: number;
  bookings_this_month?: number;
  vendor_conversion?: Record<string, unknown>;
  vendor_pipeline?: Record<string, { label: string; count: number }>;
  buyer_pipeline?: Record<string, { label: string; count: number }>;
};

export async function fetchWpReSummary(days = 30, connector?: WpConnectorOverride) {
  return wpConnectorFetch<WpRePipelineSummary>(`/leads/summary?days=${days}`, {
    baseUrl: connector?.baseUrl,
    apiKey: connector?.apiKey,
  });
}

export type WpAccommodationSite = WpHealthSite;

/** Accommodation WordPress sites — JSON in DG_WP_ACCOMMODATION_SITES, else health sites. */
export function listWpAccommodationSites(): WpAccommodationSite[] {
  const cvhFallback: WpAccommodationSite[] = [
    {
      id: "cvh",
      label: "Currumbin Valley Hideaway",
      baseUrl: CVH_WP_REST_BASE,
    },
  ];

  const raw = process.env.DG_WP_ACCOMMODATION_SITES?.trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as WpAccommodationSite[];
      if (Array.isArray(parsed) && parsed.length) {
        return normalizeWpSites(
          parsed.map((site) => ({
            id: site.id,
            label: site.label || siteLabelFromBaseUrl(site.baseUrl),
            baseUrl: site.baseUrl.replace(/\/$/, ""),
            apiKey: site.apiKey,
          })),
          cvhFallback,
        );
      }
    } catch {
      /* fall through */
    }
  }

  const healthSites = listWpHealthSites();
  const validHealth = healthSites.filter((site) => !isPlaceholderWpUrl(site.baseUrl));
  if (validHealth.length) {
    return validHealth;
  }

  return cvhFallback;
}

export function getWpAccommodationSite(siteId?: string | null): WpAccommodationSite {
  const sites = listWpAccommodationSites();
  if (siteId) {
    return sites.find((s) => s.id === siteId) ?? sites[0];
  }
  return sites[0];
}

export type WpAccommodationSummary = {
  site?: string;
  site_profile?: string;
  /** 0–100 percentage from WordPress. */
  occupancy_rate?: number;
  revenue_mtd?: number;
  revenue_month?: number;
  properties?: number;
  guests?: number;
  upcoming_30d?: number;
  checkins_tomorrow?: number;
  housekeeping?: Record<string, unknown>;
  recent_bookings?: WpAccBookingRow[];
};

export type WpAccUnitRow = {
  id: number;
  title: string;
  slug?: string;
  weekday_rate?: number;
  weekend_rate?: number;
  cleaning_fee?: number;
  housekeeping_status?: string;
  housekeeping_notes?: string;
  last_cleaned?: string | null;
  listing_status?: string;
  checkin_slug?: string;
  checkin_url?: string;
  cleaning_form_url?: string;
};

export type WpAccBookingRow = {
  id: number;
  ref?: string;
  guest_name?: string;
  email?: string;
  phone?: string;
  accommodation?: string;
  accommodation_id?: number;
  checkin?: string;
  checkout?: string;
  status?: string;
  /** Channel when status is airbnb/bookingcom, or explicit source field. */
  source?: string;
  total?: number;
};

export type WpAccAvailabilityUnit = {
  id: number;
  title: string;
  listing_status?: string;
  weekday_rate?: number;
  weekend_rate?: number;
  blocked_dates?: string[];
  bookings?: WpAccBookingRow[];
};

export type WpAccHousekeepingItem = {
  id: number;
  title: string;
  status: string;
  notes?: string;
  last_cleaned?: string | null;
  cleaning_form_url?: string;
  checkin_url?: string;
};

function resolveAccConnector(
  siteId?: string | null,
  connector?: WpConnectorOverride,
): { baseUrl: string; apiKey?: string; label: string } {
  if (connector?.baseUrl) {
    const baseUrl = connector.baseUrl.replace(/\/$/, "");
    return {
      baseUrl,
      apiKey: resolveWpApiKeyForBaseUrl(baseUrl, connector.apiKey),
      label: connector.label || "Currumbin Valley Hideaway",
    };
  }
  const site = getWpAccommodationSite(siteId);
  return {
    baseUrl: site.baseUrl,
    apiKey: wpConnectorApiKey(site),
    label: site.label,
  };
}

export async function fetchWpAccommodationSummary(
  siteId?: string | null,
  days = 30,
  connector?: WpConnectorOverride,
) {
  const site = resolveAccConnector(siteId, connector);
  return wpConnectorFetch<WpAccommodationSummary>(
    `/accommodation/summary?days=${days}`,
    { baseUrl: site.baseUrl, apiKey: site.apiKey },
  );
}

export async function fetchWpAccommodationUnits(
  siteId?: string | null,
  connector?: WpConnectorOverride,
) {
  const site = resolveAccConnector(siteId, connector);
  const result = await wpConnectorFetch<{ properties?: WpAccUnitRow[] }>(
    "/accommodation/properties",
    { baseUrl: site.baseUrl, apiKey: site.apiKey },
  );
  if (!result.ok) return result;
  return { ok: true as const, units: result.data.properties ?? [], site: site.label };
}

export async function fetchWpAccommodationBookings(
  siteId?: string | null,
  limit = 50,
  connector?: WpConnectorOverride,
) {
  const site = resolveAccConnector(siteId, connector);
  const result = await wpConnectorFetch<{ bookings?: WpAccBookingRow[]; total?: number }>(
    `/accommodation/bookings?limit=${limit}`,
    { baseUrl: site.baseUrl, apiKey: site.apiKey },
  );
  if (!result.ok) return result;
  return {
    ok: true as const,
    bookings: result.data.bookings ?? [],
    total: result.data.total ?? 0,
    site: site.label,
  };
}

export async function fetchWpAccommodationAvailability(
  opts?: {
    siteId?: string | null;
    from?: string;
    to?: string;
    propertyId?: number;
    connector?: WpConnectorOverride;
  },
) {
  const site = resolveAccConnector(opts?.siteId, opts?.connector);
  const params = new URLSearchParams();
  if (opts?.from) params.set("from", opts.from);
  if (opts?.to) params.set("to", opts.to);
  if (opts?.propertyId) params.set("property_id", String(opts.propertyId));
  const qs = params.toString();
  const result = await wpConnectorFetch<{
    from?: string;
    to?: string;
    units?: WpAccAvailabilityUnit[];
    total?: number;
  }>(`/accommodation/availability${qs ? `?${qs}` : ""}`, {
    baseUrl: site.baseUrl,
    apiKey: site.apiKey,
  });
  if (!result.ok) return result;
  return {
    ok: true as const,
    from: result.data.from,
    to: result.data.to,
    units: result.data.units ?? [],
    total: result.data.total ?? 0,
    site: site.label,
  };
}

export async function syncWpAccommodationOtaCalendars(
  connector?: WpConnectorOverride,
  options?: { propertyId?: number; source?: "all" | "airbnb" | "bookingcom" },
) {
  const site = resolveAccConnector(null, connector);
  return wpConnectorFetch<{
    ok?: boolean;
    imported?: number;
    updated?: number;
    cancelled?: number;
    message?: string;
    errors?: string[];
    properties?: Array<Record<string, unknown>>;
  }>("/accommodation/ota-sync", {
    baseUrl: site.baseUrl,
    apiKey: site.apiKey,
    method: "POST",
    body: {
      property_id: options?.propertyId,
      source: options?.source ?? "all",
    },
  });
}

export async function fetchWpAccommodationHousekeeping(
  siteId?: string | null,
  connector?: WpConnectorOverride,
) {
  const site = resolveAccConnector(siteId, connector);
  const result = await wpConnectorFetch<{
    items?: WpAccHousekeepingItem[];
    summary?: Record<string, number>;
    statuses?: Record<string, string>;
    total?: number;
  }>("/accommodation/housekeeping", {
    baseUrl: site.baseUrl,
    apiKey: site.apiKey,
  });
  if (!result.ok) return result;
  return {
    ok: true as const,
    items: result.data.items ?? [],
    summary: result.data.summary ?? {},
    statuses: result.data.statuses ?? {},
    total: result.data.total ?? 0,
    site: site.label,
  };
}

export async function patchWpAccommodationHousekeeping(
  updates: Array<{ property_id: number; status: string; notes?: string }>,
  connector?: WpConnectorOverride,
) {
  const site = resolveAccConnector(null, connector);
  return wpConnectorFetch<{ ok?: boolean; updated?: number[]; count?: number }>(
    "/accommodation/housekeeping",
    {
      baseUrl: site.baseUrl,
      apiKey: site.apiKey,
      method: "PATCH",
      body: { updates },
    },
  );
}

export type WpAccGuestRow = {
  id: number;
  name?: string;
  email?: string;
  phone?: string;
  total_stays?: number;
};

export async function fetchWpAccommodationGuests(
  siteId?: string | null,
  limit = 50,
  connector?: WpConnectorOverride,
) {
  const site = resolveAccConnector(siteId, connector);
  const result = await wpConnectorFetch<{ guests?: WpAccGuestRow[]; total?: number }>(
    `/accommodation/guests?limit=${limit}`,
    { baseUrl: site.baseUrl, apiKey: site.apiKey },
  );
  if (!result.ok) return result;
  return {
    ok: true as const,
    guests: result.data.guests ?? [],
    total: result.data.total ?? 0,
    site: site.label,
  };
}

export type WpSiteHealthPayload = {
  site?: string;
  generated_at?: string;
  score?: number;
  pass?: number;
  warn?: number;
  fail?: number;
  checks?: Array<{
    id?: string;
    label?: string;
    status?: string;
    detail?: string;
  }>;
  pagespeed?: {
    mobile?: number | null;
    desktop?: number | null;
    checked_at?: string | null;
  };
  ssl?: {
    enabled?: boolean;
  };
};

export type FetchWpSiteHealthResult =
  | { ok: true; payload: WpSiteHealthPayload }
  | {
      ok: false;
      code:
        | "missing_api_key"
        | "auth_failed"
        | "not_found"
        | "upstream_error"
        | "network_error";
      message: string;
      status?: number;
    };

export async function fetchWpSiteHealth(
  siteId?: string | null,
): Promise<FetchWpSiteHealthResult> {
  const site = getWpHealthSite(siteId);
  const apiKey = wpConnectorApiKey(site);

  if (!apiKey) {
    return {
      ok: false,
      code: "missing_api_key",
      message:
        "Set DG_WP_CONNECTOR_API_KEY (Roe roerealty.com.au → DG Platform → API Settings) on Vercel or .env.local.",
    };
  }

  const headers: HeadersInit = {
    Accept: "application/json",
    "X-API-Key": apiKey,
  };

  try {
    const url = `${site.baseUrl}/site/health`;
    const res = await fetch(url, { headers, cache: "no-store" });
    const data = (await res.json().catch(() => null)) as WpSiteHealthPayload & {
      message?: string;
      code?: string;
    } | null;

    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        code: "auth_failed",
        status: res.status,
        message: site.apiKey
          ? `${site.label} rejected its API key — check DG_WP_HEALTH_SITES config.`
          : "Roe API rejected the API key. Use DG_WP_CONNECTOR_API_KEY from roerealty.com.au (not the digitalgate.com.au key).",
      };
    }

    if (res.status === 404) {
      return {
        ok: false,
        code: "not_found",
        status: res.status,
        message:
          "Site health endpoint not found on WordPress — deploy the latest DG Platform plugin with /site/health.",
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        code: "upstream_error",
        status: res.status,
        message:
          data?.message ??
          `WordPress returned HTTP ${res.status} from ${site.baseUrl}/site/health`,
      };
    }

    if (!data || typeof data.score !== "number") {
      return {
        ok: false,
        code: "upstream_error",
        status: res.status,
        message: "WordPress returned an invalid site health payload.",
      };
    }

    return {
      ok: true,
      payload: {
        ...data,
        site: data.site ?? site.label,
      },
    };
  } catch {
    return {
      ok: false,
      code: "network_error",
      message: wpNetworkErrorMessage(site.baseUrl, "/site/health", "DG_WP_HEALTH_SITES"),
    };
  }
}
