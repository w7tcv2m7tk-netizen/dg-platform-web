/**
 * Advanced Communications entitlement — Voice Agents · Outreach · Call Centre.
 * One commercial SKU (`voice_ai`), authorized only by the canonical verified
 * subscription projection. App enablement is configuration, not entitlement.
 */
export function hasAdvancedCommsEntitlement(input: {
  purchasedPremiumKeys?: string[];
  staffBypass?: boolean;
}): boolean {
  if (input.staffBypass) return true;
  if (input.purchasedPremiumKeys?.includes("voice_ai")) return true;
  return false;
}
