import type { RoadmapItem, RoadmapStatus } from "./index";

/**
 * Evidence-backed roadmap reconciliation.
 *
 * The canonical roadmap describes the product vision, but some historical statuses
 * lag behind shipped Gen 2 work. Keep corrections here small and auditable: only
 * promote an item when current production code/certification provides direct evidence.
 * This deliberately does not infer "done" merely because a route exists.
 */
export const CERTIFIED_ROADMAP_STATUS: Record<string, RoadmapStatus> = {
  // Preserve historical native-runtime milestones; billing release verification remains open.
  "detach.roe_sot": "done",
  "detach.portal_billing": "in_progress",
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
  "platform.roadmap": "done",

  // 12 October 2026: code/records exist, but operational completion is not verified.
  // The six-state verification register and evidence live in docs/ROADMAP.md.
  "growth.reports": "in_progress",
  "comms.voice": "in_progress",
  "comms.agents": "in_progress",
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
    "PR #1008 compatibility is merged; #1016 guard, #1006 coordinator and #1015 entitlement cutover remain staged. Hosted test-mode signup/payment and controlled production activation remain gated. See docs/ROADMAP.md.",
  "growth.reports":
    "Report snapshots and tenant-safe access merged in #997. The missing snapshot/revocation migration was restored on 20 October and the owner confirmed Activity recovery. Full report delivery and authenticated Phase 1 intake remain unverified (#1018).",
  "comms.voice":
    "ElevenLabs adapter and three published agent records exist; current telephony, tool/webhook continuity and deeper Brain context are not operationally verified. See docs/ROADMAP.md.",
  "comms.agents":
    "Agent Builder and receptionist configuration exist. Published provider IDs are implementation evidence, not proof of end-to-end qualification or production readiness.",
  "detach.support_health":
    "Native support and health surfaces operate without WordPress as normal runtime authority.",
  "detach.cvh_bookings":
    "Native accommodation operations and organisation-scoped booking data are the normal platform path.",
  "detach.public_headless":
    "Website Studio/publication is native Gen 2; WordPress is optional migration/connector context only.",
};

const RETIRED_ROADMAP_IDS = new Set([
  "founding.pipeline",
  "founding.invitation",
  "founding.onboarding",
  "founding.implementation",
]);

export function reconcileRoadmapItems(items: RoadmapItem[]): RoadmapItem[] {
  return items.filter((item) => !RETIRED_ROADMAP_IDS.has(item.id)).map((item) => ({
    ...item,
    status: CERTIFIED_ROADMAP_STATUS[item.id] ?? item.status,
    description: DESCRIPTION_OVERRIDES[item.id] ?? item.description,
  }));
}


/** Historical API name: IDs with explicit reconciliation overrides, including open verification work. */
export function certifiedRoadmapIds(): string[] {
  return Object.keys(CERTIFIED_ROADMAP_STATUS);
}
