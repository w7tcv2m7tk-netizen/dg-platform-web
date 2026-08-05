import {
  syncVendorLeadsFromWordPress,
  type PlatformSession,
} from "@dg/platform-core";

import { fetchWpVendorLeads } from "@/lib/dg-api";

/** Minimum interval between automatic WordPress vendor lead syncs */
export const WP_VENDOR_SYNC_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

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

type OrgSettings = {
  connectors?: {
    wordpress?: {
      lastVendorLeadSyncAt?: string;
      lastVendorLeadSync?: WordPressSyncResult;
    };
  };
};

export async function syncWordPressVendorLeads(
  session: Pick<PlatformSession, "organisationId" | "clerkUserId">,
): Promise<
  | { ok: true; result: WordPressSyncResult }
  | { ok: false; message: string }
> {
  const wp = await fetchWpVendorLeads(100);
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

  await saveLastSync(session.organisationId, result);

  return { ok: true, result };
}

export async function autoSyncWordPressVendorLeadsIfNeeded(
  session: Pick<PlatformSession, "organisationId" | "clerkUserId">,
): Promise<AutoSyncOutcome> {
  const { prisma } = await import("@dg/database");

  const org = await prisma.organisation.findUnique({
    where: { id: session.organisationId },
    select: { settings: true },
  });

  const settings = (org?.settings as OrgSettings | null) ?? {};
  const lastAt = settings.connectors?.wordpress?.lastVendorLeadSyncAt;
  if (lastAt) {
    const elapsed = Date.now() - new Date(lastAt).getTime();
    if (elapsed < WP_VENDOR_SYNC_INTERVAL_MS) {
      return { ran: false, reason: "too_soon" };
    }
  }

  const hasKey =
    Boolean(process.env.DG_WP_CONNECTOR_API_KEY?.trim()) ||
    Boolean(process.env.DG_API_KEY?.trim());
  if (!hasKey) {
    return { ran: false, reason: "missing_key" };
  }

  const outcome = await syncWordPressVendorLeads(session);
  if (!outcome.ok) {
    return { ran: false, reason: "fetch_failed", message: outcome.message };
  }

  return { ran: true, result: outcome.result };
}

async function saveLastSync(organisationId: string, result: WordPressSyncResult) {
  const { prisma } = await import("@dg/database");
  type InputJsonValue = import("@dg/database").Prisma.InputJsonValue;

  const org = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: { settings: true },
  });

  const settings = (org?.settings as OrgSettings | null) ?? {};

  await prisma.organisation.update({
    where: { id: organisationId },
    data: {
      settings: {
        ...settings,
        connectors: {
          ...settings.connectors,
          wordpress: {
            ...settings.connectors?.wordpress,
            lastVendorLeadSyncAt: result.ranAt,
            lastVendorLeadSync: result,
          },
        },
      } as unknown as InputJsonValue,
    },
  });
}

export async function getLastWordPressSync(organisationId: string) {
  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: { settings: true },
  });
  const settings = (org?.settings as OrgSettings | null) ?? {};
  return settings.connectors?.wordpress ?? null;
}
