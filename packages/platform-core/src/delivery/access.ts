import type { SerializedPartner } from "../partners/types";

export function isDeliveryPartnerType(partnerType: string): boolean {
  return partnerType === "IMPLEMENTATION_PARTNER";
}

export function canAccessDeliveryPartnerWorkspace(partner: SerializedPartner | null): boolean {
  if (!partner) return false;
  if (partner.status !== "active" && partner.status !== "pending") return false;
  return isDeliveryPartnerType(partner.partnerType);
}

export function isDeliveryManager(partner: SerializedPartner | null): boolean {
  return Boolean(partner && partner.deliveryRole === "lead");
}

export function canViewAllDeliveryProjects(
  partner: SerializedPartner | null,
  isStaff: boolean,
): boolean {
  if (isStaff) return true;
  return isDeliveryManager(partner);
}
