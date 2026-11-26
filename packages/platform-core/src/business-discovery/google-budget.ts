import { randomUUID } from "node:crypto";

export const GOOGLE_PLACES_MONTHLY_LIMIT_ENV = "GOOGLE_PLACES_MONTHLY_TEXT_SEARCH_LIMIT";
export const GOOGLE_PLACES_SCOPE_ENV = "GOOGLE_PLACES_BUDGET_SCOPE";
export const GOOGLE_PLACES_PROVIDER = "google_places_text_search";
const DEFAULT_MONTHLY_LIMIT = 250;

export class GooglePlacesBudgetExhausted extends Error {
  constructor() { super("google_places_monthly_allowance_exhausted"); this.name = "GooglePlacesBudgetExhausted"; }
}

export function googlePlacesMonthKey(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 7);
}

export function googlePlacesMonthlyLimit(): number {
  const parsed = Number(process.env[GOOGLE_PLACES_MONTHLY_LIMIT_ENV]);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= 500 ? parsed : DEFAULT_MONTHLY_LIMIT;
}

export function googlePlacesBudgetScope(): string {
  return process.env[GOOGLE_PLACES_SCOPE_ENV]?.trim() || process.env.VERCEL_ENV?.trim() || "local";
}

/** Atomically reserve one Text Search request; fails closed at the monthly cap. */
export async function reserveGooglePlacesTextSearch(now = Date.now()) {
  const { prisma } = await import("@dg/database");
  const limit = googlePlacesMonthlyLimit();
  const scope = googlePlacesBudgetScope();
  const month = googlePlacesMonthKey(now);
  const rows = await prisma.$queryRaw<Array<{ used: number; limit: number }>>`
    INSERT INTO provider_usage (id, provider, scope, month, used, "limit", created_at, updated_at)
    VALUES (${randomUUID()}, ${GOOGLE_PLACES_PROVIDER}, ${scope}, ${month}, 1, ${limit}, now(), now())
    ON CONFLICT (provider, scope, month)
    DO UPDATE SET used = provider_usage.used + 1, updated_at = now()
    WHERE provider_usage.used < ${limit}
    RETURNING used, "limit"
  `;
  if (!rows.length) throw new GooglePlacesBudgetExhausted();
  return { month, scope, used: rows[0].used, limit: rows[0].limit, remaining: Math.max(0, rows[0].limit - rows[0].used) };
}

/** Read-only snapshot for the operator Command Centre. */
export async function googlePlacesUsageSnapshot(now = Date.now()) {
  const { prisma } = await import("@dg/database");
  const month = googlePlacesMonthKey(now);
  const scope = googlePlacesBudgetScope();
  try {
    const rows = await prisma.$queryRaw<Array<{ used: number; limit: number }>>`
      SELECT used, "limit" FROM provider_usage
      WHERE provider = ${GOOGLE_PLACES_PROVIDER} AND scope = ${scope} AND month = ${month}
      LIMIT 1
    `;
    const row = rows[0];
    const limit = row?.limit ?? googlePlacesMonthlyLimit();
    const used = row?.used ?? 0;
    return { available: true, month, scope, used, limit, remaining: Math.max(0, limit - used) };
  } catch {
    return { available: false, month, scope, used: 0, limit: googlePlacesMonthlyLimit(), remaining: googlePlacesMonthlyLimit() };
  }
}
