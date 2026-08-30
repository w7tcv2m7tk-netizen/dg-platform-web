/**
 * Address-resolution cache and throttle for the public property-report funnel.
 *
 * `POST /api/public/property-report` with `action=resolve` is unauthenticated
 * and calls Google Geocoding and CoreLogic Address Match on every request, both
 * of which are billed per call. Nothing deduplicated them, so the same address
 * re-resolved repeatedly — and a script could run the bill up without limit.
 *
 * Two layers, both deliberately cheap:
 *
 *   1. Result cache keyed on the normalised address. Address→property mapping
 *      is stable over minutes, so a short TTL removes the repeat cost with no
 *      staleness risk worth worrying about.
 *   2. A per-caller budget of DISTINCT addresses. This is the honest signal for
 *      automation: a genuine prospect looks up a handful of properties, a
 *      scraper walks hundreds. Repeats of an address the caller already looked
 *      up are served from cache and never count against the budget, so
 *      refreshing or correcting a form never penalises anyone.
 *
 * Deliberately NOT tenant-keyed for the cache: the resolved value is public
 * property data from a third-party API, derived only from the address string,
 * and contains nothing tenant-specific. The throttle IS keyed per caller.
 * If tenant-specific data is ever added to the resolved payload, the cache key
 * must gain the organisation id — see `assertCacheableResolvedPayload`.
 *
 * In-memory, per serverless isolate. That is a real limitation: it bounds abuse
 * per instance rather than globally, and cold starts reset it. It is chosen
 * because the repository has no shared cache and the alternative is adding
 * infrastructure for a funnel that must stay frictionless. The same trade-off
 * is already accepted by `websites/form-spam-guard.ts`.
 */

/** Address→property mapping is stable; short TTL kills repeat cost safely. */
export const RESOLVE_CACHE_TTL_MS = 10 * 60 * 1000;

/** Rolling window for the distinct-address budget. */
export const RESOLVE_WINDOW_MS = 15 * 60 * 1000;

/**
 * Distinct addresses one caller may resolve per window.
 *
 * Set well above genuine use — a prospect comparing several properties, or an
 * office and a family sharing one NAT address — while still far below what a
 * scraper needs. Repeats are free, so this only counts genuinely new lookups.
 */
export const RESOLVE_DISTINCT_ADDRESS_LIMIT = 12;

/** Beyond this, the caller is treated as automated rather than merely busy. */
export const RESOLVE_SUSPICIOUS_LIMIT = 40;

export type ResolveThrottleVerdict =
  | { allowed: true; reason: "cached" | "within_budget"; distinctAddresses: number }
  | {
      allowed: false;
      reason: "budget_exceeded" | "suspicious";
      retryAfterMs: number;
      distinctAddresses: number;
    };

type CacheEntry<T> = { value: T; expiresAt: number };

const resultCache = new Map<string, CacheEntry<unknown>>();
const callerAddresses = new Map<string, Map<string, number>>();

/** Normalise so trivial formatting differences share a cache slot. */
export function normaliseAddressKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function prune(now: number): void {
  for (const [key, entry] of resultCache) {
    if (entry.expiresAt <= now) resultCache.delete(key);
  }
  for (const [caller, seen] of callerAddresses) {
    for (const [addr, at] of seen) {
      if (now - at > RESOLVE_WINDOW_MS) seen.delete(addr);
    }
    if (seen.size === 0) callerAddresses.delete(caller);
  }
}

export function readResolveCache<T>(rawAddress: string, now = Date.now()): T | null {
  const key = normaliseAddressKey(rawAddress);
  if (!key) return null;
  const entry = resultCache.get(key);
  if (!entry || entry.expiresAt <= now) return null;
  return entry.value as T;
}

export function writeResolveCache<T>(rawAddress: string, value: T, now = Date.now()): void {
  const key = normaliseAddressKey(rawAddress);
  if (!key) return;
  prune(now);
  resultCache.set(key, { value, expiresAt: now + RESOLVE_CACHE_TTL_MS });
}

/**
 * Decide whether this caller may trigger a NEW paid resolution.
 *
 * Call only on a cache miss: a cache hit costs nothing and is always allowed.
 */
export function checkResolveBudget(
  callerKey: string,
  rawAddress: string,
  now = Date.now(),
): ResolveThrottleVerdict {
  const address = normaliseAddressKey(rawAddress);
  if (!address) return { allowed: true, reason: "within_budget", distinctAddresses: 0 };

  // An unidentifiable caller must not get a free pass; bucket them together.
  const caller = callerKey?.trim() || "unknown";

  prune(now);
  const seen = callerAddresses.get(caller) ?? new Map<string, number>();

  // Already attempted this address in the window — refreshing is free, and it
  // is served from cache anyway.
  if (seen.has(address)) {
    seen.set(address, now);
    callerAddresses.set(caller, seen);
    return { allowed: true, reason: "cached", distinctAddresses: seen.size };
  }

  // Record the attempt even when it will be refused. Counting only accepted
  // lookups would freeze the tally at the budget and make the suspicious tier
  // unreachable, so escalation could never happen.
  seen.set(address, now);
  callerAddresses.set(caller, seen);

  if (seen.size > RESOLVE_SUSPICIOUS_LIMIT) {
    return {
      allowed: false,
      reason: "suspicious",
      retryAfterMs: RESOLVE_WINDOW_MS,
      distinctAddresses: seen.size,
    };
  }

  if (seen.size > RESOLVE_DISTINCT_ADDRESS_LIMIT) {
    return {
      allowed: false,
      reason: "budget_exceeded",
      retryAfterMs: RESOLVE_WINDOW_MS,
      distinctAddresses: seen.size,
    };
  }

  return { allowed: true, reason: "within_budget", distinctAddresses: seen.size };
}

/**
 * Guard against caching anything tenant-scoped.
 *
 * The resolve payload is public property data derived from the address alone.
 * If a field ever carries an organisation id, caching it across callers would
 * leak it, so refuse to cache rather than risk that.
 */
export function assertCacheableResolvedPayload(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const serialised = JSON.stringify(value);
  return !/"organisationId"|"organisation_id"|"leadId"|"contactId"/.test(serialised);
}

/**
 * Telemetry for tuning the thresholds above.
 *
 * The thresholds are initial production values, not settled policy, so we need
 * evidence before changing them: how much genuine volume there is, how much of
 * it is repeat lookups, how many callers hit the budget, and how many paid
 * provider calls the cache avoided.
 *
 * One structured line per resolve/submit to the existing application log, which
 * Vercel already collects and makes queryable. No new infrastructure, because a
 * metrics backend is not warranted for tuning two numbers.
 *
 * Deliberately carries NO identifiers — no address, no IP, no caller hash. Every
 * question we need answered is a counting question, and the property address a
 * prospect types is personal data that should not be duplicated into logs. The
 * distinct-address count is the automation signal, and it travels on the event
 * itself, so grouping by caller is unnecessary.
 */
export type ResolveTelemetryEvent = {
  event: "resolve" | "submit";
  outcome:
    | "cache_hit"
    | "resolved"
    | "resolve_failed"
    | "budget_exceeded"
    | "suspicious"
    | "submitted"
    | "submit_failed";
  /** Distinct addresses this caller has attempted in the current window. */
  distinctAddresses?: number;
  /** True when a billed Google/CoreLogic call was skipped. */
  providerCallAvoided?: boolean;
};

/**
 * Emitted with a fixed prefix so the whole funnel can be pulled from logs with
 * a single filter. Keep the prefix stable — queries depend on it.
 */
export const RESOLVE_TELEMETRY_PREFIX = "[property-report.telemetry]";

export function recordResolveTelemetry(event: ResolveTelemetryEvent): void {
  // Telemetry must never be able to fail the funnel it measures.
  try {
    console.log(
      `${RESOLVE_TELEMETRY_PREFIX} ${JSON.stringify({
        ...event,
        cacheEntries: resultCache.size,
        trackedCallers: callerAddresses.size,
      })}`,
    );
  } catch {
    /* ignore */
  }
}

/** Test seam. */
export function __resetResolveCacheForTests(): void {
  resultCache.clear();
  callerAddresses.clear();
}
