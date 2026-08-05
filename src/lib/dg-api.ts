const DEFAULT_API_BASE = "https://digitalgate.com.au/wp-json/digitalgate/v1";

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

export async function fetchWpSiteHealth(): Promise<FetchWpSiteHealthResult> {
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
    const url = `${getWpConnectorBase()}/site/health`;
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
        message: connectorKey
          ? "Roe API rejected DG_WP_CONNECTOR_API_KEY — copy the Dev API key from roerealty.com.au → DG Platform → API Settings."
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
          `WordPress returned HTTP ${res.status} from ${getWpConnectorBase()}/site/health`,
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

    return { ok: true, payload: data };
  } catch {
    return {
      ok: false,
      code: "network_error",
      message: `Could not reach ${getWpConnectorBase()} — check DG_WP_CONNECTOR_BASE_URL.`,
    };
  }
}
