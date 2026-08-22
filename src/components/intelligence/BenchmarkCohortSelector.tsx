"use client";

import { useRouter, useSearchParams } from "next/navigation";

import type { BenchmarkCohortId, BusinessBenchmarksBundle } from "@dg/platform-core";

export function BenchmarkCohortSelector({
  options,
  selectedId,
}: {
  options: BusinessBenchmarksBundle["cohortOptions"];
  selectedId: BenchmarkCohortId;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function selectCohort(id: BenchmarkCohortId) {
    const params = new URLSearchParams(searchParams.toString());
    if (id === "similar") {
      params.delete("group");
    } else {
      params.set("group", id);
    }
    const query = params.toString();
    router.replace(query ? `/dashboard/benchmarks?${query}` : "/dashboard/benchmarks");
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-slate-500">
          Compare me
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Choose who you want to benchmark against.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = option.id === selectedId;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => selectCohort(option.id)}
              className={`rounded-full border px-3 py-1.5 text-left text-sm transition ${
                active
                  ? "border-sky-500/60 bg-sky-500/10 text-sky-100"
                  : "border-slate-700 bg-slate-950/40 text-slate-300 hover:border-slate-500 hover:text-white"
              }`}
              aria-pressed={active}
            >
              <span className="font-medium">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
