import {
  getOrgGbpSyncSnapshot,
  mapGbpReviewsToFeed,
  mapWpAccReviewsToFeed,
  type ReviewFeedItem,
} from "@dg/platform-core";
import { currentUser } from "@clerk/nextjs/server";

import { accommodationConnectorForSession } from "@/lib/accommodation-connector";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import {
  fetchPortalMe,
  fetchWpAccommodationReviews,
  getWpAccommodationSite,
} from "@/lib/dg-api";

export type ReviewsFeedEmptyKind = "no_sources" | "no_reviews" | "sync_blocked" | "sync_failed";

export type ReviewsFeedStatus = {
  ok: boolean;
  message?: string;
  total: number;
  byPlatform: Record<string, number>;
  siteLabel?: string;
  /** Acc WP and/or GBP connector present for this org. */
  hasSource?: boolean;
  /** Distinct empty-state for inbox/overview when feed has no items. */
  emptyKind?: ReviewsFeedEmptyKind | null;
  accConnected?: boolean;
  gbpConnected?: boolean;
  gbpLocations?: number;
  gbpReviewsCached?: number;
  gbpReviewsAvailable?: boolean;
  gbpReviewsBlockedReason?: string | null;
  gbpLastSyncAt?: string | null;
  gbpLastError?: string | null;
};

export async function loadReviewsSessionAndFeed(siteId?: string | null) {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;

  const portal = email ? await fetchPortalMe(email, user?.id) : null;
  const session = user?.id
    ? await resolveActivePlatformSession({
        clerkUserId: user.id,
        email,
        name,
        orgName: portal?.org_name,
      })
    : null;

  let feed: ReviewFeedItem[] = [];
  let feedStatus: ReviewsFeedStatus = {
    ok: false,
    total: 0,
    byPlatform: {},
    message: "Not signed in",
  };

  if (session) {
    const site = getWpAccommodationSite(siteId);
    const connector = await accommodationConnectorForSession(session.organisationId);
    const result = await fetchWpAccommodationReviews(site.id, 40, connector);
    const byPlatform: Record<string, number> = {};
    let accConnected = false;

    if (result.ok) {
      accConnected = true;
      const accItems = mapWpAccReviewsToFeed(result.reviews);
      feed = accItems;
      for (const item of accItems) {
        byPlatform[item.source] = (byPlatform[item.source] ?? 0) + 1;
      }
    }

    const gbp = await getOrgGbpSyncSnapshot(session.organisationId);
    let gbpConnected = false;
    if (gbp) {
      gbpConnected = true;
      const gbpItems = mapGbpReviewsToFeed(gbp.reviews);
      if (gbpItems.length) {
        feed = [...gbpItems, ...feed];
        for (const item of gbpItems) {
          byPlatform[item.source] = (byPlatform[item.source] ?? 0) + 1;
        }
      }
    }

    const hasSource = accConnected || gbpConnected;
    const gbpBlocked = Boolean(gbp?.health.reviewsBlockedReason);
    const gbpFailed =
      gbpConnected &&
      (gbp?.health.status === "error" || Boolean(gbp?.health.lastError)) &&
      feed.length === 0 &&
      !accConnected;
    let emptyKind: ReviewsFeedEmptyKind | null = null;
    let message: string | undefined;
    if (feed.length === 0) {
      if (!hasSource) {
        emptyKind = "no_sources";
        message = (!result.ok ? result.message : undefined) || "No review source connected yet";
      } else if (gbpFailed && gbp?.health.lastError) {
        emptyKind = "sync_failed";
        message = gbp.health.lastError;
      } else if (gbpBlocked && !accConnected) {
        emptyKind = "sync_blocked";
        message =
          gbp?.health.reviewsBlockedReason ||
          "GBP connected — reviews not available from the API yet";
      } else {
        emptyKind = "no_reviews";
        message = gbpConnected
          ? "Sources connected — no published reviews in the Universal Review feed yet"
          : "Acc feed reachable — no published reviews yet";
      }
    }

    feedStatus = {
      // ok = review items available and/or Acc feed reachable (not merely GBP location metadata)
      ok: feed.length > 0 || accConnected,
      message,
      emptyKind,
      hasSource,
      total: feed.length,
      byPlatform,
      siteLabel: connector?.label ?? site.label,
      accConnected,
      gbpConnected,
      gbpLocations: gbp?.locations.length ?? 0,
      gbpReviewsCached: gbp?.reviews.length ?? 0,
      gbpReviewsAvailable: gbp?.health.reviewsAvailable ?? false,
      gbpReviewsBlockedReason: gbp?.health.reviewsBlockedReason ?? null,
      gbpLastSyncAt: gbp?.health.lastSyncAt ?? null,
      gbpLastError: gbp?.health.lastError ?? null,
    };
  }

  return { session, feed, feedStatus, email, name };
}
