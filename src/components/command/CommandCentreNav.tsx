import Link from "next/link";
import { COMMAND_CENTRE_ROUTES } from "@dg/platform-core";

const NAV = [
  { href: COMMAND_CENTRE_ROUTES.overview, label: "Ops home", id: "overview" },
  { href: COMMAND_CENTRE_ROUTES.clients, label: "Clients", id: "clients" },
  { href: COMMAND_CENTRE_ROUTES.advisor, label: "AI Advisor", id: "advisor" },
  { href: COMMAND_CENTRE_ROUTES.reports, label: "Reports", id: "reports" },
  {
    href: COMMAND_CENTRE_ROUTES.opportunities,
    label: "Expansion",
    id: "opportunities",
  },
  { href: COMMAND_CENTRE_ROUTES.benchmarks, label: "Benchmarks", id: "benchmarks" },
  { href: COMMAND_CENTRE_ROUTES.growthEngine, label: "Growth Engine", id: "growth" },
  { href: COMMAND_CENTRE_ROUTES.platformHealth, label: "Health", id: "health" },
  { href: COMMAND_CENTRE_ROUTES.revenue, label: "Revenue", id: "revenue" },
  { href: COMMAND_CENTRE_ROUTES.flags, label: "Flags", id: "flags" },
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
