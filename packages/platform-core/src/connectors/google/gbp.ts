/**
 * Google Business Profile — accounts, locations, profile fields, optional reviews.
 *
 * Auth scope: `business.manage` (see auth.ts). Reviews use My Business API v4;
 * if the login lacks manager access or a location path is wrong, we still sync location metadata.
 * APIs + OAuth client must live on the allowlisted project (see ./project.ts).
 */

import {
  ensureValidOrgGoogleAccessToken,
  getOrgGoogleGbpConnectorTokens,
  googleApiGet,
  saveOrgGoogleGbpConnectorTokens,
  type OrgGoogleGbpConnectorTokens,
  GOOGLE_GBP_ACCOUNTS_URL,
} from "./auth";
import {
  parseGbpAccounts,
  parseGbpLocations,
  parseGbpReviews,
  summarizeGbpReviewBlock,
  toGbpReviewsParent,
  type GbpAccountSummary,
  type GbpLocationSummary,
  type GbpReviewCacheItem,
} from "./gbp-parse";

export * from "./gbp-parse";

export const GOOGLE_GBP_BUSINESS_INFO_BASE =
  "https://mybusinessbusinessinformation.googleapis.com/v1";
export const GOOGLE_GBP_REVIEWS_V4_BASE = "https://mybusiness.googleapis.com/v4";

export const GOOGLE_GBP_LOCATION_READ_MASK = [
  "name", "title", "storeCode", "websiteUri", "phoneNumbers", "storefrontAddress",
  "categories", "metadata", "latlng", "openInfo", "profile",
].join(",");

export type GbpConnectionHealth = {
  status: "connected" | "degraded" | "error" | "disconnected";
  lastSyncAt?: string | null;
  lastError?: string | null;
  accountCount?: number;
  locationCount?: number;
  reviewsSynced?: number;
  reviewsAvailable?: boolean;
  reviewsBlockedReason?: string | null;
  message?: string | null;
};

export type GbpSyncSnapshot = {
  health: GbpConnectionHealth;
  accounts: GbpAccountSummary[];
  locations: GbpLocationSummary[];
  reviews: GbpReviewCacheItem[];
};

export type GbpSyncResult = GbpSyncSnapshot & {
  ok: boolean;
  syncedAt: string;
  reviewsAttempted: boolean;
  reviewsOk: boolean;
  errors: string[];
};

export type GbpLocationDiscovery = {
  accounts: GbpAccountSummary[];
  locations: GbpLocationSummary[];
  selectedLocationNames: string[];
  errors: string[];
};

function readSnapshotFromTokens(tokens: OrgGoogleGbpConnectorTokens | null): GbpSyncSnapshot {
  const health = tokens?.health
    ? (tokens.health as GbpConnectionHealth)
    : {
        status: (tokens?.accessToken || tokens?.refreshToken ? "connected" : "disconnected") as GbpConnectionHealth["status"],
        lastSyncAt: null,
        lastError: tokens?.lastError ?? null,
      };
  return {
    health,
    accounts: Array.isArray(tokens?.accounts) ? (tokens!.accounts as GbpAccountSummary[]) : [],
    locations: Array.isArray(tokens?.locations) ? (tokens!.locations as unknown as GbpLocationSummary[]) : [],
    reviews: Array.isArray(tokens?.reviews) ? (tokens!.reviews as unknown as GbpReviewCacheItem[]) : [],
  };
}

export async function getOrgGbpSyncSnapshot(organisationId: string): Promise<GbpSyncSnapshot | null> {
  const tokens = await getOrgGoogleGbpConnectorTokens(organisationId);
  if (!tokens?.accessToken && !tokens?.refreshToken) return null;
  return readSnapshotFromTokens(tokens);
}

async function listAccounts(accessToken: string): Promise<{ ok: true; accounts: GbpAccountSummary[] } | { ok: false; message: string }> {
  const res = await googleApiGet(GOOGLE_GBP_ACCOUNTS_URL, accessToken);
  if (!res.ok) return { ok: false, message: res.message };
  return { ok: true, accounts: parseGbpAccounts(res.data) };
}

async function listLocationsForAccount(accessToken: string, accountName: string): Promise<{ ok: true; locations: GbpLocationSummary[] } | { ok: false; message: string }> {
  const url = new URL(`${GOOGLE_GBP_BUSINESS_INFO_BASE}/${accountName}/locations`);
  url.searchParams.set("readMask", GOOGLE_GBP_LOCATION_READ_MASK);
  url.searchParams.set("pageSize", "100");
  const res = await googleApiGet(url.toString(), accessToken);
  if (!res.ok) return { ok: false, message: res.message };
  return {
    ok: true,
    locations: parseGbpLocations(res.data).map((loc) => ({ ...loc, name: toGbpReviewsParent(accountName, loc.name) })),
  };
}

async function discoverLocations(accessToken: string): Promise<{ accounts: GbpAccountSummary[]; locations: GbpLocationSummary[]; errors: string[] }> {
  const accountsRes = await listAccounts(accessToken);
  if (!accountsRes.ok) return { accounts: [], locations: [], errors: [accountsRes.message] };
  const locations: GbpLocationSummary[] = [];
  const errors: string[] = [];
  for (const account of accountsRes.accounts) {
    const locRes = await listLocationsForAccount(accessToken, account.name);
    if (!locRes.ok) errors.push(`${account.name}: ${locRes.message}`);
    else locations.push(...locRes.locations);
  }
  return { accounts: accountsRes.accounts, locations, errors };
}

/** Live discovery is intentionally separate from the org evidence cache. */
export async function discoverOrgGoogleGbpLocations(organisationId: string): Promise<GbpLocationDiscovery | null> {
  const ensured = await ensureValidOrgGoogleAccessToken(organisationId);
  if (!ensured.ok) return null;
  const discovered = await discoverLocations(ensured.accessToken);
  return {
    ...discovered,
    selectedLocationNames: ensured.tokens.selectedLocationNames ?? [],
  };
}

export async function setOrgGoogleGbpSelectedLocations(organisationId: string, locationNames: string[]): Promise<void> {
  const tokens = await getOrgGoogleGbpConnectorTokens(organisationId);
  if (!tokens?.accessToken && !tokens?.refreshToken) throw new Error("Google Business Profile is not connected for this organisation");
  const unique = [...new Set(locationNames.map((name) => name.trim()).filter(Boolean))];
  if (unique.some((name) => !/^accounts\/[^/]+\/locations\/[^/]+$/.test(name))) throw new Error("Invalid Google Business Profile location");
  await saveOrgGoogleGbpConnectorTokens(organisationId, {
    ...tokens,
    selectedLocationNames: unique,
    health: {
      status: "degraded",
      lastSyncAt: tokens.health?.lastSyncAt ?? null,
      lastError: null,
      accountCount: tokens.health?.accountCount,
      locationCount: 0,
      reviewsSynced: 0,
      reviewsAvailable: false,
      reviewsBlockedReason: unique.length ? "Sync required after changing Business Profile locations" : "Select Business Profile locations",
      message: unique.length ? "Business Profile location selection saved · sync required" : "Select the Business Profile locations for this organisation",
    },
    locations: [],
    reviews: [],
  });
}

async function listReviewsForLocation(accessToken: string, locationName: string): Promise<{ ok: true; reviews: GbpReviewCacheItem[] } | { ok: false; message: string }> {
  const url = new URL(`${GOOGLE_GBP_REVIEWS_V4_BASE}/${locationName}/reviews`);
  url.searchParams.set("pageSize", "50");
  const res = await googleApiGet(url.toString(), accessToken);
  if (!res.ok) return { ok: false, message: res.message };
  return { ok: true, reviews: parseGbpReviews(res.data, locationName) };
}

export async function syncOrgGoogleGbp(organisationId: string): Promise<GbpSyncResult> {
  const syncedAt = new Date().toISOString();
  const errors: string[] = [];
  const ensured = await ensureValidOrgGoogleAccessToken(organisationId);
  if (!ensured.ok) {
    const health: GbpConnectionHealth = { status: "disconnected", lastSyncAt: syncedAt, lastError: ensured.message, message: ensured.message, reviewsAvailable: false, reviewsBlockedReason: "Not connected" };
    return { ok: false, syncedAt, health, accounts: [], locations: [], reviews: [], reviewsAttempted: false, reviewsOk: false, errors: [ensured.message] };
  }

  const discovered = await discoverLocations(ensured.accessToken);
  errors.push(...discovered.errors);
  const accounts = discovered.accounts;
  if (accounts.length === 0 && errors.length) {
    const health: GbpConnectionHealth = { status: "error", lastSyncAt: syncedAt, lastError: errors[0], message: `Accounts list failed: ${errors[0]}`, accountCount: 0, locationCount: 0, reviewsSynced: 0, reviewsAvailable: false, reviewsBlockedReason: errors[0] };
    await saveOrgGoogleGbpConnectorTokens(organisationId, { ...ensured.tokens, lastError: errors[0], health, accounts: [], locations: [], reviews: [] });
    return { ok: false, syncedAt, health, accounts: [], locations: [], reviews: [], reviewsAttempted: false, reviewsOk: false, errors };
  }

  const selectedNames = ensured.tokens.selectedLocationNames ?? [];
  if (selectedNames.length === 0) {
    const health: GbpConnectionHealth = {
      status: "degraded", lastSyncAt: syncedAt, lastError: null, accountCount: accounts.length, locationCount: 0,
      reviewsSynced: 0, reviewsAvailable: false, reviewsBlockedReason: "Select Business Profile locations",
      message: discovered.locations.length > 1
        ? `${discovered.locations.length} Business Profile locations are available · select the location(s) for this organisation`
        : discovered.locations.length === 1
          ? "1 Business Profile location is available · select it for this organisation"
          : "No Business Profile locations found",
    };
    await saveOrgGoogleGbpConnectorTokens(organisationId, { ...ensured.tokens, lastError: undefined, health, accounts, locations: [], reviews: [] });
    return { ok: false, syncedAt, health, accounts, locations: [], reviews: [], reviewsAttempted: false, reviewsOk: false, errors };
  }

  const selectedSet = new Set(selectedNames);
  const locations = discovered.locations.filter((location) => selectedSet.has(location.name));
  const missing = selectedNames.filter((name) => !locations.some((location) => location.name === name));
  if (missing.length) errors.push(`Selected GBP location(s) no longer accessible: ${missing.join(", ")}`);

  let reviews: GbpReviewCacheItem[] = [];
  let reviewsAttempted = false;
  let reviewsOk = false;
  let reviewsBlockedReason: string | null = null;
  if (locations.length > 0) {
    reviewsAttempted = true;
    const reviewErrors: string[] = [];
    for (const loc of locations.slice(0, 25)) {
      const revRes = await listReviewsForLocation(ensured.accessToken, loc.name);
      if (!revRes.ok) reviewErrors.push(`${loc.name}: ${revRes.message}`);
      else { reviewsOk = true; reviews.push(...revRes.reviews); }
    }
    if (!reviewsOk && reviewErrors.length) { reviewsBlockedReason = summarizeGbpReviewBlock(reviewErrors); errors.push(...reviewErrors.slice(0, 3)); }
    else if (reviewsOk && reviewErrors.length) errors.push(...reviewErrors.slice(0, 2));
  } else {
    reviewsBlockedReason = "Selected Business Profile locations are unavailable";
  }
  reviews = reviews.slice(0, 200);

  const ok = locations.length > 0;
  // Health is organisation-resource scoped. Discovery warnings from other Google
  // accounts must not keep this organisation amber when every selected location
  // is accessible and its review sync succeeds.
  const selectedResourcesHealthy =
    missing.length === 0 &&
    locations.length === selectedNames.length &&
    locations.length > 0 &&
    reviewsOk;
  const healthErrors = selectedResourcesHealthy ? [] : errors;
  const health: GbpConnectionHealth = {
    status: ok ? (healthErrors.length ? "degraded" : "connected") : "error",
    lastSyncAt: syncedAt, lastError: healthErrors[0] ?? null, accountCount: accounts.length, locationCount: locations.length,
    reviewsSynced: reviews.length, reviewsAvailable: reviewsOk, reviewsBlockedReason: reviewsOk ? null : reviewsBlockedReason,
    message: buildSyncMessage({ accounts, locations, reviews, reviewsOk, reviewsBlockedReason, errors: healthErrors }),
  };
  await saveOrgGoogleGbpConnectorTokens(organisationId, { ...ensured.tokens, lastError: health.lastError ?? undefined, health, accounts, locations, reviews });
  return { ok, syncedAt, health, accounts, locations, reviews, reviewsAttempted, reviewsOk, errors };
}

function buildSyncMessage(input: { accounts: GbpAccountSummary[]; locations: GbpLocationSummary[]; reviews: GbpReviewCacheItem[]; reviewsOk: boolean; reviewsBlockedReason: string | null; errors: string[] }): string {
  const base = `${input.accounts.length} account(s) · ${input.locations.length} selected location(s)`;
  if (input.reviewsOk) return `${base} · ${input.reviews.length} review(s) cached`;
  if (input.reviewsBlockedReason) return `${base} · reviews not available: ${input.reviewsBlockedReason}`;
  if (input.errors.length) return `${base} · partial errors`;
  return base;
}
