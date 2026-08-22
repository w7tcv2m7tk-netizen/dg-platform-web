import Link from "next/link";

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

export function ProductOverviewDashboard() {
  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm text-slate-400">
        Product operating view for DigitalGate — flags, roadmap, releases and feedback across the
        platform ecosystem.
      </p>
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
