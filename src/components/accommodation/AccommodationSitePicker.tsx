"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import type { WpAccommodationSite } from "@/lib/dg-api";

export function AccommodationSitePicker({ sites }: { sites: WpAccommodationSite[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("siteId") ?? sites[0]?.id ?? "";

  if (sites.length <= 1) {
    return sites[0] ? (
      <p className="text-sm text-slate-500">Connected: {sites[0].label}</p>
    ) : null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-slate-500">Site:</span>
      {sites.map((site) => {
        const active = site.id === current;
        const params = new URLSearchParams(searchParams.toString());
        params.set("siteId", site.id);
        return (
          <Link
            key={site.id}
            href={`${pathname}?${params.toString()}`}
            className={`rounded-full px-3 py-1 text-sm ${
              active
                ? "bg-blue-600 text-white"
                : "border border-slate-700 text-slate-300 hover:border-slate-600"
            }`}
          >
            {site.label}
          </Link>
        );
      })}
    </div>
  );
}
