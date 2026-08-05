import Link from "next/link";
import { GROWTH_ENGINE_ROUTES } from "@dg/platform-core";

const MODULES = [
  {
    href: GROWTH_ENGINE_ROUTES.discovery,
    title: "Business Discovery",
    description: "Add and search prospect businesses by industry and location",
    status: "Live",
  },
  {
    href: GROWTH_ENGINE_ROUTES.pipeline,
    title: "Prospect Pipeline",
    description: "Track every prospect from audit through to client conversion",
    status: "Live",
  },
  {
    href: GROWTH_ENGINE_ROUTES.audits,
    title: "AI Audit Engine™",
    description: "Automated website, SEO, AI Visibility, and GBP analysis",
    status: "Coming soon",
  },
  {
    href: GROWTH_ENGINE_ROUTES.reports,
    title: "Opportunity Reports",
    description: "Branded interactive audit reports for prospects",
    status: "Coming soon",
  },
  {
    href: GROWTH_ENGINE_ROUTES.followUps,
    title: "Smart Follow-Up",
    description: "Engagement-triggered reminders and tasks",
    status: "Coming soon",
  },
  {
    href: GROWTH_ENGINE_ROUTES.proposals,
    title: "Proposal Generator",
    description: "AI proposals with services, pricing, and ROI",
    status: "Coming soon",
  },
  {
    href: GROWTH_ENGINE_ROUTES.conversions,
    title: "Conversion Dashboard",
    description: "Audits, open rates, meetings, MRR won, forecast",
    status: "Coming soon",
  },
];

export function GrowthEngineNav({ active }: { active?: string }) {
  return (
    <nav className="flex flex-wrap gap-2 border-b border-slate-800 pb-4">
      <Link
        href={GROWTH_ENGINE_ROUTES.hub}
        className={`rounded-full px-3 py-1 text-sm ${
          active === "hub"
            ? "bg-blue-600 text-white"
            : "border border-slate-700 text-slate-300 hover:border-slate-500"
        }`}
      >
        Hub
      </Link>
      {MODULES.map((mod) => (
        <Link
          key={mod.href}
          href={mod.href}
          className={`rounded-full px-3 py-1 text-sm ${
            active === mod.href
              ? "bg-blue-600 text-white"
              : "border border-slate-700 text-slate-300 hover:border-slate-500"
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
          className="dg-card block transition hover:border-slate-600"
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-white">{mod.title}</h3>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                mod.status === "Live"
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-slate-800 text-slate-500"
              }`}
            >
              {mod.status}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-400">{mod.description}</p>
        </Link>
      ))}
    </div>
  );
}
