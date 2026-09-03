import {
  listAccommodationUnits,
  unitToWpProp,
  type PlatformSession,
} from "@dg/platform-core";

export type AccUnitsOpsLoad = {
  units: Record<string, unknown>[];
  source: "postgres" | "wordpress";
  sot: boolean;
  seeded: boolean;
  siteLabel?: string;
  error?: string;
  /** Legacy compatibility field. Native runtime never imports from WordPress. */
  wpImportAvailable: boolean;
};

/**
 * Native Gen 2 accommodation operations always read units from Platform Core / Neon.
 * WordPress unit import is available only through the explicit migration endpoint.
 */
export async function loadUnitsForOps(
  session: Pick<PlatformSession, "organisationId" | "clerkUserId"> | null,
  _siteId?: string | null,
): Promise<AccUnitsOpsLoad> {
  if (!session) {
    return {
      units: [],
      source: "postgres",
      sot: true,
      seeded: false,
      wpImportAvailable: false,
      error: "Platform session unavailable.",
    };
  }

  const stored = await listAccommodationUnits(session.organisationId);

  return {
    units: stored.map(unitToWpProp),
    source: "postgres",
    sot: true,
    seeded: false,
    wpImportAvailable: false,
    error:
      stored.length === 0
        ? "No accommodation units are configured in Platform Core."
        : undefined,
  };
}
