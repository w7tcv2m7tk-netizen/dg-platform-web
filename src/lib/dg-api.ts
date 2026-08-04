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
