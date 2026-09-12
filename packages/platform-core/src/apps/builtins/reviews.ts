import type { AppManifest } from "../manifest";

/**
 * Reputation — Growth App product surface for connected review monitoring,
 * reputation scoring, reply drafting and queued review follow-up.
 * Core still owns Universal Review Object, Reputation Service, connectors, timeline,
 * and score computation — this App is the customer-facing packaging, not a
 * “Google Reviews App.”
 * @see docs/foundations/REVIEWS-AND-REFERRALS.md
 */
export const reviewsApp: AppManifest = {
  id: "reviews",
  name: "Reputation",
  description:
    "Monitor connected reviews, track Reputation Score™, draft replies, and queue review follow-ups from completed work",
  tier: "growth",
  version: "0.4.0",
  icon: "★",
  routes: [
    { path: "/apps/reviews", label: "Overview" },
    { path: "/apps/reviews/inbox", label: "Review inbox" },
    { path: "/apps/reviews/sources", label: "Sources" },
    { path: "/apps/reviews/requests", label: "Review follow-ups" },
    { path: "/apps/reviews/reputation", label: "Reputation Score™" },
  ],
  navigation: [{ href: "/apps/reviews", label: "Reputation", icon: "★" }],
  permissions: [
    { id: "reviews.view", label: "View reviews" },
    { id: "reviews.respond", label: "Prepare review replies" },
  ],
  features: [
    "reviews.inbox.read",
    "reviews.reply_draft",
    "reviews.requests.queue",
    "reviews.score.read",
  ],
  entities: ["Contact", "Activity", "Company"],
  automationTriggers: [],
  automationActions: [],
  aiTools: [
    {
      id: "reviews.reply_draft",
      label: "Draft review reply",
      description: "On-brand response suggestions for connected review sources",
    },
  ],
  reports: [{ id: "reviews.reputation", label: "Reputation Score™ report" }],
};
