import {
  syncVendorLeadsFromWordPress,
  syncBuyerLeadsFromWordPress,
  syncReBookingsFromWordPress,
  syncAccommodationBookingsFromWordPress,
  syncAccommodationUnitsFromWordPress,
  syncPropertiesFromWordPress,
  upsertStayBookingFromWpRow,
  type PlatformSession,
} from "@dg/platform-core";

import { accommodationConnectorForSession } from "@/lib/accommodation-connector";
import {
  fetchWpAccommodationBookings,
  fetchWpBuyerLeads,
  fetchWpProperties,
  fetchWpRecentBookings,
  fetchWpVendorLeads,
} from "@/lib/dg-api";
import { wpConnectorForOrg } from "@/lib/org-wordpress-connector";

/** Minimum interval between automatic WordPress syncs */
export const WP_SYNC_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

/** StayBooking pull cadence — tighter while WP still originates public/OTA stays. */
export const WP_ACC_SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

export const WP_VENDOR_SYNC_INTERVAL_MS = WP_SYNC_INTERVAL_MS;

export interface WordPressSyncResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  ranAt: string;
}

export interface AutoSyncOutcome {
  ran: boolean;
  reason?: "disabled" | "too_soon" | "missing_key" | "fetch_failed";
  result?: WordPressSyncResult;
  message?: string;
}

type OrgWordPressSettings = {
  lastVendorLeadSyncAt?: string;
  lastVendorLeadSync?: WordPressSyncResult;
  lastBuyerLeadSyncAt?: string;
  lastBuyerLeadSync?: WordPressSyncResult;
  lastBookingSyncAt?: string;
  lastBookingSync?: WordPressSyncResult;
  lastAccBookingSyncAt?: string;
  lastAccBookingSync?: WordPressSyncResult;
  lastAccUnitSyncAt?: string;
  lastAccUnitSync?: WordPressSyncResult;
  lastPropertySyncAt?: string;
  lastPropertySync?: WordPressSyncResult;
};

type OrgSettings = {
  connectors?: {
    wordpress?: OrgWordPressSettings;
  };
};

async function loadOrgWordPressSettings(organisationId: string) {
  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: { settings: true },
  });
  return ((org?.settings as OrgSettings | null) ?? {}).connectors?.wordpress ?? {};
}

async function patchOrgWordPressSettings(
  organisationId: string,
  patch: Partial<OrgWordPressSettings>,
) {
  const { prisma } = await import("@dg/database");
  type InputJsonValue = import("@dg/database").Prisma.InputJsonValue;

  const org = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: { settings: true },
  });

  const settings = (org?.settings as OrgSettings | null) ?? {};
  const wordpress = settings.connectors?.wordpress ?? {};

  await prisma.organisation.update({
    where: { id: organisationId },
    data: {
      settings: {
        ...settings,
        connectors: {
          ...settings.connectors,
          wordpress: { ...wordpress, ...patch },
        },
      } as unknown as InputJsonValue,
    },
  });
}

function connectorHasKey(connector: Awaited<ReturnType<typeof wpConnectorForOrg>>) {
  return Boolean(
    connector.apiKey?.trim() ||
      process.env.DG_WP_CONNECTOR_API_KEY?.trim() ||
      process.env.DG_API_KEY?.trim(),
  );
}

async function shouldRunSync(
  organisationId: string,
  lastAtKey: keyof OrgWordPressSettings,
  intervalMs: number = WP_SYNC_INTERVAL_MS,
): Promise<boolean> {
  const wp = await loadOrgWordPressSettings(organisationId);
  const lastAt = wp[lastAtKey];
  if (typeof lastAt !== "string") return true;
  return Date.now() - new Date(lastAt).getTime() >= intervalMs;
}

export async function syncWordPressVendorLeads(
  session: Pick<PlatformSession, "organisationId" | "clerkUserId">,
): Promise<
  | { ok: true; result: WordPressSyncResult }
  | { ok: false; message: string }
> {
  const connector = await wpConnectorForOrg(session.organisationId);
  const wp = await fetchWpVendorLeads(100, connector);
  if (!wp.ok) {
    return { ok: false, message: wp.message };
  }

  const syncResult = await syncVendorLeadsFromWordPress({
    organisationId: session.organisationId,
    actorId: session.clerkUserId,
    leads: wp.leads,
  });

  const result: WordPressSyncResult = {
    ...syncResult,
    ranAt: new Date().toISOString(),
  };

  await patchOrgWordPressSettings(session.organisationId, {
    lastVendorLeadSyncAt: result.ranAt,
    lastVendorLeadSync: result,
  });

  return { ok: true, result };
}

export async function syncWordPressBuyerLeads(
  session: Pick<PlatformSession, "organisationId" | "clerkUserId">,
): Promise<
  | { ok: true; result: WordPressSyncResult }
  | { ok: false; message: string }
> {
  const connector = await wpConnectorForOrg(session.organisationId);
  const wp = await fetchWpBuyerLeads(100, connector);
  if (!wp.ok) {
    return { ok: false, message: wp.message };
  }

  const syncResult = await syncBuyerLeadsFromWordPress({
    organisationId: session.organisationId,
    actorId: session.clerkUserId,
    leads: wp.leads,
  });

  const result: WordPressSyncResult = {
    ...syncResult,
    ranAt: new Date().toISOString(),
  };

  await patchOrgWordPressSettings(session.organisationId, {
    lastBuyerLeadSyncAt: result.ranAt,
    lastBuyerLeadSync: result,
  });

  return { ok: true, result };
}

export async function syncWordPressBookings(
  session: Pick<PlatformSession, "organisationId" | "clerkUserId">,
): Promise<
  | { ok: true; result: WordPressSyncResult }
  | { ok: false; message: string }
> {
  const connector = await wpConnectorForOrg(session.organisationId);
  const wp = await fetchWpRecentBookings(100, connector);
  if (!wp.ok) {
    return { ok: false, message: wp.message };
  }

  const syncResult = await syncReBookingsFromWordPress({
    organisationId: session.organisationId,
    actorId: session.clerkUserId,
    bookings: wp.bookings,
  });

  const result: WordPressSyncResult = {
    ...syncResult,
    ranAt: new Date().toISOString(),
  };

  await patchOrgWordPressSettings(session.organisationId, {
    lastBookingSyncAt: result.ranAt,
    lastBookingSync: result,
  });

  return { ok: true, result };
}

export async function syncWordPressProperties(
  session: Pick<PlatformSession, "organisationId" | "clerkUserId">,
): Promise<
  | { ok: true; result: WordPressSyncResult }
  | { ok: false; message: string }
> {
  const { prisma } = await import("@dg/database");
  const lockKey = `wp-property-sync:${session.organisationId}`;

  // Session advisory lock — blocks concurrent Properties/Listings auto-syncs
  // on the same org (the race that duplicated 11 Kianga Court).
  const lockRows = await prisma.$queryRaw<Array<{ ok: boolean }>>`
    SELECT pg_try_advisory_lock(hashtext(${lockKey})) AS ok
  `;
  if (!lockRows[0]?.ok) {
    return {
      ok: true,
      result: {
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [],
        ranAt: new Date().toISOString(),
      },
    };
  }

  try {
    const connector = await wpConnectorForOrg(session.organisationId);
    const wp = await fetchWpProperties(100, connector);
    if (!wp.ok) {
      return { ok: false, message: wp.message };
    }

    const syncResult = await syncPropertiesFromWordPress({
      organisationId: session.organisationId,
      actorId: session.clerkUserId,
      properties: wp.properties,
    });

    const result: WordPressSyncResult = {
      ...syncResult,
      ranAt: new Date().toISOString(),
    };

    await patchOrgWordPressSettings(session.organisationId, {
      lastPropertySyncAt: result.ranAt,
      lastPropertySync: result,
    });

    return { ok: true, result };
  } finally {
    await prisma.$queryRaw`SELECT pg_advisory_unlock(hashtext(${lockKey}))`;
  }
}

export async function syncWordPressAccBookings(
  session: Pick<PlatformSession, "organisationId" | "clerkUserId">,
): Promise<
  | { ok: true; result: WordPressSyncResult }
  | { ok: false; message: string }
> {
  // Prefer the same host-safe CVH key resolution used by OTA sync / calendar.
  // Core resolveOrgWordPressConnector alone often lacks DG_WP_ACCOMMODATION_* keys.
  const connector = await accommodationConnectorForSession(session.organisationId);
  if (connector?.baseUrl && connector.apiKey) {
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - 30);
    const to = new Date(today);
    to.setDate(to.getDate() + 365);
    const iso = (d: Date) => d.toISOString().slice(0, 10);

    const fetched = await fetchWpAccommodationBookings(null, 200, connector, {
      from: iso(from),
      to: iso(to),
    });
    if (!fetched.ok) {
      return { ok: false, message: fetched.message };
    }

    const result: WordPressSyncResult = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      ranAt: new Date().toISOString(),
    };

    for (const booking of fetched.bookings) {
      try {
        const outcome = await upsertStayBookingFromWpRow(session.organisationId, booking, {
          actorId: session.clerkUserId,
        });
        if (outcome === "created") result.created++;
        else if (outcome === "updated") result.updated++;
        else if (outcome === "conflict") {
          // Counting this as skipped would hide it. A conflict means either the
          // dates are already held, or WordPress and Gen 2 have both changed the
          // booking — both need an operator, not silence.
          result.skipped++;
          result.errors.push(
            `Booking #${booking.id}: not imported — it conflicts with current Gen 2 state`,
          );
        } else result.skipped++;
      } catch (err) {
        result.errors.push(
          `Booking #${booking.id}: ${err instanceof Error ? err.message : "sync failed"}`,
        );
      }
    }

    await patchOrgWordPressSettings(session.organisationId, {
      lastAccBookingSyncAt: result.ranAt,
      lastAccBookingSync: result,
    });

    return { ok: true, result };
  }

  const outcome = await syncAccommodationBookingsFromWordPress(session.organisationId, {
    actorId: session.clerkUserId,
    limit: 200,
  });

  if (!outcome.ok) {
    return { ok: false, message: outcome.message };
  }

  const result: WordPressSyncResult = {
    ...outcome.result,
    ranAt: new Date().toISOString(),
  };

  await patchOrgWordPressSettings(session.organisationId, {
    lastAccBookingSyncAt: result.ranAt,
    lastAccBookingSync: result,
  });

  return { ok: true, result };
}

export async function syncWordPressAccUnits(
  session: Pick<PlatformSession, "organisationId" | "clerkUserId">,
): Promise<
  | { ok: true; result: WordPressSyncResult }
  | { ok: false; message: string }
> {
  const outcome = await syncAccommodationUnitsFromWordPress(session.organisationId);
  if (!outcome.ok) {
    return { ok: false, message: outcome.message };
  }

  const result: WordPressSyncResult = {
    ...outcome.result,
    ranAt: new Date().toISOString(),
  };

  await patchOrgWordPressSettings(session.organisationId, {
    lastAccUnitSyncAt: result.ranAt,
    lastAccUnitSync: result,
  });

  return { ok: true, result };
}

async function autoSyncIfNeeded(
  session: Pick<PlatformSession, "organisationId" | "clerkUserId">,
  lastAtKey:
    | "lastVendorLeadSyncAt"
    | "lastBuyerLeadSyncAt"
    | "lastBookingSyncAt"
    | "lastAccBookingSyncAt"
    | "lastAccUnitSyncAt"
    | "lastPropertySyncAt",
  run: () => Promise<
    | { ok: true; result: WordPressSyncResult }
    | { ok: false; message: string }
  >,
  intervalMs: number = WP_SYNC_INTERVAL_MS,
): Promise<AutoSyncOutcome> {
  // WP-D-107: RE auto-pull is opt-in. Gen 2 create/list is SoT; manual Sync buttons remain.
  const reKeys = new Set([
    "lastVendorLeadSyncAt",
    "lastBuyerLeadSyncAt",
    "lastBookingSyncAt",
    "lastPropertySyncAt",
  ]);
  if (reKeys.has(lastAtKey)) {
    const { organisationHasFlag } = await import("@dg/platform-core");
    const allowed = await organisationHasFlag(
      session.organisationId,
      "re.wp_auto_sync",
    );
    if (!allowed) {
      return { ran: false, reason: "disabled" };
    }
  }

  const accKeys = new Set(["lastAccBookingSyncAt", "lastAccUnitSyncAt"]);
  if (accKeys.has(lastAtKey)) {
    const { organisationHasFlag } = await import("@dg/platform-core");
    const allowed = await organisationHasFlag(
      session.organisationId,
      "acc.wp_auto_sync",
    );
    if (!allowed) {
      return { ran: false, reason: "disabled" };
    }
  }

  if (!(await shouldRunSync(session.organisationId, lastAtKey, intervalMs))) {
    return { ran: false, reason: "too_soon" };
  }

  const connector = await wpConnectorForOrg(session.organisationId);
  if (!connectorHasKey(connector)) {
    return { ran: false, reason: "missing_key" };
  }

  // Acc unit/booking auto-pull against Gen 2 marketing apexes will 404 — skip.
  if (
    (lastAtKey === "lastAccUnitSyncAt" || lastAtKey === "lastAccBookingSyncAt") &&
    connector.baseUrl
  ) {
    const { isGen2MarketingApexBaseUrl } = await import("@/lib/dg-api");
    if (isGen2MarketingApexBaseUrl(connector.baseUrl)) {
      return { ran: false, reason: "disabled" };
    }
  }

  const outcome = await run();
  if (!outcome.ok) {
    return { ran: false, reason: "fetch_failed", message: outcome.message };
  }

  return { ran: true, result: outcome.result };
}

export async function autoSyncWordPressVendorLeadsIfNeeded(
  session: Pick<PlatformSession, "organisationId" | "clerkUserId">,
): Promise<AutoSyncOutcome> {
  return autoSyncIfNeeded(session, "lastVendorLeadSyncAt", () =>
    syncWordPressVendorLeads(session),
  );
}

export async function autoSyncWordPressBuyerLeadsIfNeeded(
  session: Pick<PlatformSession, "organisationId" | "clerkUserId">,
): Promise<AutoSyncOutcome> {
  return autoSyncIfNeeded(session, "lastBuyerLeadSyncAt", () =>
    syncWordPressBuyerLeads(session),
  );
}

export async function autoSyncWordPressBookingsIfNeeded(
  session: Pick<PlatformSession, "organisationId" | "clerkUserId">,
): Promise<AutoSyncOutcome> {
  return autoSyncIfNeeded(session, "lastBookingSyncAt", () =>
    syncWordPressBookings(session),
  );
}

export async function autoSyncWordPressPropertiesIfNeeded(
  session: Pick<PlatformSession, "organisationId" | "clerkUserId">,
): Promise<AutoSyncOutcome> {
  return autoSyncIfNeeded(session, "lastPropertySyncAt", () =>
    syncWordPressProperties(session),
  );
}

export async function autoSyncWordPressAccBookingsIfNeeded(
  session: Pick<PlatformSession, "organisationId" | "clerkUserId">,
): Promise<AutoSyncOutcome> {
  return autoSyncIfNeeded(
    session,
    "lastAccBookingSyncAt",
    () => syncWordPressAccBookings(session),
    WP_ACC_SYNC_INTERVAL_MS,
  );
}

export async function autoSyncWordPressAccUnitsIfNeeded(
  session: Pick<PlatformSession, "organisationId" | "clerkUserId">,
): Promise<AutoSyncOutcome> {
  return autoSyncIfNeeded(
    session,
    "lastAccUnitSyncAt",
    () => syncWordPressAccUnits(session),
    WP_ACC_SYNC_INTERVAL_MS,
  );
}

export async function getLastWordPressSync(organisationId: string) {
  return loadOrgWordPressSettings(organisationId);
}
