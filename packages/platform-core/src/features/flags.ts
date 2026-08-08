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
    id: "acc.beta",
    label: "Accommodation beta",
    description:
      "Gates the Accommodation app for pilot properties (e.g. CVH). Enable via Command Centre → Flags or Enable Acc beta.",
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
  {
    id: "acc.units_sot",
    label: "Accommodation units SoT (Neon)",
    description:
      "Force Gen 2 AccommodationUnit as SoT for units/availability (WP becomes mirror). Soft-on when Neon already has units.",
  },
  {
    id: "acc.housekeeping_sot",
    label: "Accommodation housekeeping SoT (Neon)",
    description:
      "Housekeeping PATCH writes Neon first; WordPress mirror optional. Soft-on with units SoT.",
  },
  {
    id: "acc.gen2_first_booking",
    label: "Gen 2-first stay create",
    description:
      "Ops create_booking conflict-checks Neon and creates StayBooking first, then dual-writes WordPress. Public book-now stays WP until cutover.",
  },
  {
    id: "re.stage_writeback",
    label: "RE stage write-back to WordPress",
    description:
      "When on, Gen 2 stage changes PATCH WordPress pipeline (plugin v10.68+). Gen 2 remains SoT either way.",
  },
  {
    id: "websites.builder",
    label: "Website Builder (native)",
    description:
      "Gates AI Website Studio, Sites manager, and native site generation. Health Centre stays available without this flag.",
  },
  {
    id: "infra.domain_register",
    label: "Domain registration (paid)",
    description:
      "Allows DigitalGate Domains registration via Dreamscape SOAP/REST. Keep off until ready — production charges the reseller account. Also requires typed domain confirm (+ confirmProduction on live).",
  },
] as const;
