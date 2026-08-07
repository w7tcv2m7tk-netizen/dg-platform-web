import {
  syncVendorLeadsFromWordPress,
  syncBuyerLeadsFromWordPress,
  syncReBookingsFromWordPress,
  syncAccBookingsFromWordPress,
  syncPropertiesFromWordPress,
  type PlatformSession,
} from "@dg/platform-core";

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
): Promise<boolean> {
  const wp = await loadOrgWordPressSettings(organisationId);
  const lastAt = wp[lastAtKey];
  if (typeof lastAt !== "string") return true;
  return Date.now() - new Date(lastAt).getTime() >= WP_SYNC_INTERVAL_MS;
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
}

export async function syncWordPressAccBookings(
  session: Pick<PlatformSession, "organisationId" | "clerkUserId">,
): Promise<
  | { ok: true; result: WordPressSyncResult }
  | { ok: false; message: string }
> {
  const connector = await wpConnectorForOrg(session.organisationId);
  const wp = await fetchWpAccommodationBookings(null, 100, connector);
  if (!wp.ok) {
    return { ok: false, message: wp.message };
  }

  const syncResult = await syncAccBookingsFromWordPress({
    organisationId: session.organisationId,
    bookings: wp.bookings,
  });

  const result: WordPressSyncResult = {
    ...syncResult,
    ranAt: new Date().toISOString(),
  };

  await patchOrgWordPressSettings(session.organisationId, {
    lastAccBookingSyncAt: result.ranAt,
    lastAccBookingSync: result,
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
    | "lastPropertySyncAt",
  run: () => Promise<
    | { ok: true; result: WordPressSyncResult }
    | { ok: false; message: string }
  >,
): Promise<AutoSyncOutcome> {
  if (!(await shouldRunSync(session.organisationId, lastAtKey))) {
    return { ran: false, reason: "too_soon" };
  }

  const connector = await wpConnectorForOrg(session.organisationId);
  if (!connectorHasKey(connector)) {
    return { ran: false, reason: "missing_key" };
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
  return autoSyncIfNeeded(session, "lastAccBookingSyncAt", () =>
    syncWordPressAccBookings(session),
  );
}

export async function getLastWordPressSync(organisationId: string) {
  return loadOrgWordPressSettings(organisationId);
}
