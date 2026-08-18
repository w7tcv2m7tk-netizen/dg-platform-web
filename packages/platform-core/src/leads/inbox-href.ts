/**
 * Where staff work new enquiries.
 * Real Estate vendor/buyer pipelines stay in the RE app; platform and
 * DigitalGate website leads live in CRM so they work without an industry app.
 */

export function hasRealEstateWorkspace(enabledAppIds: readonly string[]): boolean {
  return enabledAppIds.includes("real-estate");
}

export function enquiryInboxHref(enabledAppIds: readonly string[] = []): string {
  return hasRealEstateWorkspace(enabledAppIds)
    ? "/apps/re/vendor-leads"
    : "/apps/crm/opportunities";
}

export function enquiryRecordHref(input: {
  opportunityId?: string | null;
  leadId?: string | null;
  leadType?: string | null;
  contactId?: string | null;
}): string {
  if (input.opportunityId) {
    return `/apps/crm/opportunities/${input.opportunityId}`;
  }
  const type = (input.leadType || "").trim().toLowerCase();
  if (type === "consultation") return "/apps/crm/consultations";
  if ((type === "vendor" || type === "buyer") && input.leadId) {
    return `/apps/re/vendor-leads/${input.leadId}`;
  }
  if (input.contactId) return `/apps/crm/contacts/${input.contactId}`;
  return "/apps/crm/opportunities";
}
