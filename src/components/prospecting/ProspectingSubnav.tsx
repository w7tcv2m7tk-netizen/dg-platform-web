"use client";

import Link from "next/link";

/** Tenant Growth App sections — Prospecting & Opportunity Engine */
const LINKS = [
  { href: "/apps/prospecting", label: "Overview" },
  { href: "/apps/prospecting/discovery", label: "Discovery" },
  { href: "/apps/prospecting/scores", label: "Opportunities" },
  { href: "/apps/prospecting/pipeline", label: "Pipeline" },
  { href: "/apps/prospecting/activity", label: "Activity" },
] as const;

export function ProspectingSubnav({ active }: { active: string }) {
  return (
    <nav className="mt-4 flex flex-wrap gap-2" aria-label="Prospecting & Opportunity Engine">
      {LINKS.map((link) => {
        const isActive =
          active === link.href ||
          (link.href !== "/apps/prospecting" && active.startsWith(link.href));
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
