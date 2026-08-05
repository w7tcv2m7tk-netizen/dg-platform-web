import type { AppManifest } from "../manifest";

export const reviewsApp: AppManifest = {
  id: "reviews",
  name: "Reviews",
  description: "Review inbox, response workflow, and reputation score",
  tier: "growth",
  version: "0.1.0",
  icon: "★",
  routes: [
    { path: "/apps/reviews", label: "Overview" },
    { path: "/apps/reviews/inbox", label: "Review inbox" },
    { path: "/apps/reviews/requests", label: "Review requests" },
    { path: "/apps/reviews/reputation", label: "Reputation score" },
  ],
  navigation: [{ href: "/apps/reviews", label: "Reviews", icon: "★" }],
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
      description: "On-brand response suggestions for Google and Facebook reviews",
    },
  ],
  reports: [{ id: "reviews.reputation", label: "Reputation Score™ report" }],
};
