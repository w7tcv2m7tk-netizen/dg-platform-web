export * from "./types";
export * from "./growth-engine";
export * from "./access";
export * from "./overview";
export * from "./success-score";
export * from "./client-intelligence";
export * from "./advisor";
export * from "./growth-reports";
export * from "./opportunities";
export * from "./benchmarks";
export * from "./flags-admin";
export * from "./revenue";
export * from "./platform-docs";
export * from "./sales-week";

/** Clerk role / org claim used to gate Command Centre routes */
export const COMMAND_CENTRE_STAFF_ROLE = "dg:staff";

/** Route prefix — never linked from customer shell navigation */
export const COMMAND_CENTRE_BASE_PATH = "/command";

export const COMMAND_CENTRE_ROUTES = {
  overview: COMMAND_CENTRE_BASE_PATH,
  clients: `${COMMAND_CENTRE_BASE_PATH}/clients`,
  platformHealth: `${COMMAND_CENTRE_BASE_PATH}/platform-health`,
  revenue: `${COMMAND_CENTRE_BASE_PATH}/revenue`,
  opportunities: `${COMMAND_CENTRE_BASE_PATH}/opportunities`,
  expansion: `${COMMAND_CENTRE_BASE_PATH}/opportunities/expansion`,
  reports: `${COMMAND_CENTRE_BASE_PATH}/reports`,
  advisor: `${COMMAND_CENTRE_BASE_PATH}/advisor`,
  benchmarks: `${COMMAND_CENTRE_BASE_PATH}/benchmarks`,
  flags: `${COMMAND_CENTRE_BASE_PATH}/flags`,
  /** Staff-only curated architecture / strategy docs library */
  docs: `${COMMAND_CENTRE_BASE_PATH}/docs`,
  /** Staff Platform Intelligence — Phase 1 RAG over allowlisted docs */
  intelligence: `${COMMAND_CENTRE_BASE_PATH}/intelligence`,
  /** @deprecated — /command/support redirects to /support (no Command Support Centre) */
  support: "/support",
  /** @deprecated — /command/audit redirects to tenant audit settings */
  audit: "/dashboard/settings/audit",
  growthEngine: `${COMMAND_CENTRE_BASE_PATH}/growth-engine`,
  /** Internal Alpha — tickable dogfood / P0–P1 close before Founding 10 */
  gate1: `${COMMAND_CENTRE_BASE_PATH}/gate-1`,
  /** Commercial Engine 90-day sales week (Brisbane) */
  salesWeek: `${COMMAND_CENTRE_BASE_PATH}/sales-week`,
  /** Founding 10 customer pipeline (accept → agreement → onboard → go-live) */
  founding: `${COMMAND_CENTRE_BASE_PATH}/founding`,
  partners: `${COMMAND_CENTRE_BASE_PATH}/partners`,
  partnerReferrals: `${COMMAND_CENTRE_BASE_PATH}/referrals`,
  partnerCommissions: `${COMMAND_CENTRE_BASE_PATH}/commissions`,
} as const;
