import Link from "next/link";

import {
  ACQUISITION_PORTAL_HREF,
  ACQUISITION_PORTAL_ROUTES,
  DELIVERY_PARTNER_PORTAL_HREF,
  DELIVERY_PARTNER_PORTAL_ROUTES,
} from "@dg/platform-core";

/**
 * Delivery primary nav — ops pillar order (not Partners → Delivery Partners).
 * Public URLs: /delivery (not /partner/delivery).
 */
const STAFF_NAV = [
  { href: "/command/delivery", label: "Dashboard", id: "dashboard" },
  { href: "/command/delivery/onboarding", label: "Onboarding", id: "onboarding" },
  { href: "/command/delivery/invitations", label: "Invitations", id: "invitations" },
  { href: "/command/delivery/projects", label: "Projects", id: "projects" },
  { href: "/command/delivery/tasks", label: "Tasks", id: "tasks" },
  { href: "/command/delivery/customers", label: "Customers", id: "customers" },
  { href: "/command/delivery/plans", label: "Implementation Plans", id: "plans" },
  { href: "/command/delivery/training", label: "Training", id: "training" },
  { href: "/command/delivery/qa", label: "QA & Go-Live", id: "qa" },
  { href: "/command/delivery/team", label: "Team", id: "team" },
  { href: "/command/delivery/activity", label: "Activity", id: "activity" },
  { href: "/command/delivery/documents", label: "Documents", id: "documents" },
  { href: "/command/delivery/reports", label: "Reports", id: "reports" },
] as const;

const PARTNER_NAV = [
  { href: DELIVERY_PARTNER_PORTAL_HREF, label: "Dashboard", id: "dashboard" },
  { href: DELIVERY_PARTNER_PORTAL_ROUTES.projects, label: "Projects", id: "projects" },
  { href: DELIVERY_PARTNER_PORTAL_ROUTES.tasks, label: "Tasks", id: "tasks" },
  { href: DELIVERY_PARTNER_PORTAL_ROUTES.customers, label: "Customers", id: "customers" },
  { href: DELIVERY_PARTNER_PORTAL_ROUTES.plans, label: "Implementation Plans", id: "plans" },
  { href: DELIVERY_PARTNER_PORTAL_ROUTES.training, label: "Training", id: "training" },
  { href: DELIVERY_PARTNER_PORTAL_ROUTES.qa, label: "QA & Go-Live", id: "qa" },
  { href: DELIVERY_PARTNER_PORTAL_ROUTES.activity, label: "Activity", id: "activity" },
  { href: DELIVERY_PARTNER_PORTAL_ROUTES.documents, label: "Documents", id: "documents" },
  { href: DELIVERY_PARTNER_PORTAL_ROUTES.reports, label: "Reports", id: "reports" },
] as const;

type NavId = (typeof STAFF_NAV)[number]["id"] | (typeof PARTNER_NAV)[number]["id"];

/**
 * @deprecated AppContextNav owns Delivery tabs. Prefer DeliveryCommandPage chrome only for entity detail.
 */
export function DeliveryWorkspaceNav({
  active,
  scope,
}: {
  active: NavId;
  scope: "staff" | "partner";
}) {
  const nav = scope === "staff" ? STAFF_NAV : PARTNER_NAV;
  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-slate-800 pb-4"
      aria-label="Delivery"
    >
      {nav.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
            active === item.id
              ? "bg-emerald-600 text-white"
              : "border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export type DeliveryNavId = NavId;

// Re-export for acquisition portal links in delivery UI copy
export { ACQUISITION_PORTAL_HREF, ACQUISITION_PORTAL_ROUTES };
