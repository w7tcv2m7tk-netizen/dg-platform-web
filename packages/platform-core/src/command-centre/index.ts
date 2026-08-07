export * from "./types";
export * from "./growth-engine";
export * from "./access";
export * from "./overview";

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
  reports: `${COMMAND_CENTRE_BASE_PATH}/reports`,
  support: `${COMMAND_CENTRE_BASE_PATH}/support`,
  growthEngine: `${COMMAND_CENTRE_BASE_PATH}/growth-engine`,
} as const;
