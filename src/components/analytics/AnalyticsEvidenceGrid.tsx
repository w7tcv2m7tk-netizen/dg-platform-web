import Link from "next/link";

import type { AnalyticsEvidenceMetric } from "@dg/platform-core";

export function AnalyticsEvidenceGrid({ items }: { items: AnalyticsEvidenceMetric[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((metric) => (
        <div
          key={metric.id}
          className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"
        >
          <p className="text-xs text-slate-500">{metric.label}</p>
          {metric.value ? (
            metric.href ? (
              <Link href={metric.href} className="mt-1 block hover:opacity-90">
                <p className="text-3xl font-bold text-white">{metric.value}</p>
              </Link>
            ) : (
              <p className="mt-1 text-3xl font-bold text-white">{metric.value}</p>
            )
          ) : (
            <div className="mt-2 space-y-2">
              <p className="text-2xl font-bold text-slate-600">—</p>
              {metric.unavailableTitle ? (
                <p className="text-xs font-medium text-amber-200/90">{metric.unavailableTitle}</p>
              ) : null}
              {metric.unavailableBody ? (
                <p className="text-xs text-slate-500">{metric.unavailableBody}</p>
              ) : null}
              {metric.connectHref && metric.connectLabel ? (
                <Link href={metric.connectHref} className="text-xs text-sky-400 hover:underline">
                  {metric.connectLabel}
                </Link>
              ) : null}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
