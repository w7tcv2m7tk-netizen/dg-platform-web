import type { AppManifest } from "../manifest";

/**
 * Reputation — Core platform capability (Universal Review Object + Reputation Service).
 * Sources arrive via Connector Framework; Growth “Reputation Pro” (campaigns, competitor
 * analysis, advanced AI respond UX) is roadmap — not this App.
 * @see docs/foundations/REVIEWS-AND-REFERRALS.md
 */
export const reviewsApp: AppManifest = {
  id: "reviews",
  name: "Reputation",
  description:
    "Core reputation capability — unified review feed, connectors, timeline requests, Reputation Score™ when real data exists",
  tier: "core",
  version: "0.3.0",
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
