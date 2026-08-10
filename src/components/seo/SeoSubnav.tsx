import Link from "next/link";

const LINKS = [
  { href: "/apps/seo", label: "Overview" },
  { href: "/apps/seo/audit", label: "Audit" },
] as const;

export function SeoSubnav({ active }: { active: (typeof LINKS)[number]["href"] }) {
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
