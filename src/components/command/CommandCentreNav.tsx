import Link from "next/link";
import { COMMAND_CENTRE_ROUTES } from "@dg/platform-core";

const NAV = [
  { href: COMMAND_CENTRE_ROUTES.overview, label: "Priorities", id: "overview" },
  { href: COMMAND_CENTRE_ROUTES.advisor, label: "AI Advisor", id: "advisor" },
  { href: COMMAND_CENTRE_ROUTES.platformHealth, label: "Platform Alerts", id: "health" },
  { href: COMMAND_CENTRE_ROUTES.salesWeek, label: "Sales Week", id: "sales" },
  { href: COMMAND_CENTRE_ROUTES.founding, label: "Founding 10", id: "founding" },
] as const;

export type CommandCentreNavId =
  | (typeof NAV)[number]["id"]
  | "partners"
  | "gate1"
  | "opportunities"
  | "growth"
  | "clients"
  | "reports"
  | "benchmarks"
  | "revenue"
  | "flags"
  | "docs"
  | "intelligence";

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
