/**
 * DigitalGate Delivery workspace — role-based partner workspace (not a CRM menu).
 * Delivery encompasses onboarding, migrations, configuration, training, QA, go-live and Customer Success.
 * Pipeline stages: DigitalGate Implementation Lifecycle™ — see delivery-model.ts.
 */

export const DELIVERY_PARTNER_PUBLIC_LABEL = "Delivery Partner";
export const DELIVERY_MANAGER_PUBLIC_LABEL = "Delivery Manager";

export type DeliveryPartnerRole = "lead" | "member";

export type DeliveryProjectHealth = "on_track" | "at_risk" | "blocked";
export type DeliveryMilestoneStatus = "pending" | "in_progress" | "complete" | "skipped";
export type DeliveryTaskStatus = "pending" | "in_progress" | "complete" | "cancelled";
export type DeliveryBlockerStatus = "open" | "resolved";

export const DIGITALGATE_USER_TYPES = {
  platform: [
    "DigitalGate Owner",
    "DigitalGate Admin",
    "DigitalGate Member",
  ],
  partners: [
    "Reseller",
    "Delivery Partner",
    "Success / Support Partner",
  ],
  customer: [
    "Organisation Owner",
    "Organisation Admin",
    "Organisation Member",
  ],
} as const;

export const DELIVERY_PARTNER_CAN_SEE = [
  "Customers assigned to them",
  "Implementation projects assigned to them",
  "Their tasks",
  "Relevant customer information",
  "Implementation documents",
  "Approved platform documentation",
  "Delivery communications",
  "Training requirements",
  "QA requirements",
] as const;

export const DELIVERY_PARTNER_CANNOT_SEE = [
  "Other customers (unless assigned)",
  "Reseller commissions",
  "DigitalGate financial information",
  "Other partners",
  "Internal strategy",
  "Platform roadmap",
  "Sensitive internal documents",
  "Complete Command Centre",
] as const;

export const DELIVERY_MANAGER_CAN_SEE = [
  "All active implementations",
  "Delivery overview metrics",
  "Team workload and allocation",
  "At-risk and blocked projects",
  "Go-live schedule",
  "Overdue tasks across delivery",
] as const;

/** Progress checklist on each Implementation Record (customer-facing + ops). */
export const DELIVERY_PROGRESS_MILESTONES = [
  { id: "discovery", title: "Discovery" },
  { id: "agreement", title: "Agreement" },
  { id: "business_profile", title: "Business Profile" },
  { id: "team", title: "Team" },
  { id: "data_migration", title: "Data Migration" },
  { id: "connectors", title: "Connectors" },
  { id: "crm_configuration", title: "CRM Configuration" },
  { id: "automation", title: "Automation" },
  { id: "business_brain", title: "AI / Business Brain" },
  { id: "training", title: "Training" },
  { id: "qa", title: "QA" },
  { id: "go_live", title: "Go-Live" },
] as const;

export const ACCEPT_CUSTOMER_WORKFLOW = [
  "Accept Customer",
  "Create Organisation",
  "Create Implementation Project",
  "Assign Delivery Lead",
  "Create standard onboarding milestones",
  "Create tasks",
  "Invite Delivery Partner",
  "Invite Customer",
  "Track progress",
] as const;

export const STAFF_PARTNERS_NAV = {
  resellers: {
    label: "Resellers",
    routes: [
      { path: "/command/partners", label: "Reseller Dashboard" },
      { path: "/command/partners/resellers", label: "Reseller Pipeline" },
      { path: "/command/partners/briefing", label: "Briefing" },
      { path: "/command/partners/ecosystem", label: "Ecosystem" },
    ],
    primaryHref: "/command/partners",
  },
  referrals: {
    label: "Referrals",
    routes: [
      { path: "/command/referrals", label: "All Referrals" },
      { path: "/command/referrals/pending", label: "Pending" },
      { path: "/command/referrals/converted", label: "Converted" },
    ],
    primaryHref: "/command/referrals",
  },
  commissions: {
    label: "Commissions",
    routes: [
      { path: "/command/commissions", label: "Overview" },
      { path: "/command/commissions/pending", label: "Pending" },
      { path: "/command/commissions/approved", label: "Approved" },
      { path: "/command/commissions/paid", label: "Paid" },
    ],
    primaryHref: "/command/commissions",
  },
  delivery: {
    label: "Delivery",
    routes: [
      { path: "/command/delivery", label: "Dashboard" },
      { path: "/command/delivery/onboarding", label: "Onboarding" },
      { path: "/command/delivery/invitations", label: "Invitations" },
      { path: "/command/delivery/projects", label: "Projects" },
      { path: "/command/delivery/tasks", label: "Tasks" },
      { path: "/command/delivery/customers", label: "Customers" },
      { path: "/command/delivery/plans", label: "Implementation Plans" },
      { path: "/command/delivery/training", label: "Training" },
      { path: "/command/delivery/qa", label: "QA & Go-Live" },
      { path: "/command/delivery/team", label: "Team" },
      { path: "/command/delivery/activity", label: "Activity" },
      { path: "/command/delivery/documents", label: "Documents" },
      { path: "/command/delivery/reports", label: "Reports" },
    ],
    primaryHref: "/command/delivery",
  },
} as const;

export const RESELLER_PARTNER_NAV = {
  resellers: {
    label: "Resellers",
    routes: [
      { path: "/partner/dashboard", label: "Reseller Dashboard" },
      { path: "/partner/referrals", label: "Referrals" },
      { path: "/partner/commissions", label: "Commissions" },
      { path: "/partner/playbook", label: "Playbook" },
    ],
    primaryHref: "/partner/dashboard",
  },
  referrals: {
    label: "Referrals",
    routes: [
      { path: "/partner/referrals", label: "All Referrals" },
      { path: "/partner/referrals?status=pending", label: "Pending" },
      { path: "/partner/referrals?status=converted", label: "Converted" },
    ],
    primaryHref: "/partner/referrals",
  },
  commissions: {
    label: "Commissions",
    routes: [
      { path: "/partner/commissions", label: "Overview" },
    ],
    primaryHref: "/partner/commissions",
  },
} as const;

export const DELIVERY_PARTNER_NAV = {
  delivery: {
    label: "Delivery",
    routes: [
      { path: "/partner/delivery", label: "Dashboard" },
      { path: "/partner/delivery/onboarding", label: "Onboarding" },
      { path: "/partner/delivery/projects", label: "Projects" },
      { path: "/partner/delivery/tasks", label: "Tasks" },
      { path: "/partner/delivery/customers", label: "Customers" },
      { path: "/partner/delivery/plans", label: "Implementation Plans" },
      { path: "/partner/delivery/training", label: "Training" },
      { path: "/partner/delivery/qa", label: "QA & Go-Live" },
      { path: "/partner/delivery/activity", label: "Activity" },
      { path: "/partner/delivery/documents", label: "Documents" },
      { path: "/partner/delivery/reports", label: "Reports" },
    ],
    primaryHref: "/partner/delivery",
  },
} as const;

export const IMPLEMENTATION_PLANS = ["launch", "growth", "enterprise"] as const;
export type ImplementationPlan = (typeof IMPLEMENTATION_PLANS)[number];

export const IMPLEMENTATION_PLAN_LABELS: Record<ImplementationPlan, string> = {
  launch: "Launch",
  growth: "Growth",
  enterprise: "Enterprise",
};
