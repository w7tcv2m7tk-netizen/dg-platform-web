export * from "./types";
export * from "./prospects";

/** Route prefix for Growth Engine modules inside Command Centre */
export const GROWTH_ENGINE_BASE_PATH = "/command/growth-engine";

export const GROWTH_ENGINE_ROUTES = {
  hub: GROWTH_ENGINE_BASE_PATH,
  discovery: `${GROWTH_ENGINE_BASE_PATH}/discovery`,
  audits: `${GROWTH_ENGINE_BASE_PATH}/audits`,
  reports: `${GROWTH_ENGINE_BASE_PATH}/reports`,
  pipeline: `${GROWTH_ENGINE_BASE_PATH}/pipeline`,
  followUps: `${GROWTH_ENGINE_BASE_PATH}/follow-ups`,
  proposals: `${GROWTH_ENGINE_BASE_PATH}/proposals`,
  conversions: `${GROWTH_ENGINE_BASE_PATH}/conversions`,
} as const;
