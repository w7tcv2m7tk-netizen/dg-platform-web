import Link from "next/link";

export function WebsitesSubnav({ active }: { active: string }) {
  const items = [
    { href: "/apps/websites", id: "sites", label: "Sites" },
    { href: "/apps/websites/health", id: "health", label: "Health" },
    { href: "/apps/websites/domains", id: "domains", label: "Domains" },
    { href: "/apps/websites/hosting", id: "hosting", label: "Hosting" },
    { href: "/apps/websites/content", id: "content", label: "Content" },
    { href: "/apps/websites/funnels", id: "funnels", label: "Funnels" },
  ];

  return (
    <nav className="flex flex-wrap gap-2 mb-6">
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className={`rounded-md px-3 py-1.5 text-sm ${
            active === item.id
              ? "bg-slate-800 text-white"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
