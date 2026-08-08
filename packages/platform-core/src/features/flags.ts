/**
 * Org-scoped feature flags — stored on Organisation.settings.featureFlags.
 * Platform 1.0: simple boolean map; Command Centre can manage later.
 */

type OrgSettingsWithFlags = {
  featureFlags?: Record<string, boolean>;
  [key: string]: unknown;
};

export async function getOrganisationFeatureFlags(organisationId: string) {
  if (!process.env.DATABASE_URL) return {} as Record<string, boolean>;
  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: { settings: true },
  });
  const settings = (org?.settings as OrgSettingsWithFlags | null) ?? {};
  return { ...(settings.featureFlags ?? {}) };
}

export async function organisationHasFlag(
  organisationId: string,
  flagId: string,
): Promise<boolean> {
  const flags = await getOrganisationFeatureFlags(organisationId);
  return flags[flagId] === true;
}

export async function updateOrganisationFeatureFlags(input: {
  organisationId: string;
  actorId?: string;
  /** Partial patch — only listed keys updated */
  flags: Record<string, boolean>;
}) {
  const { prisma } = await import("@dg/database");
  type InputJsonValue = import("@dg/database").Prisma.InputJsonValue;
  const { writeAuditLog } = await import("../audit");

  const org = await prisma.organisation.findUnique({
    where: { id: input.organisationId },
    select: { settings: true },
  });
  if (!org) throw new Error("Organisation not found");

  const settings = (org.settings as OrgSettingsWithFlags | null) ?? {};
  const nextFlags = {
    ...(settings.featureFlags ?? {}),
    ...input.flags,
  };

  await prisma.organisation.update({
    where: { id: input.organisationId },
    data: {
      settings: {
        ...settings,
        featureFlags: nextFlags,
      } as unknown as InputJsonValue,
    },
  });

  await writeAuditLog({
    organisationId: input.organisationId,
    actorId: input.actorId,
    action: "update",
    entityType: "Organisation",
    entityId: input.organisationId,
    changes: { after: { featureFlags: nextFlags } },
  });

  return nextFlags;
}

/** Documented Core flags (defaults off unless set). */
export const KNOWN_FEATURE_FLAGS = [
  {
    id: "re.beta",
    label: "Real Estate beta",
    description:
      "Gates the Real Estate app for pilot agencies. Enable via Command Centre → Flags or Provision RE beta.",
  },
  {
    id: "ai.auto_execute",
    label: "AI auto-execute",
    description: "Allow approved AI actions to run without extra confirmation",
  },
  {
    id: "crm.experimental_merge",
    label: "CRM contact merge (experimental)",
    description: "Enable experimental contact merge UI",
  },
  {
    id: "notifications.email_digest",
    label: "Email notification digest",
    description: "Queue daily digest of in-app notifications (requires Resend)",
  },
] as const;
