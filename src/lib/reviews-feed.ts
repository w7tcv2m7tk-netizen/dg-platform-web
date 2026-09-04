import {
  getOrgGbpSyncSnapshot,
  mapGbpReviewsToFeed,
  type ReviewFeedItem,
} from "@dg/platform-core";

import { getPlatformPageContext } from "@/lib/platform-page-context";

export type ReviewsFeedEmptyKind = "no_sources" | "no_reviews" | "sync_blocked" | "sync_failed";

export type ReviewsFeedStatus = {
  ok: boolean;
  message?: string;
  total: number;
  byPlatform: Record<string, number>;
  siteLabel?: string;
  hasSource?: boolean;
  emptyKind?: ReviewsFeedEmptyKind | null;
  /** Legacy compatibility field; native runtime no longer reads Accommodation reviews from WordPress. */
  accConnected?: boolean;
  gbpConnected?: boolean;
  gbpLocations?: number;
  gbpReviewsCached?: number;
  gbpReviewsAvailable?: boolean;
  gbpReviewsBlockedReason?: string | null;
  gbpLastSyncAt?: string | null;
  gbpLastError?: string | null;
};

export async function loadReviewsSessionAndFeed(_siteId?: string | null) {
  try {
    return await loadReviewsSessionAndFeedUnsafe();
  } catch (err) {
    console.error("[reviews-feed] loadReviewsSessionAndFeed failed", err);
    return {
      session: null,
      feed: [] as ReviewFeedItem[],
      feedStatus: {
        ok: false,
        total: 0,
        byPlatform: {},
        message: "Could not load review sources right now",
        emptyKind: "sync_failed" as ReviewsFeedEmptyKind,
        hasSource: false,
      } satisfies ReviewsFeedStatus,
      email: "",
      name: "",
    };
  }
}

async function loadReviewsSessionAndFeedUnsafe() {
  const { session, email, name } = await getPlatformPageContext();

  let feed: ReviewFeedItem[] = [];
  let feedStatus: ReviewsFeedStatus = {
    ok: false,
    total: 0,
    byPlatform: {},
    message: "Not signed in",
  };

  if (session) {
    const byPlatform: Record<string, number> = {};
    const gbp = await getOrgGbpSyncSnapshot(session.organisationId);
    const gbpConnected = Boolean(gbp);

    if (gbp) {
      feed = mapGbpReviewsToFeed(gbp.reviews);
      for (const item of feed) {
        byPlatform[item.source] = (byPlatform[item.source] ?? 0) + 1;
      }
    }

    const gbpBlocked = Boolean(gbp?.health.reviewsBlockedReason);
    const gbpFailed =
      gbpConnected &&
      (gbp?.health.status === "error" || Boolean(gbp?.health.lastError)) &&
      feed.length === 0;
    let emptyKind: ReviewsFeedEmptyKind | null = null;
    let message: string | undefined;

    if (feed.length === 0) {
      if (!gbpConnected) {
        emptyKind = "no_sources";
        message = "No native review source connected yet";
      } else if (gbpFailed && gbp?.health.lastError) {
        emptyKind = "sync_failed";
        message = gbp.health.lastError;
      } else if (gbpBlocked) {
        emptyKind = "sync_blocked";
        message =
          gbp?.health.reviewsBlockedReason ||
          "GBP connected — reviews not available from the API yet";
      } else {
        emptyKind = "no_reviews";
        message = "Source connected — no published reviews in the Universal Review feed yet";
      }
    }

    feedStatus = {
      ok: feed.length > 0,
      message,
      emptyKind,
      hasSource: gbpConnected,
      total: feed.length,
      byPlatform,
      siteLabel: session.organisationName,
      accConnected: false,
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
