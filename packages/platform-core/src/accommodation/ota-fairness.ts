import type { OtaIcalSource } from "./ical-import";

const OTA_SYNC_INTERVAL_MS = 15 * 60 * 1000;

/**
 * Rotate the capped cron window across every configured organisation.
 *
 * Selection must not depend on successful feed timestamps: a permanently broken
 * tenant URL would otherwise remain "oldest" forever and could starve healthy
 * tenants. Sorting first makes the batch stable; each cron interval advances the
 * circular window by one full batch.
 */
export function selectRotatingOtaOrganisations(
  organisationIds: string[],
  limit: number,
  now = new Date(),
): string[] {
  const ids = [...new Set(organisationIds)].sort((a, b) => a.localeCompare(b));
  if (!ids.length || limit <= 0) return [];
  if (ids.length <= limit) return ids;

  const slot = Math.floor(now.getTime() / OTA_SYNC_INTERVAL_MS);
  const start = (slot * limit) % ids.length;
  const selected: string[] = [];
  for (let offset = 0; offset < Math.min(limit, ids.length); offset += 1) {
    selected.push(ids[(start + offset) % ids.length]);
  }
  return selected;
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
