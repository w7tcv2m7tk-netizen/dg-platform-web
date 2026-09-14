export type VipCustomerPreset = {
  organisationMatch: RegExp;
  industryApp: string;
  industryTemplate: string;
  setupFocus: string[];
  aidaWelcome: string;
};

/**
 * Concierge hints only. They never grant entitlements or replace organisation data.
 * The customer confirms these during setup and canonical settings remain authoritative.
 */
export const VIP_CUSTOMER_PRESETS: VipCustomerPreset[] = [
  {
    organisationMatch: /my venue clean/i,
    industryApp: "services",
    industryTemplate: "cleaning",
    setupFocus: ["sites", "contracts", "recurring schedules", "teams", "quality assurance", "consumables", "equipment", "WHS and SDS"],
    aidaWelcome: "I’ll prepare My Venue Clean as a commercial-cleaning operating platform, with recurring site work and quality assurance ready from day one.",
  },
  {
    organisationMatch: /aim financial/i,
    industryApp: "finance",
    industryTemplate: "mortgage-finance-broking",
    setupFocus: ["lead pipeline", "client fact find", "applications", "lenders", "document collection", "compliance", "referrals", "integrations"],
    aidaWelcome: "I’ll prepare AIM Financial as a finance and mortgage-broking operating platform, with its client and application journey front and centre.",
  },
];

export function getVipCustomerPreset(organisationName?: string | null) {
  if (!organisationName) return null;
  return VIP_CUSTOMER_PRESETS.find((preset) => preset.organisationMatch.test(organisationName)) ?? null;
}
