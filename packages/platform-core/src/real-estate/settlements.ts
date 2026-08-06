import type { Prisma } from "@dg/database";

export const SETTLEMENT_CHECKLIST_ITEMS = [
  { id: "contract_signed", label: "Contract signed" },
  { id: "finance_approved", label: "Finance approved" },
  { id: "building_pest", label: "Building & pest complete" },
  { id: "settlement_booked", label: "Settlement date booked" },
  { id: "keys_handover", label: "Keys handed over" },
  { id: "past_client_followup", label: "Past client follow-up" },
] as const;

export type SettlementChecklistId = (typeof SETTLEMENT_CHECKLIST_ITEMS)[number]["id"];

export type SettlementChecklist = Partial<Record<SettlementChecklistId, boolean>>;

export function parseSettlementChecklist(
  metadata: Record<string, unknown> | null | undefined,
): SettlementChecklist {
  const raw = metadata?.settlement_checklist;
  if (!raw || typeof raw !== "object") return {};
  return raw as SettlementChecklist;
}

export function settlementProgress(checklist: SettlementChecklist) {
  const total = SETTLEMENT_CHECKLIST_ITEMS.length;
  const done = SETTLEMENT_CHECKLIST_ITEMS.filter((item) => checklist[item.id]).length;
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
}

export async function updateSettlementChecklist(
  organisationId: string,
  propertyId: string,
  checklist: SettlementChecklist,
  actorId?: string,
) {
  const { prisma } = await import("@dg/database");

  const property = await prisma.property.findFirst({
    where: { id: propertyId, organisationId, deletedAt: null },
  });
  if (!property) return null;

  const metadata = {
    ...((property.metadata as Record<string, unknown> | null) ?? {}),
    settlement_checklist: checklist,
  };

  const updated = await prisma.property.update({
    where: { id: propertyId },
    data: { metadata: metadata as Prisma.InputJsonValue },
  });

  await prisma.activity.create({
    data: {
      organisationId,
      entityType: "Property",
      entityId: propertyId,
      activityType: "settlement_checklist",
      title: "Settlement checklist updated",
      body: `${settlementProgress(checklist).done}/${SETTLEMENT_CHECKLIST_ITEMS.length} complete`,
      sourceApp: "real-estate",
      createdBy: actorId,
      metadata: { checklist } as Prisma.InputJsonValue,
    },
  });

  return updated;
}

export async function listSettlementProperties(organisationId: string) {
  const { prisma } = await import("@dg/database");
  const { formatPropertyAddress } = await import("../properties");

  const properties = await prisma.property.findMany({
    where: {
      organisationId,
      deletedAt: null,
      OR: [{ status: "under_offer" }, { status: "sold" }],
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  const leadIds = properties.map((p) => p.leadId).filter(Boolean) as string[];
  const leads =
    leadIds.length > 0
      ? await prisma.lead.findMany({
          where: { organisationId, id: { in: leadIds } },
        })
      : [];

  const leadById = new Map(leads.map((l) => [l.id, l]));

  return properties.map((property) => {
    const metadata = (property.metadata as Record<string, unknown> | null) ?? {};
    const checklist = parseSettlementChecklist(metadata);
    const lead = property.leadId ? leadById.get(property.leadId) : undefined;
    const leadMeta = (lead?.metadata as Record<string, unknown> | null) ?? {};

    return {
      id: property.id,
      address: formatPropertyAddress(property),
      status: property.status,
      leadId: property.leadId,
      leadTitle: lead?.title ?? null,
      leadStage: (leadMeta.stage as string | undefined) ?? null,
      listingPriceCents: property.listingPriceCents,
      checklist,
      progress: settlementProgress(checklist),
      updatedAt: property.updatedAt.toISOString(),
    };
  });
}
