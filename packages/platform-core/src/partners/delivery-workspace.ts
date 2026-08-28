/**
 * DigitalGate Delivery workspace — role-based partner workspace (not a CRM menu).
 * Delivery encompasses onboarding, migrations, configuration, training, QA, go-live and Customer Success.
 * Pipeline stages: DigitalGate Implementation Lifecycle™ — see delivery-model.ts.
 */

import { IMPLEMENTATION_SOP_STAGES } from "./delivery-model";
import {
  ACQUISITION_PORTAL_HREF,
  ACQUISITION_PORTAL_ROUTES,
  DELIVERY_PARTNER_PORTAL_HREF,
  DELIVERY_PARTNER_PORTAL_ROUTES,
} from "./portal-routes";

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

/**
 * Progress checklist on each Implementation Project — same 16 stages as
 * DigitalGate Implementation Lifecycle™ (`IMPLEMENTATION_SOP_STAGES`).
 * Do not maintain a shorter parallel list.
 */
export const DELIVERY_PROGRESS_MILESTONES = IMPLEMENTATION_SOP_STAGES.map((stage) => ({
  id: stage.id,
  title: `${stage.n} ${stage.title}`,
  n: stage.n,
  body: stage.body,
}));

export const ACCEPT_CUSTOMER_WORKFLOW = [
  "Accept Customer",
  "Create Organisation",
  "Create Implementation Project",
  "Assign Delivery Lead",
  "Create standard implementation milestones",
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
      { path: "/command/delivery/projects", label: "Projects" },
      { path: "/command/delivery/tasks", label: "Tasks" },
      { path: "/command/delivery/customers", label: "Customers" },
      { path: "/command/delivery/plans", label: "Implementation Plans" },
      { path: "/command/delivery/training", label: "Training" },
      { path: "/command/delivery/invitations", label: "Invitations" },
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
      { path: ACQUISITION_PORTAL_HREF, label: "Reseller Dashboard" },
      { path: ACQUISITION_PORTAL_ROUTES.referrals, label: "Referrals" },
      { path: ACQUISITION_PORTAL_ROUTES.commissions, label: "Commissions" },
      { path: ACQUISITION_PORTAL_ROUTES.playbook, label: "Playbook" },
    ],
    primaryHref: ACQUISITION_PORTAL_HREF,
  },
  referrals: {
    label: "Referrals",
    routes: [
      { path: ACQUISITION_PORTAL_ROUTES.referrals, label: "All Referrals" },
      { path: `${ACQUISITION_PORTAL_ROUTES.referrals}?status=pending`, label: "Pending" },
      { path: `${ACQUISITION_PORTAL_ROUTES.referrals}?status=converted`, label: "Converted" },
    ],
    primaryHref: ACQUISITION_PORTAL_ROUTES.referrals,
  },
  commissions: {
    label: "Commissions",
    routes: [
      { path: ACQUISITION_PORTAL_ROUTES.commissions, label: "Overview" },
    ],
    primaryHref: ACQUISITION_PORTAL_ROUTES.commissions,
  },
} as const;

export const DELIVERY_PARTNER_NAV = {
  delivery: {
    label: "Delivery",
    routes: [
      { path: DELIVERY_PARTNER_PORTAL_HREF, label: "Dashboard" },
      { path: DELIVERY_PARTNER_PORTAL_ROUTES.projects, label: "Projects" },
      { path: DELIVERY_PARTNER_PORTAL_ROUTES.tasks, label: "Tasks" },
      { path: DELIVERY_PARTNER_PORTAL_ROUTES.customers, label: "Customers" },
      { path: DELIVERY_PARTNER_PORTAL_ROUTES.plans, label: "Implementation Plans" },
      { path: DELIVERY_PARTNER_PORTAL_ROUTES.training, label: "Training" },
      { path: DELIVERY_PARTNER_PORTAL_ROUTES.qa, label: "QA & Go-Live" },
      { path: DELIVERY_PARTNER_PORTAL_ROUTES.activity, label: "Activity" },
      { path: DELIVERY_PARTNER_PORTAL_ROUTES.documents, label: "Documents" },
      { path: DELIVERY_PARTNER_PORTAL_ROUTES.reports, label: "Reports" },
    ],
    primaryHref: DELIVERY_PARTNER_PORTAL_HREF,
  },
} as const;

export const IMPLEMENTATION_PLANS = ["launch", "growth", "enterprise"] as const;
export type ImplementationPlan = (typeof IMPLEMENTATION_PLANS)[number];

export const IMPLEMENTATION_PLAN_LABELS: Record<ImplementationPlan, string> = {
  launch: "Launch",
  growth: "Growth",
  enterprise: "Enterprise",
};
