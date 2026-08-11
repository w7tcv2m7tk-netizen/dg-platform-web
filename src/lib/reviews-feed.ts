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

export type ReviewsFeedStatus = {
  ok: boolean;
  message?: string;
  total: number;
  byPlatform: Record<string, number>;
  siteLabel?: string;
  accConnected?: boolean;
  gbpConnected?: boolean;
  gbpLocations?: number;
  gbpReviewsCached?: number;
  gbpReviewsAvailable?: boolean;
  gbpReviewsBlockedReason?: string | null;
  gbpLastSyncAt?: string | null;
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

    feedStatus = {
      // ok = review items available and/or Acc feed reachable (not merely GBP location metadata)
      ok: feed.length > 0 || accConnected,
      message:
        feed.length > 0 || accConnected
          ? undefined
          : gbpConnected
            ? gbp?.health.reviewsBlockedReason ||
              "GBP connected — location metadata synced; no reviews in feed yet"
            : result.message || "No connector feed yet",
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
    };
  }

  return { session, feed, feedStatus, email, name };
}
