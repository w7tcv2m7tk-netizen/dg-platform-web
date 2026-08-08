import Link from "next/link";
import { GROWTH_ENGINE_ROUTES } from "@dg/platform-core";

const MODULES = [
  {
    href: GROWTH_ENGINE_ROUTES.discovery,
    title: "Business Discovery",
    description: "Add and filter prospect businesses by industry and location",
    status: "Live",
  },
  {
    href: GROWTH_ENGINE_ROUTES.pipeline,
    title: "Prospect Pipeline",
    description: "Kanban board from audit through to client conversion",
    status: "Live",
  },
  {
    href: GROWTH_ENGINE_ROUTES.audits,
    title: "AI Audit Engine™",
    description: "Live website presence probes with Business Health scores",
    status: "Live",
  },
  {
    href: GROWTH_ENGINE_ROUTES.reports,
    title: "Opportunity Reports",
    description: "Executive summaries generated from the latest audit",
    status: "Live",
  },
  {
    href: GROWTH_ENGINE_ROUTES.followUps,
    title: "Smart Follow-Up",
    description: "Idle-prospect queue from real pipeline timestamps",
    status: "Live",
  },
  {
    href: GROWTH_ENGINE_ROUTES.proposals,
    title: "Proposal Generator",
    description: "Audit-based service briefings (Commerce quotes next)",
    status: "Live",
  },
  {
    href: GROWTH_ENGINE_ROUTES.conversions,
    title: "Conversion Dashboard",
    description: "Audits, open rates, meetings, wins — real funnel counts",
    status: "Live",
  },
] as const;

export function GrowthEngineNav({ active }: { active?: string }) {
  return (
    <nav className="flex flex-wrap gap-2 border-b border-slate-800 pb-4" aria-label="Growth Engine">
      <Link
        href={GROWTH_ENGINE_ROUTES.hub}
        className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
          active === "hub"
            ? "bg-sky-600 text-white"
            : "border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white"
        }`}
      >
        Hub
      </Link>
      {MODULES.map((mod) => (
        <Link
          key={mod.href}
          href={mod.href}
          className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
            active === mod.href
              ? "bg-sky-600 text-white"
              : "border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white"
          }`}
        >
          {mod.title}
        </Link>
      ))}
    </nav>
  );
}

export function GrowthEngineModuleGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {MODULES.map((mod) => (
        <Link
          key={mod.href}
          href={mod.href}
          className="block rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-4 transition-colors hover:border-sky-500/40"
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-white">{mod.title}</h3>
            <span className="shrink-0 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-400">
              {mod.status}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-400">{mod.description}</p>
        </Link>
      ))}
    </div>
  );
}
