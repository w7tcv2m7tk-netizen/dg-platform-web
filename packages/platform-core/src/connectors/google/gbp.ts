/**
 * Google Business Profile — accounts, locations, profile fields, optional reviews.
 *
 * Auth scope: `business.manage` (see auth.ts). Reviews use My Business API v4;
 * if Cloud Console APIs or location access block reviews, we still sync location metadata.
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
  toGbpReviewsParent,
  type GbpAccountSummary,
  type GbpLocationSummary,
  type GbpReviewCacheItem,
} from "./gbp-parse";

export * from "./gbp-parse";

export const GOOGLE_GBP_BUSINESS_INFO_BASE =
  "https://mybusinessbusinessinformation.googleapis.com/v1";
export const GOOGLE_GBP_REVIEWS_V4_BASE = "https://mybusiness.googleapis.com/v4";

/** Fields required by Business Information locations.list. */
export const GOOGLE_GBP_LOCATION_READ_MASK = [
  "name",
  "title",
  "storeCode",
  "websiteUri",
  "phoneNumbers",
  "storefrontAddress",
  "categories",
  "metadata",
  "latlng",
  "openInfo",
  "profile",
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

function readSnapshotFromTokens(
  tokens: OrgGoogleGbpConnectorTokens | null,
): GbpSyncSnapshot {
  const health = tokens?.health
    ? (tokens.health as GbpConnectionHealth)
    : {
        status: (tokens?.accessToken || tokens?.refreshToken
          ? "connected"
          : "disconnected") as GbpConnectionHealth["status"],
        lastSyncAt: null,
        lastError: tokens?.lastError ?? null,
      };

  return {
    health,
    accounts: Array.isArray(tokens?.accounts)
      ? (tokens!.accounts as GbpAccountSummary[])
      : [],
    locations: Array.isArray(tokens?.locations)
      ? (tokens!.locations as unknown as GbpLocationSummary[])
      : [],
    reviews: Array.isArray(tokens?.reviews)
      ? (tokens!.reviews as unknown as GbpReviewCacheItem[])
      : [],
  };
}

/** Cached GBP snapshot for the org (no live API call). */
export async function getOrgGbpSyncSnapshot(
  organisationId: string,
): Promise<GbpSyncSnapshot | null> {
  const tokens = await getOrgGoogleGbpConnectorTokens(organisationId);
  if (!tokens?.accessToken && !tokens?.refreshToken) return null;
  return readSnapshotFromTokens(tokens);
}

async function listAccounts(accessToken: string): Promise<
  | { ok: true; accounts: GbpAccountSummary[] }
  | { ok: false; message: string }
> {
  const res = await googleApiGet(GOOGLE_GBP_ACCOUNTS_URL, accessToken);
  if (!res.ok) return { ok: false, message: res.message };
  return { ok: true, accounts: parseGbpAccounts(res.data) };
}

async function listLocationsForAccount(
  accessToken: string,
  accountName: string,
): Promise<
  | { ok: true; locations: GbpLocationSummary[] }
  | { ok: false; message: string }
> {
  const url = new URL(
    `${GOOGLE_GBP_BUSINESS_INFO_BASE}/${accountName}/locations`,
  );
  url.searchParams.set("readMask", GOOGLE_GBP_LOCATION_READ_MASK);
  url.searchParams.set("pageSize", "100");
  const res = await googleApiGet(url.toString(), accessToken);
  if (!res.ok) return { ok: false, message: res.message };
  const locations = parseGbpLocations(res.data).map((loc) => ({
    ...loc,
    name: toGbpReviewsParent(accountName, loc.name),
  }));
  return { ok: true, locations };
}

async function listReviewsForLocation(
  accessToken: string,
  locationName: string,
): Promise<
  | { ok: true; reviews: GbpReviewCacheItem[] }
  | { ok: false; message: string }
> {
  const url = new URL(`${GOOGLE_GBP_REVIEWS_V4_BASE}/${locationName}/reviews`);
  url.searchParams.set("pageSize", "50");
  const res = await googleApiGet(url.toString(), accessToken);
  if (!res.ok) return { ok: false, message: res.message };
  return { ok: true, reviews: parseGbpReviews(res.data, locationName) };
}

/**
 * Sync GBP accounts + locations (+ reviews when API allows).
 * Persists snapshot on the google-gbp connector settings blob.
 */
export async function syncOrgGoogleGbp(
  organisationId: string,
): Promise<GbpSyncResult> {
  const syncedAt = new Date().toISOString();
  const errors: string[] = [];

  const ensured = await ensureValidOrgGoogleAccessToken(organisationId);
  if (!ensured.ok) {
    const health: GbpConnectionHealth = {
      status: "disconnected",
      lastSyncAt: syncedAt,
      lastError: ensured.message,
      message: ensured.message,
      reviewsAvailable: false,
      reviewsBlockedReason: "Not connected",
    };
    return {
      ok: false,
      syncedAt,
      health,
      accounts: [],
      locations: [],
      reviews: [],
      reviewsAttempted: false,
      reviewsOk: false,
      errors: [ensured.message],
    };
  }

  const accountsRes = await listAccounts(ensured.accessToken);
  if (!accountsRes.ok) {
    errors.push(accountsRes.message);
    const health: GbpConnectionHealth = {
      status: "error",
      lastSyncAt: syncedAt,
      lastError: accountsRes.message,
      message: `Accounts list failed: ${accountsRes.message}`,
      accountCount: 0,
      locationCount: 0,
      reviewsSynced: 0,
      reviewsAvailable: false,
      reviewsBlockedReason: accountsRes.message,
    };
    await saveOrgGoogleGbpConnectorTokens(organisationId, {
      ...ensured.tokens,
      lastError: accountsRes.message,
      health,
      accounts: [],
      locations: [],
      reviews: [],
    });
    return {
      ok: false,
      syncedAt,
      health,
      accounts: [],
      locations: [],
      reviews: [],
      reviewsAttempted: false,
      reviewsOk: false,
      errors,
    };
  }

  const accounts = accountsRes.accounts;
  const locations: GbpLocationSummary[] = [];
  for (const account of accounts) {
    const locRes = await listLocationsForAccount(ensured.accessToken, account.name);
    if (!locRes.ok) {
      errors.push(`${account.name}: ${locRes.message}`);
      continue;
    }
    locations.push(...locRes.locations);
  }

  let reviews: GbpReviewCacheItem[] = [];
  let reviewsAttempted = false;
  let reviewsOk = false;
  let reviewsBlockedReason: string | null = null;

  if (locations.length > 0) {
    reviewsAttempted = true;
    const reviewErrors: string[] = [];
    for (const loc of locations.slice(0, 25)) {
      const revRes = await listReviewsForLocation(ensured.accessToken, loc.name);
      if (!revRes.ok) {
        reviewErrors.push(`${loc.name}: ${revRes.message}`);
        continue;
      }
      reviewsOk = true;
      reviews.push(...revRes.reviews);
    }
    if (!reviewsOk && reviewErrors.length) {
      reviewsBlockedReason = summarizeReviewBlock(reviewErrors);
      errors.push(...reviewErrors.slice(0, 3));
    } else if (reviewsOk && reviewErrors.length) {
      errors.push(...reviewErrors.slice(0, 2));
    }
  } else {
    reviewsBlockedReason =
      accounts.length === 0
        ? "No GBP accounts on this Google login"
        : "No locations found under connected GBP accounts";
  }

  reviews = reviews.slice(0, 200);

  const ok = locations.length > 0 || (accounts.length > 0 && errors.length === 0);
  const health: GbpConnectionHealth = {
    status: ok ? (errors.length ? "degraded" : "connected") : "error",
    lastSyncAt: syncedAt,
    lastError: errors[0] ?? null,
    accountCount: accounts.length,
    locationCount: locations.length,
    reviewsSynced: reviews.length,
    reviewsAvailable: reviewsOk,
    reviewsBlockedReason: reviewsOk ? null : reviewsBlockedReason,
    message: buildSyncMessage({
      accounts,
      locations,
      reviews,
      reviewsOk,
      reviewsBlockedReason,
      errors,
    }),
  };

  await saveOrgGoogleGbpConnectorTokens(organisationId, {
    ...ensured.tokens,
    lastError: health.lastError ?? undefined,
    health,
    accounts,
    locations,
    reviews,
  });

  return {
    ok,
    syncedAt,
    health,
    accounts,
    locations,
    reviews,
    reviewsAttempted,
    reviewsOk,
    errors,
  };
}

function summarizeReviewBlock(errors: string[]): string {
  const joined = errors.join(" · ");
  if (/PERMISSION_DENIED|ACCESS_TOKEN_SCOPE_INSUFFICIENT|insufficient/i.test(joined)) {
    return (
      "Reviews API denied — confirm My Business API is enabled on the Google Cloud project " +
      "and the login has manager access. Scope business.manage is requested; location metadata still syncs."
    );
  }
  if (/404|not found|NOT_FOUND/i.test(joined)) {
    return (
      "Reviews endpoint unavailable for these locations (API not enabled or location id mismatch). " +
      "Location metadata still synced."
    );
  }
  return `Reviews sync failed (${errors[0]}). Location metadata still synced.`;
}

function buildSyncMessage(input: {
  accounts: GbpAccountSummary[];
  locations: GbpLocationSummary[];
  reviews: GbpReviewCacheItem[];
  reviewsOk: boolean;
  reviewsBlockedReason: string | null;
  errors: string[];
}): string {
  const base = `${input.accounts.length} account(s) · ${input.locations.length} location(s)`;
  if (input.reviewsOk) {
    return `${base} · ${input.reviews.length} review(s) cached`;
  }
  if (input.reviewsBlockedReason) {
    return `${base} · reviews not available: ${input.reviewsBlockedReason}`;
  }
  if (input.errors.length) {
    return `${base} · partial errors`;
  }
  return base;
}
