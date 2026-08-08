import {
  filterAppsForReBeta,
  getReBetaReadiness,
  organisationHasReBeta,
  resolveEnabledAppIds,
  type ReBetaReadiness,
} from "@dg/platform-core";

/**
 * Server helper: whether the active org may use Real Estate beta routes.
 */
export async function checkReBetaAccess(organisationId: string): Promise<{
  allowed: boolean;
  readiness: ReBetaReadiness;
}> {
  const [allowed, readiness] = await Promise.all([
    organisationHasReBeta(organisationId),
    getReBetaReadiness(organisationId),
  ]);
  return { allowed, readiness };
}

/** Resolve apps with RE beta gate applied (non-cached; for one-off checks). */
export async function resolveOrgAppsWithReBeta(organisationId: string) {
  if (!process.env.DATABASE_URL) return [];
  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: { settings: true },
  });
  const settings = org?.settings as {
    apps?: { enabled?: string[] };
    featureFlags?: Record<string, boolean>;
  } | null;
  return filterAppsForReBeta(
    resolveEnabledAppIds(settings ?? undefined),
    settings?.featureFlags,
  );
}
