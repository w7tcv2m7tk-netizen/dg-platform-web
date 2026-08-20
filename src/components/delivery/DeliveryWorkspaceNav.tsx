import Link from "next/link";

const STAFF_NAV = [
  { href: "/command/delivery", label: "Dashboard", id: "dashboard" },
  { href: "/command/delivery/invitations", label: "Invitations", id: "invitations" },
  { href: "/command/delivery/onboarding", label: "Onboarding", id: "onboarding" },
  { href: "/command/delivery/projects", label: "Active Projects", id: "projects" },
  { href: "/command/delivery/tasks", label: "My Tasks", id: "tasks" },
  { href: "/command/delivery/customers", label: "Customers", id: "customers" },
  { href: "/command/delivery/plans", label: "Implementation Plans", id: "plans" },
  { href: "/command/delivery/team", label: "Team", id: "team" },
  { href: "/command/delivery/activity", label: "Activity", id: "activity" },
  { href: "/command/delivery/documents", label: "Documents", id: "documents" },
  { href: "/command/delivery/training", label: "Training", id: "training" },
  { href: "/command/delivery/qa", label: "QA & Go-Live", id: "qa" },
  { href: "/command/delivery/reports", label: "Reports", id: "reports" },
] as const;

const PARTNER_NAV = [
  { href: "/partner/delivery", label: "Dashboard", id: "dashboard" },
  { href: "/partner/delivery/onboarding", label: "Onboarding", id: "onboarding" },
  { href: "/partner/delivery/projects", label: "Active Projects", id: "projects" },
  { href: "/partner/delivery/tasks", label: "My Tasks", id: "tasks" },
  { href: "/partner/delivery/customers", label: "Customers", id: "customers" },
  { href: "/partner/delivery/plans", label: "Implementation Plans", id: "plans" },
  { href: "/partner/delivery/activity", label: "Activity", id: "activity" },
  { href: "/partner/delivery/documents", label: "Documents", id: "documents" },
  { href: "/partner/delivery/training", label: "Training", id: "training" },
  { href: "/partner/delivery/qa", label: "QA & Go-Live", id: "qa" },
  { href: "/partner/delivery/reports", label: "Reports", id: "reports" },
] as const;

type NavId = (typeof STAFF_NAV)[number]["id"];

export function DeliveryWorkspaceNav({
  active,
  scope,
}: {
  active: NavId;
  scope: "staff" | "partner";
}) {
  const nav = scope === "staff" ? STAFF_NAV : PARTNER_NAV;
  return (
    <nav className="flex flex-wrap gap-2 border-b border-slate-800 pb-4" aria-label="Delivery">
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
