import Link from "next/link";

export function FinanceNav({
  active,
}: {
  active: "overview" | "pipeline" | "clients" | "applications";
}) {
  const items = [
    { id: "overview" as const, href: "/apps/finance", label: "Overview" },
    { id: "pipeline" as const, href: "/apps/finance/pipeline", label: "Pipeline" },
    { id: "clients" as const, href: "/apps/finance/clients", label: "Clients" },
    {
      id: "applications" as const,
      href: "/apps/finance/applications",
      label: "Applications",
    },
  ];

  return (
    <nav className="flex flex-wrap gap-2 border-b border-slate-800 pb-4" aria-label="Finance">
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
            active === item.id
              ? "bg-sky-600 text-white"
              : "border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
