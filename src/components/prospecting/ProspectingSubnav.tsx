"use client";

import Link from "next/link";

const LINKS = [
  { href: "/apps/prospecting", label: "Overview" },
  { href: "/apps/prospecting/prospects", label: "Prospects" },
  { href: "/apps/prospecting/discovery", label: "Discovery" },
  { href: "/apps/prospecting/pipeline", label: "Pipeline" },
  { href: "/apps/prospecting/activity", label: "Activity" },
  { href: "/apps/prospecting/scores", label: "Scores" },
] as const;

export function ProspectingSubnav({ active }: { active: string }) {
  return (
    <nav className="mt-4 flex flex-wrap gap-2">
      {LINKS.map((link) => {
        const isActive = active === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              isActive
                ? "rounded-lg bg-sky-600/20 px-3 py-1.5 text-sm font-medium text-sky-300"
                : "rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
