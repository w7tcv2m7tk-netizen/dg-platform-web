import Link from "next/link";

export function CommercialNav({
  active,
}: {
  active: "overview" | "properties" | "leases" | "tenants";
}) {
  const items = [
    { id: "overview" as const, href: "/apps/commercial", label: "Overview" },
    { id: "properties" as const, href: "/apps/commercial/properties", label: "Properties" },
    { id: "leases" as const, href: "/apps/commercial/leases", label: "Leases" },
    { id: "tenants" as const, href: "/apps/commercial/tenants", label: "Tenants" },
  ];

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-slate-800 pb-4"
      aria-label="Commercial Property"
    >
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
