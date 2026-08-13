import { listLeads } from "../leads";
import { listProperties, PROPERTY_IN_CONTRACT_STATUSES } from "../properties";

export interface ReDashboardStats {
  vendorLeads: number;
  buyerLeads: number;
  properties: number;
  appraisals: number;
  listed: number;
  underOffer: number;
  sold: number;
  vendorByStage: Record<string, number>;
  buyerByStage: Record<string, number>;
}

export async function getReDashboardStats(organisationId: string): Promise<ReDashboardStats> {
  const [{ items: vendorItems }, { items: buyerItems }, { items: properties }] =
    await Promise.all([
      listLeads({ organisationId, leadType: "vendor", limit: 200 }),
      listLeads({ organisationId, leadType: "buyer", limit: 200 }),
      listProperties({ organisationId, limit: 200 }),
    ]);

  const vendorByStage: Record<string, number> = {};
  for (const lead of vendorItems) {
    const stage = lead.stage || "vendor_lead";
    vendorByStage[stage] = (vendorByStage[stage] ?? 0) + 1;
  }

  const buyerByStage: Record<string, number> = {};
  for (const lead of buyerItems) {
    const stage = lead.stage || "inquiry";
    buyerByStage[stage] = (buyerByStage[stage] ?? 0) + 1;
  }

  const inContract = new Set<string>(PROPERTY_IN_CONTRACT_STATUSES);

  return {
    vendorLeads: vendorItems.length,
    buyerLeads: buyerItems.length,
    properties: properties.length,
    appraisals: properties.filter((p) => p.status === "appraisal").length,
    listed: properties.filter((p) => p.status === "listed").length,
    underOffer: properties.filter((p) => inContract.has(p.status)).length,
    sold: properties.filter((p) => p.status === "sold").length,
    vendorByStage,
    buyerByStage,
  };
}
