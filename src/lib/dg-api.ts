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

export async function fetchWpVendorLeads(limit = 100): Promise<WpVendorLeadRow[]> {
  const headers = apiHeaders();
  if (!headers) {
    return [];
  }

  try {
    const url = `${getWpConnectorBase()}/leads/vendor?limit=${limit}`;
    const res = await fetch(url, { headers, cache: "no-store" });
    const data = (await res.json().catch(() => null)) as {
      leads?: WpVendorLeadRow[];
    } | null;
    if (!res.ok || !data?.leads) {
      return [];
    }
    return data.leads;
  } catch {
    return [];
  }
}
