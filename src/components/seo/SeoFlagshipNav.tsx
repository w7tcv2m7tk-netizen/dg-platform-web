"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/apps/seo", label: "Overview" },
  { href: "/apps/seo/audit", label: "Audit" },
  { href: "/apps/seo/trends", label: "Trends" },
  { href: "/apps/seo/opportunities", label: "Opportunities" },
  { href: "/apps/seo/monitoring", label: "Monitoring" },
] as const;

export function SeoFlagshipNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="SEO" className="border-b border-slate-800 bg-slate-950/70 px-4 py-3 backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-wrap gap-2">
        {LINKS.map((link) => {
          const active =
            link.href === "/apps/seo"
              ? pathname === link.href
              : pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white"
                  : "rounded-lg border border-slate-800 px-3 py-1.5 text-sm text-slate-400 hover:border-slate-700 hover:text-slate-200"
              }
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
