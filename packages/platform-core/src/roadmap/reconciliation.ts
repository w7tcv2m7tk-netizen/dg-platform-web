import type { RoadmapItem, RoadmapStatus } from "./index";

/**
 * Evidence-backed roadmap reconciliation.
 *
 * The canonical roadmap describes the product vision, but some historical statuses
 * lag behind shipped Gen 2 work. Keep corrections here small and auditable: only
 * promote an item when current production code/certification provides direct evidence.
 * This deliberately does not infer "done" merely because a route exists.
 */
const STATUS_OVERRIDES: Record<string, RoadmapStatus> = {
  // Native Gen 2 is now the normal runtime; the former WordPress detachment programme is closed.
  "detach.roe_sot": "done",
  "detach.portal_billing": "done",
  "detach.support_health": "done",
  "detach.cvh_bookings": "done",
  "detach.public_headless": "done",

  // Google Business Profile, Analytics, Search Console and Ads connector surfaces are shipped.
  "platform.connector_google": "done",

  // Finance has a certified native customer floor (pages, writes, permissions and money presentation).
  "finance.overview": "done",
  "finance.pipeline": "done",
  "finance.clients": "done",
  "finance.applications": "done",

  // Current Command Centre intelligence is shipped and customer-cohort isolated.
  "command.clients": "done",
  "command.clients.detail": "done",
  "command.revenue": "done",
};

const DESCRIPTION_OVERRIDES: Record<string, string> = {
  "platform.connector_google":
    "Google Business Profile, Analytics, Search Console and Ads connection/selection surfaces shipped; provider/API limitations remain explicit.",
  "finance.overview":
    "Native Finance dashboard on organisation-scoped Gen 2 data; certified customer floor shipped.",
  "finance.pipeline":
    "Native finance application pipeline with organisation-scoped authority and customer controls.",
  "finance.clients":
    "Finance client experience on native shared platform context; certified customer floor shipped.",
  "finance.applications":
    "FinanceApplication native create/list flow with organisation-scoped writes and certified money presentation.",
  "command.clients":
    "Customer-only organisation health and intelligence views with internal/demo cohort isolation.",
  "command.clients.detail":
    "Per-customer intelligence, setup access and Success Score detail with tenant-safe operator controls.",
  "command.revenue":
    "Stripe-attributed recurring revenue, subscriptions and invoice revenue reporting; no unrelated customer payments counted as DigitalGate revenue.",
  "detach.roe_sot":
    "Native Gen 2 is authoritative for normal Real Estate customer journeys; WordPress is not normal runtime authority.",
  "detach.portal_billing":
    "Native Gen 2 billing, entitlements and onboarding checkout own the customer subscription path.",
  "detach.support_health":
    "Native support and health surfaces operate without WordPress as normal runtime authority.",
  "detach.cvh_bookings":
    "Native accommodation operations and organisation-scoped booking data are the normal platform path.",
  "detach.public_headless":
    "Website Studio/publication is native Gen 2; WordPress is optional migration/connector context only.",
};

export function reconcileRoadmapItems(items: RoadmapItem[]): RoadmapItem[] {
  return items.map((item) => ({
    ...item,
    status: STATUS_OVERRIDES[item.id] ?? item.status,
    description: DESCRIPTION_OVERRIDES[item.id] ?? item.description,
  }));
}
