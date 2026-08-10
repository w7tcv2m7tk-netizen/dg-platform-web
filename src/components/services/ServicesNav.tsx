import Link from "next/link";

export function ServicesNav({
  active,
}: {
  active: "overview" | "jobs" | "scheduling";
}) {
  const items = [
    { id: "overview" as const, href: "/apps/services", label: "Overview" },
    { id: "jobs" as const, href: "/apps/services/jobs", label: "Jobs" },
    {
      id: "scheduling" as const,
      href: "/apps/services/scheduling",
      label: "Scheduling",
    },
  ];

  return (
    <nav className="flex flex-wrap gap-2 border-b border-slate-800 pb-4" aria-label="Services">
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
