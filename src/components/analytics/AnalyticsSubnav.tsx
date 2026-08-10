import Link from "next/link";

const LINKS = [
  { href: "/apps/analytics", label: "Overview" },
  { href: "/apps/analytics/dashboard", label: "Dashboard" },
  { href: "/apps/analytics/reports", label: "Reports" },
  { href: "/apps/analytics/connectors", label: "Data sources" },
] as const;

export function AnalyticsSubnav({ active }: { active: (typeof LINKS)[number]["href"] }) {
  return (
    <nav className="mt-4 flex flex-wrap gap-2">
      {LINKS.map((link) => {
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
