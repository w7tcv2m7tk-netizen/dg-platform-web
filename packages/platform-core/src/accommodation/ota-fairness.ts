import type { OtaIcalSource } from "./ical-import";

export type OtaSyncCandidate = {
  organisationId: string;
  lastSyncAt: Date | null;
};

const OTA_SYNC_INTERVAL_MS = 15 * 60 * 1000;

/**
 * Select the organisations most overdue for an OTA calendar sync.
 *
 * Never-synchronised organisations are served first, then the least recently
 * synchronised. The organisation id is the stable tie-breaker so pagination is
 * deterministic without permanently privileging one tenant.
 */
export function selectDueOtaOrganisations(
  candidates: OtaSyncCandidate[],
  limit: number,
): string[] {
  return [...candidates]
    .sort((a, b) => {
      if (a.lastSyncAt == null && b.lastSyncAt != null) return -1;
      if (a.lastSyncAt != null && b.lastSyncAt == null) return 1;
      const bySync = (a.lastSyncAt?.getTime() ?? 0) - (b.lastSyncAt?.getTime() ?? 0);
      return bySync || a.organisationId.localeCompare(b.organisationId);
    })
    .slice(0, limit)
    .map((candidate) => candidate.organisationId);
}

function stableParity(value: string): number {
  let total = 0;
  for (let index = 0; index < value.length; index += 1) total += value.charCodeAt(index);
  return total % 2;
}

/**
 * Prefer a materially stale source, but rotate near-equal feeds each cron slot.
 *
 * Sequential feed processing naturally leaves the first feed a few seconds older
 * than the second. Treating that tiny delta as priority would make the same source
 * win forever, so timestamps within one 15-minute cron interval are considered a
 * tie and use a time-slot + organisation-key rotation instead.
 */
export function orderOtaSourcesByLastSync(input: {
  airbnbLastSyncAt: Date | null;
  bookingcomLastSyncAt: Date | null;
  now?: Date;
  rotationKey?: string;
}): OtaIcalSource[] {
  if (input.airbnbLastSyncAt == null && input.bookingcomLastSyncAt != null) {
    return ["airbnb", "bookingcom"];
  }
  if (input.airbnbLastSyncAt != null && input.bookingcomLastSyncAt == null) {
    return ["bookingcom", "airbnb"];
  }

  if (input.airbnbLastSyncAt && input.bookingcomLastSyncAt) {
    const delta = input.airbnbLastSyncAt.getTime() - input.bookingcomLastSyncAt.getTime();
    if (Math.abs(delta) >= OTA_SYNC_INTERVAL_MS) {
      return delta < 0 ? ["airbnb", "bookingcom"] : ["bookingcom", "airbnb"];
    }
  }

  const slot = Math.floor((input.now ?? new Date()).getTime() / OTA_SYNC_INTERVAL_MS);
  const parity = (slot + stableParity(input.rotationKey ?? "")) % 2;
  return parity === 0 ? ["airbnb", "bookingcom"] : ["bookingcom", "airbnb"];
}
