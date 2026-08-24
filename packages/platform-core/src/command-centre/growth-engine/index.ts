export * from "./types";
export * from "./prospects";
export * from "./audits";
export * from "./presence-audit";
export * from "./reports";
export * from "./proposals";
export * from "./follow-ups";
export * from "./conversions";
export * from "./client-transition";
export * from "./opportunity-engine";
// sales-assistant.ts re-exports getSalesCallRecommendations for deep imports

/** Route prefix for Growth Engine modules inside Command Centre */
export const GROWTH_ENGINE_BASE_PATH = "/command/growth-engine";

/** Discovery capability lives on the Growth App; CC hub stays the action layer. */
export const GROWTH_ENGINE_ROUTES = {
  hub: GROWTH_ENGINE_BASE_PATH,
  discovery: "/apps/prospecting/discovery",
  audits: `${GROWTH_ENGINE_BASE_PATH}/audits`,
  reports: `${GROWTH_ENGINE_BASE_PATH}/reports`,
  pipeline: `${GROWTH_ENGINE_BASE_PATH}/pipeline`,
  followUps: `${GROWTH_ENGINE_BASE_PATH}/follow-ups`,
  proposals: `${GROWTH_ENGINE_BASE_PATH}/proposals`,
  conversions: `${GROWTH_ENGINE_BASE_PATH}/conversions`,
} as const;

export const GROWTH_ENGINE_STAGE_LABELS: Record<string, string> = {
  prospect: "Prospect",
  audit_created: "Audit created",
  report_sent: "Report sent",
  email_opened: "Email opened",
  report_viewed: "Report viewed",
  follow_up_due: "Follow-up due",
  meeting_booked: "Meeting booked",
  proposal_sent: "Proposal sent",
  won: "Won",
  lost: "Lost",
  onboarding: "Onboarding",
};
