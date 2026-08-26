/**
 * Advanced Communications entitlement — Voice Agents · Outreach · Call Centre.
 * One commercial SKU (`voice_ai`); legacy orgs may still have `ai-communications` enabled.
 */
export function hasAdvancedCommsEntitlement(input: {
  enabledAppIds?: string[];
  purchasedPremiumKeys?: string[];
  staffBypass?: boolean;
}): boolean {
  if (input.staffBypass) return true;
  if (input.purchasedPremiumKeys?.includes("voice_ai")) return true;
  if (input.enabledAppIds?.includes("ai-communications")) return true; // legacy
  return false;
}
