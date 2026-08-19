import Link from "next/link";

export function WebsitesSubnav({ active }: { active: string }) {
  const items = [
    { href: "/apps/websites", id: "websites", label: "Websites" },
    { href: "/apps/websites/funnels", id: "funnels", label: "Funnels" },
    { href: "/apps/websites/logo", id: "logo", label: "Logos" },
    { href: "/apps/websites/content", id: "content", label: "Content" },
    { href: "/apps/websites/health", id: "health", label: "Health Centre" },
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
