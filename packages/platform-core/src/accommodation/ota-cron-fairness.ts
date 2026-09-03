import { orderOtaSourcesByLastSync, selectDueOtaOrganisations } from "./ota-fairness";
import {
  syncOtaCalendarsFromUnits,
  type OtaIcalSource,
  type SyncAllOrgsOtaResult,
} from "./ical-import";

type UnitSyncState = {
  organisationId: string;
  airbnbIcalUrl: string | null;
  bookingcomIcalUrl: string | null;
  airbnbLastSyncAt: Date | null;
  bookingcomLastSyncAt: Date | null;
};

function hasConfiguredFeed(unit: UnitSyncState): boolean {
  return Boolean(unit.airbnbIcalUrl?.trim() || unit.bookingcomIcalUrl?.trim());
}

export function buildOtaOrganisationCandidates(units: UnitSyncState[]) {
  const byOrg = new Map<
    string,
    {
      oldestSyncAt: Date | null;
      hasNeverSyncedConfiguredFeed: boolean;
      units: UnitSyncState[];
    }
  >();

  for (const unit of units) {
    if (!hasConfiguredFeed(unit)) continue;

    const row = byOrg.get(unit.organisationId) ?? {
      oldestSyncAt: null,
      hasNeverSyncedConfiguredFeed: false,
      units: [],
    };
    row.units.push(unit);

    const configuredFeeds: Array<{ configured: boolean; lastSyncAt: Date | null }> = [
      { configured: Boolean(unit.airbnbIcalUrl?.trim()), lastSyncAt: unit.airbnbLastSyncAt },
      { configured: Boolean(unit.bookingcomIcalUrl?.trim()), lastSyncAt: unit.bookingcomLastSyncAt },
    ];

    for (const feed of configuredFeeds) {
      if (!feed.configured) continue;
      if (!feed.lastSyncAt) {
        row.hasNeverSyncedConfiguredFeed = true;
        continue;
      }
      if (!row.oldestSyncAt || feed.lastSyncAt < row.oldestSyncAt) {
        row.oldestSyncAt = feed.lastSyncAt;
      }
    }

    byOrg.set(unit.organisationId, row);
  }

  return [...byOrg.entries()].map(([organisationId, value]) => ({
    organisationId,
    lastSyncAt: value.hasNeverSyncedConfiguredFeed ? null : value.oldestSyncAt,
    units: value.units,
  }));
}

function oldestConfiguredSourceSync(
  units: UnitSyncState[],
  source: OtaIcalSource,
): Date | null | undefined {
  const configured = units.filter((unit) =>
    source === "airbnb" ? Boolean(unit.airbnbIcalUrl?.trim()) : Boolean(unit.bookingcomIcalUrl?.trim()),
  );
  if (!configured.length) return undefined;

  const values = configured.map((unit) =>
    source === "airbnb" ? unit.airbnbLastSyncAt : unit.bookingcomLastSyncAt,
  );
  if (values.some((value) => value === null)) return null;
  return new Date(Math.min(...values.map((value) => (value as Date).getTime())));
}

export function orderConfiguredOtaSources(
  units: UnitSyncState[],
  options?: { organisationId?: string; now?: Date },
): OtaIcalSource[] {
  const airbnbLastSyncAt = oldestConfiguredSourceSync(units, "airbnb");
  const bookingcomLastSyncAt = oldestConfiguredSourceSync(units, "bookingcom");

  if (airbnbLastSyncAt === undefined) return bookingcomLastSyncAt === undefined ? [] : ["bookingcom"];
  if (bookingcomLastSyncAt === undefined) return ["airbnb"];
  return orderOtaSourcesByLastSync({
    airbnbLastSyncAt,
    bookingcomLastSyncAt,
    now: options?.now,
    rotationKey: options?.organisationId,
  });
}

/**
 * Fair cron entry-point for OTA calendar imports.
 *
 * The old cron selected an unordered `take: 50`, which could permanently starve
 * tenants beyond the cap. This scheduler considers every configured tenant,
 * serves never-synchronised/oldest tenants first, and rotates near-equal OTA
 * source priority between cron intervals instead of always privileging Airbnb.
 */
export async function syncFairOtaCalendarsCron(options?: {
  limitOrgs?: number;
}): Promise<SyncAllOrgsOtaResult> {
  if (!process.env.DATABASE_URL) {
    return {
      organisations: 0,
      imported: 0,
      updated: 0,
      cancelled: 0,
      skipped: 0,
      errors: ["DATABASE_URL not set"],
      message: "Database not configured",
    };
  }

  const { prisma } = await import("@dg/database");
  const limit = Math.max(1, Math.min(options?.limitOrgs ?? 50, 100));
  const runStartedAt = new Date();
  const units = await prisma.accommodationUnit.findMany({
    where: {
      OR: [
        { airbnbIcalUrl: { not: null } },
        { bookingcomIcalUrl: { not: null } },
      ],
    },
    select: {
      organisationId: true,
      airbnbIcalUrl: true,
      bookingcomIcalUrl: true,
      airbnbLastSyncAt: true,
      bookingcomLastSyncAt: true,
    },
  });

  const candidates = buildOtaOrganisationCandidates(units);
  const selectedIds = selectDueOtaOrganisations(candidates, limit);
  const byOrg = new Map(candidates.map((candidate) => [candidate.organisationId, candidate.units]));

  const aggregate: SyncAllOrgsOtaResult = {
    organisations: selectedIds.length,
    imported: 0,
    updated: 0,
    cancelled: 0,
    skipped: 0,
    errors: [],
    message: "",
  };

  for (const organisationId of selectedIds) {
    const organisationUnits = byOrg.get(organisationId) ?? [];
    const sources = orderConfiguredOtaSources(organisationUnits, {
      organisationId,
      now: runStartedAt,
    });

    for (const source of sources) {
      try {
        const result = await syncOtaCalendarsFromUnits({
          organisationId,
          source,
          actorId: "cron:ota-ical-sync",
        });
        aggregate.imported += result.imported;
        aggregate.updated += result.updated;
        aggregate.cancelled += result.cancelled;
        aggregate.skipped += result.skipped;
        for (const err of result.errors) aggregate.errors.push(`${organisationId}: ${err}`);
      } catch (err) {
        aggregate.errors.push(
          `${organisationId} (${source}): ${err instanceof Error ? err.message : "sync failed"}`,
        );
      }
    }
  }

  aggregate.message =
    selectedIds.length === 0
      ? "No organisations with OTA iCal URLs configured."
      : `OTA cron fairly synced ${selectedIds.length} organisation(s) — ${aggregate.imported} imported, ${aggregate.updated} updated, ${aggregate.cancelled} cancelled`;
  if (aggregate.errors.length) aggregate.message += ` · ${aggregate.errors.length} warning(s)`;
  return aggregate;
}
