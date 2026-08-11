import type { AppManifest } from "../manifest";

/**
 * Reputation — Growth App product surface (monitor, request, score when real).
 * Core still owns Universal Review Object, Reputation Service, connectors, timeline,
 * and score computation — this App is the customer-facing packaging, not a
 * “Google Reviews App.”
 * @see docs/foundations/REVIEWS-AND-REFERRALS.md
 */
export const reviewsApp: AppManifest = {
  id: "reviews",
  name: "Reputation",
  description:
    "Monitor connected reviews, queue requests, and Reputation Score™ when real data exists — Universal Review + connectors",
  tier: "growth",
  version: "0.4.0",
  icon: "★",
  routes: [
    { path: "/apps/reviews", label: "Overview" },
    { path: "/apps/reviews/inbox", label: "Review inbox" },
    { path: "/apps/reviews/sources", label: "Sources" },
    { path: "/apps/reviews/requests", label: "Review requests" },
    { path: "/apps/reviews/reputation", label: "Reputation Score™" },
  ],
  navigation: [{ href: "/apps/reviews", label: "Reputation", icon: "★" }],
  permissions: [
    { id: "reviews.view", label: "View reviews" },
    { id: "reviews.respond", label: "Respond to reviews" },
  ],
  features: [
    "reviews.inbox.read",
    "reviews.respond",
    "reviews.requests.send",
    "reviews.score.read",
  ],
  entities: ["Contact", "Activity", "Company"],
  automationTriggers: [
    { id: "review.received", label: "New review received" },
    { id: "review.rating.low", label: "Low rating received" },
  ],
  automationActions: [
    { id: "reviews.request_review", label: "Send review request" },
    { id: "reviews.draft_response", label: "Draft AI response" },
  ],
  aiTools: [
    {
      id: "reviews.reply_draft",
      label: "Draft review reply",
      description: "On-brand response suggestions for connected review sources",
    },
  ],
  reports: [{ id: "reviews.reputation", label: "Reputation Score™ report" }],
};
