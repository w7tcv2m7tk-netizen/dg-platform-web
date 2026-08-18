import Link from "next/link";
import { COMMAND_CENTRE_ROUTES } from "@dg/platform-core";

const NAV = [
  { href: COMMAND_CENTRE_ROUTES.overview, label: "Priorities", id: "overview" },
  { href: COMMAND_CENTRE_ROUTES.salesWeek, label: "Sales week", id: "sales" },
  { href: COMMAND_CENTRE_ROUTES.gate1, label: "Gate 1", id: "gate1" },
  { href: COMMAND_CENTRE_ROUTES.opportunities, label: "Opportunities", id: "opportunities" },
  { href: COMMAND_CENTRE_ROUTES.growthEngine, label: "Prospecting", id: "growth" },
  { href: COMMAND_CENTRE_ROUTES.advisor, label: "Recommended Actions", id: "advisor" },
  { href: COMMAND_CENTRE_ROUTES.platformHealth, label: "Alerts", id: "health" },
  { href: COMMAND_CENTRE_ROUTES.clients, label: "Clients", id: "clients" },
  { href: COMMAND_CENTRE_ROUTES.reports, label: "Reports", id: "reports" },
  { href: COMMAND_CENTRE_ROUTES.benchmarks, label: "Benchmarks", id: "benchmarks" },
  { href: COMMAND_CENTRE_ROUTES.revenue, label: "Revenue", id: "revenue" },
  { href: COMMAND_CENTRE_ROUTES.flags, label: "Flags", id: "flags" },
  { href: COMMAND_CENTRE_ROUTES.docs, label: "Platform docs", id: "docs" },
  {
    href: COMMAND_CENTRE_ROUTES.intelligence,
    label: "Intelligence",
    id: "intelligence",
  },
] as const;

export function CommandCentreNav({ active }: { active: (typeof NAV)[number]["id"] }) {
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
