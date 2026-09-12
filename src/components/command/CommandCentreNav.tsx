import Link from "next/link";

/**
 * @deprecated AppContextNav owns Command Centre navigation. Kept for compatibility
 * with any older operator surfaces that still mount this component.
 */
const NAV = [
  { href: "/command", label: "Command", id: "overview" },
  { href: "/command/clients", label: "Customers", id: "clients" },
  { href: "/command/partners", label: "Partners", id: "partners" },
  { href: "/support", label: "Support", id: "support" },
  { href: "/command/delivery", label: "Delivery", id: "delivery" },
  { href: "/command/revenue", label: "Commercial", id: "commercial" },
  { href: "/command/platform-health", label: "Platform", id: "health" },
  { href: "/command/intelligence", label: "Intelligence", id: "intelligence" },
] as const;

export type CommandCentreNavId =
  | (typeof NAV)[number]["id"]
  | "sales"
  | "founding"
  | "gate1"
  | "opportunities"
  | "growth"
  | "reports"
  | "benchmarks"
  | "revenue"
  | "flags"
  | "docs";

export function CommandCentreNav({ active }: { active: CommandCentreNavId }) {
  return (
    <nav className="flex flex-wrap gap-2 border-b border-slate-800 pb-4" aria-label="Command Centre">
      {NAV.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
            active === item.id
              ? "bg-sky-600 text-white"
              : "border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
