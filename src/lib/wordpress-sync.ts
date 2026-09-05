import {
  syncVendorLeadsFromWordPress,
  syncBuyerLeadsFromWordPress,
  syncPropertiesFromWordPress,
  type PlatformSession,
} from "@dg/platform-core";

import {
  fetchWpBuyerLeads,
  fetchWpProperties,
  fetchWpVendorLeads,
} from "@/lib/dg-api";
import { wpConnectorForOrg } from "@/lib/org-wordpress-connector";

export interface WordPressSyncResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  ranAt: string;
}

type OrgWordPressSettings = {
  lastVendorLeadSyncAt?: string;
  lastVendorLeadSync?: WordPressSyncResult;
  lastBuyerLeadSyncAt?: string;
  lastBuyerLeadSync?: WordPressSyncResult;
  lastBookingSyncAt?: string;
  lastBookingSync?: WordPressSyncResult;
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

/** Explicit WordPress → Gen 2 migration primitive. Never call from normal runtime. */
export async function syncWordPressVendorLeads(
  session: Pick<PlatformSession, "organisationId" | "clerkUserId">,
): Promise<{ ok: true; result: WordPressSyncResult } | { ok: false; message: string }> {
  const connector = await wpConnectorForOrg(session.organisationId);
  const wp = await fetchWpVendorLeads(100, connector);
  if (!wp.ok) return { ok: false, message: wp.message };

  const syncResult = await syncVendorLeadsFromWordPress({
    organisationId: session.organisationId,
    actorId: session.clerkUserId,
    leads: wp.leads,
  });
  const result: WordPressSyncResult = { ...syncResult, ranAt: new Date().toISOString() };
  await patchOrgWordPressSettings(session.organisationId, {
    lastVendorLeadSyncAt: result.ranAt,
    lastVendorLeadSync: result,
  });
  return { ok: true, result };
}

/** Explicit WordPress → Gen 2 migration primitive. Never call from normal runtime. */
export async function syncWordPressBuyerLeads(
  session: Pick<PlatformSession, "organisationId" | "clerkUserId">,
): Promise<{ ok: true; result: WordPressSyncResult } | { ok: false; message: string }> {
  const connector = await wpConnectorForOrg(session.organisationId);
  const wp = await fetchWpBuyerLeads(100, connector);
  if (!wp.ok) return { ok: false, message: wp.message };

  const syncResult = await syncBuyerLeadsFromWordPress({
    organisationId: session.organisationId,
    actorId: session.clerkUserId,
    leads: wp.leads,
  });
  const result: WordPressSyncResult = { ...syncResult, ranAt: new Date().toISOString() };
  await patchOrgWordPressSettings(session.organisationId, {
    lastBuyerLeadSyncAt: result.ranAt,
    lastBuyerLeadSync: result,
  });
  return { ok: true, result };
}

/** Explicit WordPress → Gen 2 property migration primitive. Never call from normal runtime. */
export async function syncWordPressProperties(
  session: Pick<PlatformSession, "organisationId" | "clerkUserId">,
): Promise<{ ok: true; result: WordPressSyncResult } | { ok: false; message: string }> {
  const { prisma } = await import("@dg/database");
  const lockKey = `wp-property-sync:${session.organisationId}`;
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
    if (!wp.ok) return { ok: false, message: wp.message };

    const syncResult = await syncPropertiesFromWordPress({
      organisationId: session.organisationId,
      actorId: session.clerkUserId,
      properties: wp.properties,
    });
    const result: WordPressSyncResult = { ...syncResult, ranAt: new Date().toISOString() };
    await patchOrgWordPressSettings(session.organisationId, {
      lastPropertySyncAt: result.ranAt,
      lastPropertySync: result,
    });
    return { ok: true, result };
  } finally {
    await prisma.$queryRaw`SELECT pg_advisory_unlock(hashtext(${lockKey}))`;
  }
}

/** Read-only legacy migration history for operator diagnostics. */
export async function getLastWordPressSync(organisationId: string) {
  return loadOrgWordPressSettings(organisationId);
}
