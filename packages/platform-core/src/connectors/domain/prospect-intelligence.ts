import { domainApiGet, fetchDomainClientCredentialsToken } from "./auth";

type DomainAgencyRow = {
  id?: number;
  name?: string;
  suburb?: string;
  state?: string;
  address1?: string;
  address2?: string;
  telephone?: string;
  mobile?: string;
  email?: string;
  domainUrl?: string;
  hasRecentlySold?: boolean;
  numberForSale?: number;
  numberForRent?: number;
};

export type DomainProspectAgencyEvidence =
  | {
      ok: true;
      status: "verified_match";
      provider: "Domain";
      retrievedAt: string;
      agency: {
        id: number;
        name: string;
        suburb?: string;
        state?: string;
        address?: string;
        telephone?: string;
        mobile?: string;
        email?: string;
        domainUrl?: string;
        hasRecentlySold?: boolean;
        numberForSale?: number;
        numberForRent?: number;
      };
    }
  | {
      ok: false;
      status: "not_configured" | "not_entitled" | "no_confident_match" | "provider_error";
      message: string;
    };

function normalise(value: string | undefined): string {
  return (value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export async function fetchDomainProspectAgencyEvidence(input: {
  businessName: string;
  location?: string | null;
}): Promise<DomainProspectAgencyEvidence> {
  const token = await fetchDomainClientCredentialsToken({ scopes: "api_agencies_read api_listings_read" });
  if (!token.ok) {
    const message = token.message || "Domain client-credentials token unavailable";
    const lower = message.toLowerCase();
    return {
      ok: false,
      status: lower.includes("not set") ? "not_configured" : lower.includes("unauthorized") || token.status === 401 || token.status === 403 ? "not_entitled" : "provider_error",
      message,
    };
  }

  const q = encodeURIComponent(`name:"${input.businessName.replace(/"/g, "")}"`);
  const response = await domainApiGet(`/v1/agencies?q=${q}&pageNumber=1&pageSize=10`, token.token.access_token);
  if (!response.ok) {
    return {
      ok: false,
      status: response.status === 401 || response.status === 403 ? "not_entitled" : "provider_error",
      message: response.message,
    };
  }

  const rows = Array.isArray(response.data) ? (response.data as DomainAgencyRow[]) : [];
  const target = normalise(input.businessName);
  const location = normalise(input.location || undefined);
  const exact = rows.filter((row) => normalise(row.name) === target);
  const candidates = exact.length ? exact : rows.filter((row) => {
    const name = normalise(row.name);
    return name && (name.includes(target) || target.includes(name));
  });
  const matched = candidates.find((row) => {
    if (!location) return true;
    const suburb = normalise(row.suburb);
    const state = normalise(row.state);
    return (suburb && location.includes(suburb)) || (state && location.includes(state));
  }) || (candidates.length === 1 ? candidates[0] : undefined);

  if (!matched?.id || !matched.name) {
    return { ok: false, status: "no_confident_match", message: "Domain agency search returned no confident business/location match." };
  }

  return {
    ok: true,
    status: "verified_match",
    provider: "Domain",
    retrievedAt: new Date().toISOString(),
    agency: {
      id: matched.id,
      name: matched.name,
      suburb: matched.suburb,
      state: matched.state,
      address: [matched.address1, matched.address2].filter(Boolean).join(", ") || undefined,
      telephone: matched.telephone,
      mobile: matched.mobile,
      email: matched.email,
      domainUrl: matched.domainUrl,
      hasRecentlySold: matched.hasRecentlySold,
      numberForSale: matched.numberForSale,
      numberForRent: matched.numberForRent,
    },
  };
}
