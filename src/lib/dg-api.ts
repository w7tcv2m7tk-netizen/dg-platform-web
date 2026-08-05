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
  clerk_user_id?: string;
  setup: PortalSetup;
  onboarding?: PortalOnboardingProfile | null;
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

/** WordPress connector — vendor leads from Gen 1 RE module */
export function getWpConnectorBase(): string {
  return (
    process.env.DG_WP_CONNECTOR_BASE_URL?.replace(/\/$/, "") ??
    "https://roerealty.com.au/wp-json/digitalgate/v1"
  );
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

function wpConnectorApiKey(site?: WpHealthSite): string | undefined {
  return (
    site?.apiKey?.trim() ||
    process.env.DG_WP_CONNECTOR_API_KEY?.trim() ||
    process.env.DG_API_KEY?.trim() ||
    undefined
  );
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
): Promise<FetchWpVendorLeadsResult> {
  const connectorKey = process.env.DG_WP_CONNECTOR_API_KEY?.trim();
  const fallbackKey = process.env.DG_API_KEY?.trim();
  const apiKey = connectorKey || fallbackKey;

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
    const url = `${getWpConnectorBase()}/leads/vendor?limit=${limit}`;
    const res = await fetch(url, { headers, cache: "no-store" });
    const data = (await res.json().catch(() => null)) as {
      leads?: WpVendorLeadRow[];
      message?: string;
      code?: string;
    } | null;

    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        code: "auth_failed",
        status: res.status,
        message: connectorKey
          ? "Roe API rejected DG_WP_CONNECTOR_API_KEY — copy the Dev API key from roerealty.com.au → DG Platform → API Settings."
          : "Roe API rejected the API key. Use DG_WP_CONNECTOR_API_KEY from roerealty.com.au (not the digitalgate.com.au key).",
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        code: "upstream_error",
        status: res.status,
        message:
          data?.message ??
          `WordPress returned HTTP ${res.status} from ${getWpConnectorBase()}/leads/vendor`,
      };
    }

    const leads = data?.leads ?? [];
    if (!leads.length) {
      return {
        ok: false,
        code: "empty",
        message:
          "WordPress authenticated OK but returned 0 vendor leads. Add a test lead in Roe wp-admin → Vendor Leads, or check the Roe site has the Real Estate module active.",
      };
    }

    return { ok: true, leads };
  } catch {
    return {
      ok: false,
      code: "network_error",
      message: `Could not reach ${getWpConnectorBase()} — check DG_WP_CONNECTOR_BASE_URL.`,
    };
  }
}

type WpFetchErrorCode =
  | "missing_api_key"
  | "auth_failed"
  | "not_found"
  | "upstream_error"
  | "network_error";

async function wpConnectorFetch<T>(
  path: string,
  options?: { baseUrl?: string; apiKey?: string; allowEmpty?: boolean },
): Promise<
  | { ok: true; data: T }
  | { ok: false; code: WpFetchErrorCode; message: string; status?: number }
> {
  const baseUrl = (options?.baseUrl ?? getWpConnectorBase()).replace(/\/$/, "");
  const apiKey =
    options?.apiKey?.trim() ||
    process.env.DG_WP_CONNECTOR_API_KEY?.trim() ||
    process.env.DG_API_KEY?.trim();

  if (!apiKey) {
    return {
      ok: false,
      code: "missing_api_key",
      message:
        "Set DG_WP_CONNECTOR_API_KEY (WordPress → DG Platform → API Settings) on Vercel or .env.local.",
    };
  }

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      headers: { Accept: "application/json", "X-API-Key": apiKey },
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as T & {
      message?: string;
    } | null;

    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        code: "auth_failed",
        status: res.status,
        message: "WordPress rejected the API key — check DG_WP_CONNECTOR_API_KEY.",
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

export async function fetchWpBuyerLeads(limit = 100) {
  const result = await wpConnectorFetch<{ leads?: WpBuyerLeadRow[] }>(
    `/leads/buyer?limit=${limit}`,
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

export async function fetchWpRecentBookings(limit = 50) {
  const result = await wpConnectorFetch<{ bookings?: WpReBookingRow[] }>(
    `/bookings/recent?limit=${limit}`,
  );
  if (!result.ok) return result;
  return { ok: true as const, bookings: result.data.bookings ?? [] };
}

export type WpRePipelineSummary = {
  site?: string;
  property_reports_this_month?: number;
  bookings_this_month?: number;
  vendor_conversion?: Record<string, unknown>;
  vendor_pipeline?: Record<string, { label: string; count: number }>;
  buyer_pipeline?: Record<string, { label: string; count: number }>;
};

export async function fetchWpReSummary(days = 30) {
  return wpConnectorFetch<WpRePipelineSummary>(`/leads/summary?days=${days}`);
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
  occupancy_rate?: number;
  revenue_mtd?: number;
  checkins_tomorrow?: number;
  housekeeping?: Record<string, unknown>;
  recent_bookings?: WpAccBookingRow[];
};

export type WpAccUnitRow = {
  id: number;
  title: string;
  slug?: string;
  weekday_rate?: number;
  cleaning_fee?: number;
  housekeeping_status?: string;
  listing_status?: string;
  checkin_slug?: string;
};

export type WpAccBookingRow = {
  id: number;
  ref?: string;
  guest_name?: string;
  email?: string;
  accommodation?: string;
  accommodation_id?: number;
  checkin?: string;
  checkout?: string;
  status?: string;
  total?: number;
};

export async function fetchWpAccommodationSummary(siteId?: string | null, days = 30) {
  const site = getWpAccommodationSite(siteId);
  return wpConnectorFetch<WpAccommodationSummary>(
    `/accommodation/summary?days=${days}`,
    { baseUrl: site.baseUrl, apiKey: wpConnectorApiKey(site) },
  );
}

export async function fetchWpAccommodationUnits(siteId?: string | null) {
  const site = getWpAccommodationSite(siteId);
  const result = await wpConnectorFetch<{ properties?: WpAccUnitRow[] }>(
    "/accommodation/properties",
    { baseUrl: site.baseUrl, apiKey: wpConnectorApiKey(site) },
  );
  if (!result.ok) return result;
  return { ok: true as const, units: result.data.properties ?? [], site: site.label };
}

export async function fetchWpAccommodationBookings(
  siteId?: string | null,
  limit = 50,
) {
  const site = getWpAccommodationSite(siteId);
  const result = await wpConnectorFetch<{ bookings?: WpAccBookingRow[]; total?: number }>(
    `/accommodation/bookings?limit=${limit}`,
    { baseUrl: site.baseUrl, apiKey: wpConnectorApiKey(site) },
  );
  if (!result.ok) return result;
  return {
    ok: true as const,
    bookings: result.data.bookings ?? [],
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
