/**
 * Cross-tenant feature flag overview for Command Centre.
 */

import { KNOWN_FEATURE_FLAGS } from "../features/flags";

type OrgSettingsWithFlags = {
  featureFlags?: Record<string, boolean>;
  [key: string]: unknown;
};

export type CommandFlagsOrgRow = {
  organisationId: string;
  organisationName: string;
  organisationSlug: string;
  flags: Record<string, boolean>;
  enabledCount: number;
};

export type CommandFlagsBundle = {
  generatedAt: string;
  known: typeof KNOWN_FEATURE_FLAGS;
  orgs: CommandFlagsOrgRow[];
};

export async function getCommandFeatureFlagsOverview(): Promise<CommandFlagsBundle> {
  const { prisma } = await import("@dg/database");
  const orgs = await prisma.organisation.findMany({
    orderBy: { name: "asc" },
    take: 80,
    select: { id: true, name: true, slug: true, settings: true },
  });

  return {
    generatedAt: new Date().toISOString(),
    known: KNOWN_FEATURE_FLAGS,
    orgs: orgs.map((org) => {
      const settings = (org.settings as OrgSettingsWithFlags | null) ?? {};
      const flags = { ...(settings.featureFlags ?? {}) };
      return {
        organisationId: org.id,
        organisationName: org.name,
        organisationSlug: org.slug,
        flags,
        enabledCount: Object.values(flags).filter(Boolean).length,
      };
    }),
  };
}
