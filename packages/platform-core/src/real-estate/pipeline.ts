import type { VendorStage } from "../leads";
import type { PropertyStatus } from "../properties";

/** Lead pipeline stage → property status when syncing */
export const LEAD_STAGE_TO_PROPERTY_STATUS: Partial<
  Record<VendorStage, PropertyStatus>
> = {
  appraisal: "appraisal",
  listing: "listed",
  sale: "under_offer",
  settlement: "sold",
};

/** Property status → lead pipeline stage when syncing */
export const PROPERTY_STATUS_TO_LEAD_STAGE: Partial<
  Record<PropertyStatus, VendorStage>
> = {
  appraisal: "appraisal",
  listed: "listing",
  under_offer: "sale",
  sold: "settlement",
};

export function leadStageForPropertyStatus(
  status: PropertyStatus,
): VendorStage | undefined {
  return PROPERTY_STATUS_TO_LEAD_STAGE[status];
}

export function propertyStatusForLeadStage(
  stage: VendorStage,
): PropertyStatus | undefined {
  return LEAD_STAGE_TO_PROPERTY_STATUS[stage];
}
