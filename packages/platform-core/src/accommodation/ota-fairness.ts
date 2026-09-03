import type { OtaIcalSource } from "./ical-import";

export type OtaSyncCandidate = {
  organisationId: string;
  lastSyncAt: Date | null;
};

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

/**
 * Prefer the OTA feed that has waited longest for this unit. This removes the
 * previous hard-coded Airbnb-first bias while retaining deterministic ordering.
 */
export function orderOtaSourcesByLastSync(input: {
  airbnbLastSyncAt: Date | null;
  bookingcomLastSyncAt: Date | null;
}): OtaIcalSource[] {
  const rows: Array<{ source: OtaIcalSource; lastSyncAt: Date | null }> = [
    { source: "airbnb", lastSyncAt: input.airbnbLastSyncAt },
    { source: "bookingcom", lastSyncAt: input.bookingcomLastSyncAt },
  ];
  return rows
    .sort((a, b) => {
      if (a.lastSyncAt == null && b.lastSyncAt != null) return -1;
      if (a.lastSyncAt != null && b.lastSyncAt == null) return 1;
      const bySync = (a.lastSyncAt?.getTime() ?? 0) - (b.lastSyncAt?.getTime() ?? 0);
      return bySync || a.source.localeCompare(b.source);
    })
    .map((row) => row.source);
}
