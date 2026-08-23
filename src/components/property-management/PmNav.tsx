import Link from "next/link";

export function PmNav({
  active,
}: {
  active:
    | "overview"
    | "properties"
    | "leases"
    | "owners"
    | "tenants"
    | "maintenance";
}) {
  const items = [
    { id: "overview" as const, href: "/apps/property-management", label: "Overview" },
    {
      id: "properties" as const,
      href: "/apps/property-management/properties",
      label: "Properties",
    },
    { id: "leases" as const, href: "/apps/property-management/leases", label: "Leases" },
    { id: "owners" as const, href: "/apps/property-management/owners", label: "Owners" },
    { id: "tenants" as const, href: "/apps/property-management/tenants", label: "Tenants" },
    {
      id: "maintenance" as const,
      href: "/apps/property-management/maintenance",
      label: "Maintenance",
    },
  ];

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-slate-800 pb-4"
      aria-label="Property Management"
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
