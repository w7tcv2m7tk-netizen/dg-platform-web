import Link from "next/link";

import type { BusinessAppNavLink } from "@/lib/business-app-scaffolds";

export function BusinessAppSubnav({
  links,
  active,
}: {
  links: readonly BusinessAppNavLink[];
  active: string;
}) {
  return (
    <nav className="mt-4 flex flex-wrap gap-2" aria-label="App sections">
      {links.map((link) => {
        const isActive = link.href === active;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              isActive
                ? "rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white"
                : "rounded-lg border border-slate-800 px-3 py-1.5 text-sm text-slate-400 hover:border-slate-700 hover:text-slate-200"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
