export type OrganisationSystemsInventory = {
  connectors: string[];
  notes?: string;
  updatedAt?: string;
};

type OrgSettings = {
  systems?: OrganisationSystemsInventory;
  [key: string]: unknown;
};

const EMPTY: OrganisationSystemsInventory = { connectors: [] };

export function normalizeSystemsConnectors(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const known = new Set<string>();
  for (const id of ids) {
    if (typeof id !== "string") continue;
    const trimmed = id.trim().toLowerCase();
    if (trimmed) known.add(trimmed);
  }
  return [...known];
}

export async function getOrganisationSystemsInventory(
  organisationId: string,
): Promise<OrganisationSystemsInventory> {
  if (!process.env.DATABASE_URL) return EMPTY;

  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: { settings: true },
  });
  const settings = (org?.settings as OrgSettings | null) ?? {};
  const raw = settings.systems;
  if (!raw || typeof raw !== "object") return EMPTY;
  return {
    connectors: normalizeSystemsConnectors((raw as OrganisationSystemsInventory).connectors),
    notes:
      typeof (raw as OrganisationSystemsInventory).notes === "string"
        ? (raw as OrganisationSystemsInventory).notes
        : undefined,
    updatedAt:
      typeof (raw as OrganisationSystemsInventory).updatedAt === "string"
        ? (raw as OrganisationSystemsInventory).updatedAt
        : undefined,
  };
}

export async function saveOrganisationSystemsInventory(
  organisationId: string,
  patch: Partial<OrganisationSystemsInventory>,
): Promise<OrganisationSystemsInventory> {
  if (!process.env.DATABASE_URL) return EMPTY;

  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: { settings: true },
  });
  const settings = ((org?.settings as OrgSettings | null) ?? {}) as OrgSettings;
  const current = await getOrganisationSystemsInventory(organisationId);

  const next: OrganisationSystemsInventory = {
    connectors: patch.connectors
      ? normalizeSystemsConnectors(patch.connectors)
      : current.connectors,
    notes: patch.notes !== undefined ? patch.notes : current.notes,
    updatedAt: new Date().toISOString(),
  };

  await prisma.organisation.update({
    where: { id: organisationId },
    data: {
      settings: {
        ...settings,
        systems: next,
      } as never,
    },
  });

  return next;
}
