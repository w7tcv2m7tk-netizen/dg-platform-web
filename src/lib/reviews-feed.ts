import {
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
  let feedStatus: {
    ok: boolean;
    message?: string;
    total: number;
    byPlatform: Record<string, number>;
    siteLabel?: string;
  } = { ok: false, total: 0, byPlatform: {}, message: "Not signed in" };

  if (session) {
    const site = getWpAccommodationSite(siteId);
    const connector = await accommodationConnectorForSession(session.organisationId);
    const result = await fetchWpAccommodationReviews(site.id, 40, connector);
    if (result.ok) {
      feed = mapWpAccReviewsToFeed(result.reviews);
      feedStatus = {
        ok: true,
        total: result.total,
        byPlatform: result.byPlatform,
        siteLabel: connector?.label ?? site.label,
      };
    } else {
      feedStatus = {
        ok: false,
        message: result.message,
        total: 0,
        byPlatform: {},
        siteLabel: connector?.label ?? site.label,
      };
    }
  }

  return { session, feed, feedStatus, email, name };
}
