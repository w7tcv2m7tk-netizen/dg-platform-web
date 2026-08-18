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

/** Deep link for a single enquiry (notification / automation href). */
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
  if (type === "buyer" && input.leadId) {
    return `/apps/re/buyer-leads/${input.leadId}`;
  }
  if (type === "vendor" && input.leadId) {
    return `/apps/re/vendor-leads/${input.leadId}`;
  }
  if (input.contactId) return `/apps/crm/contacts/${input.contactId}`;
  return "/apps/crm/opportunities";
}

export function isRealEstatePipelineLead(input: {
  leadType?: string | null;
  leadSource?: string | null;
}): boolean {
  const type = (input.leadType || "").trim().toLowerCase();
  const source = (input.leadSource || "").trim().toLowerCase();
  if (
    type === "contact" ||
    type === "enquiry" ||
    type === "founding_10" ||
    type === "consultation" ||
    type === "funnel_enquiry" ||
    type === "marketing"
  ) {
    return false;
  }
  return (
    type === "vendor" ||
    type === "buyer" ||
    source === "buyer_enquiry" ||
    source === "vendor" ||
    source === "vendor_enquiry"
  );
}

/** RE vendor/buyer record, or null when the org has no Real Estate workspace. */
export function sourceLeadHref(input: {
  leadId: string;
  leadType?: string | null;
  leadSource?: string | null;
  hasReBeta: boolean;
}): string | null {
  if (!input.hasReBeta || !isRealEstatePipelineLead(input)) return null;
  const type = (input.leadType || "").trim().toLowerCase();
  const source = (input.leadSource || "").trim().toLowerCase();
  if (type === "buyer" || source === "buyer_enquiry") {
    return `/apps/re/buyer-leads/${input.leadId}`;
  }
  return `/apps/re/vendor-leads/${input.leadId}`;
}
