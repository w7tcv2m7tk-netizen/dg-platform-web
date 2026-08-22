import Link from "next/link";

import type { AnalyticsKeyMetric } from "@dg/platform-core";

export function AnalyticsKeyMetricsGrid({ items }: { items: AnalyticsKeyMetric[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      {items.map((metric) => {
        const inner = (
          <>
            <p className="text-xs text-slate-500">{metric.label}</p>
            <p className="mt-1 text-2xl font-bold text-white">{metric.value}</p>
            <p
              className={
                metric.status === "live"
                  ? "mt-1 text-xs text-emerald-300/90"
                  : metric.status === "insufficient"
                    ? "mt-1 text-xs text-amber-200/80"
                    : "mt-1 text-xs text-slate-500"
              }
            >
              {metric.context}
            </p>
          </>
        );

        return (
          <div
            key={metric.id}
            className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"
          >
            {metric.href ? (
              <Link href={metric.href} className="block hover:opacity-90">
                {inner}
              </Link>
            ) : (
              inner
            )}
          </div>
        );
      })}
    </div>
  );
}
