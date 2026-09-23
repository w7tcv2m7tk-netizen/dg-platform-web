export type CommercialPlatformTier = "starter" | "professional" | "business";
export type CommercialSupportPlan = "standard" | "priority" | "success_partner" | "enterprise_success";

export const PLATFORM_COMMERCIAL_PLANS: Array<{ id: CommercialPlatformTier; name: string; monthlyCents: number; blurb: string }> = [
  { id: "starter", name: "Starter", monthlyCents: 9900, blurb: "Core CRM, communications, documents and website foundation." },
  { id: "professional", name: "Growth", monthlyCents: 24900, blurb: "Full Business Operating Platform for growing teams." },
  { id: "business", name: "Scale", monthlyCents: 49900, blurb: "Scale operations with higher capacity and priority support." },
];

export const SUPPORT_COMMERCIAL_PLANS: Array<{ id: CommercialSupportPlan; name: string; monthlyCents: number | null; blurb: string; detail: string }> = [
  { id: "standard", name: "Standard", monthlyCents: 0, blurb: "Included with every platform.", detail: "Email support, knowledge base, community access and platform updates." },
  { id: "priority", name: "Priority", monthlyCents: 19900, blurb: "Faster response when you need it.", detail: "Everything in Standard, priority queue, quarterly strategy session, Business Health review and performance optimisation." },
  { id: "success_partner", name: "Success Partner", monthlyCents: 49900, blurb: "Maximum value from the platform.", detail: "Everything in Priority, dedicated success manager, monthly strategy, AI optimisation, team training and quarterly roadmap planning." },
  { id: "enterprise_success", name: "Enterprise Success", monthlyCents: null, blurb: "Custom partnership for scale.", detail: "Dedicated account team, custom SLA and escalation, enterprise roadmap alignment and multi-org deployment support." },
];
