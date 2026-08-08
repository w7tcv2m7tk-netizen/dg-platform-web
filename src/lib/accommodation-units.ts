import {
  listAccommodationUnits,
  organisationUsesUnitSot,
  sortAccommodationUnitsByDisplayOrder,
  syncAccommodationUnitsFromWordPress,
  unitToWpProp,
  type PlatformSession,
} from "@dg/platform-core";

import { accommodationConnectorForSession } from "@/lib/accommodation-connector";
import { fetchWpAccommodationUnits } from "@/lib/dg-api";
import { autoSyncWordPressAccUnitsIfNeeded } from "@/lib/wordpress-sync";

export type AccUnitsOpsLoad = {
  units: Record<string, unknown>[];
  source: "postgres" | "wordpress";
  sot: boolean;
  seeded: boolean;
  siteLabel?: string;
  error?: string;
};

/**
 * WP-D-402: Prefer Neon AccommodationUnit when SoT; seed from WP when empty.
 */
export async function loadUnitsForOps(
  session: Pick<PlatformSession, "organisationId" | "clerkUserId"> | null,
  siteId?: string | null,
): Promise<AccUnitsOpsLoad> {
  if (!session) {
    return { units: [], source: "wordpress", sot: false, seeded: false };
  }

  const connector = await accommodationConnectorForSession(session.organisationId);
  await autoSyncWordPressAccUnitsIfNeeded(session).catch(() => null);

  let stored = await listAccommodationUnits(session.organisationId);
  let seeded = false;

  if (stored.length === 0) {
    const sync = await syncAccommodationUnitsFromWordPress(session.organisationId);
    if (sync.ok) {
      stored = await listAccommodationUnits(session.organisationId);
      seeded = stored.length > 0;
    }
  }

  if (await organisationUsesUnitSot(session.organisationId)) {
    return {
      units: stored.map(unitToWpProp),
      source: "postgres",
      sot: true,
      seeded,
      siteLabel: connector?.label,
    };
  }

  const live = await fetchWpAccommodationUnits(siteId, connector);
  if (!live.ok) {
    if (stored.length) {
      return {
        units: stored.map(unitToWpProp),
        source: "postgres",
        sot: true,
        seeded,
        siteLabel: connector?.label,
      };
    }
    return {
      units: [],
      source: "wordpress",
      sot: false,
      seeded,
      error: live.message,
      siteLabel: connector?.label,
    };
  }

  return {
    units: sortAccommodationUnitsByDisplayOrder(live.units) as unknown as Record<
      string,
      unknown
    >[],
    source: "wordpress",
    sot: false,
    seeded,
    siteLabel: live.site,
  };
}
