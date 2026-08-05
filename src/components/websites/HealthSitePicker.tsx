"use client";

import { useRouter, useSearchParams } from "next/navigation";

import type { WpHealthSite } from "@/lib/dg-api";

export function HealthSitePicker({ sites }: { sites: WpHealthSite[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("site") ?? sites[0]?.id ?? "default";

  if (sites.length <= 1) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="text-xs uppercase tracking-wide text-slate-500">Site</span>
      <select
        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-white"
        value={current}
        onChange={(e) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("site", e.target.value);
          router.push(`?${params.toString()}`);
        }}
      >
        {sites.map((site) => (
          <option key={site.id} value={site.id}>
            {site.label}
          </option>
        ))}
      </select>
    </div>
  );
}
