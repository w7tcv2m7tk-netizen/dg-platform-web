import Link from "next/link";
import { getCommandFeatureFlagsOverview } from "@dg/platform-core";

const LINKS = [
  {
    href: "/command/flags",
    title: "Feature flags",
    description: "Cross-tenant rollout controls and beta programme toggles.",
  },
  {
    href: "/dashboard/settings/roadmap",
    title: "Roadmap",
    description: "Platform priorities, milestones and planned capability releases.",
  },
  {
    href: "/command/product/releases",
    title: "Releases",
    description: "Release notes, rollout status and customer communication.",
  },
  {
    href: "/support",
    title: "Feedback",
    description: "Customer and operator product feedback requiring triage.",
  },
] as const;

export async function ProductOverviewDashboard() {
  const flags = process.env.DATABASE_URL
    ? await getCommandFeatureFlagsOverview()
    : null;
  const orgCount = flags?.orgs.length ?? 0;
  const orgsWithFlags =
    flags?.orgs.filter((o) => o.enabledCount > 0).length ?? 0;
  const knownFlags = flags?.known.length ?? 0;

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm text-slate-400">
        Product operating view for DigitalGate — flags, roadmap, releases and feedback across the
        platform ecosystem.
      </p>
      {flags ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Known flags</p>
            <p className="mt-1 text-3xl font-semibold text-white">{knownFlags}</p>
          </div>
          <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Orgs surveyed</p>
            <p className="mt-1 text-3xl font-semibold text-sky-300">{orgCount}</p>
          </div>
          <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Orgs with any flag</p>
            <p className="mt-1 text-3xl font-semibold text-white">{orgsWithFlags}</p>
          </div>
        </div>
      ) : null}
      <ul className="grid gap-3 sm:grid-cols-2">
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="block rounded-xl border border-slate-700/80 bg-slate-950/50 px-5 py-4 transition hover:border-sky-500/30"
            >
              <p className="font-medium text-white">{link.title}</p>
              <p className="mt-1 text-sm text-slate-400">{link.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
