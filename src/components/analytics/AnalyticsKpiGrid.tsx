import Link from "next/link";

export type AnalyticsKpi = {
  id: string;
  label: string;
  value: string;
  href?: string;
  hint?: string;
};

export function AnalyticsKpiGrid({ items }: { items: AnalyticsKpi[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((kpi) => {
        const inner = (
          <>
            <p className="text-xs text-slate-500">{kpi.label}</p>
            <p className="mt-1 text-xl font-bold text-white">{kpi.value}</p>
            {kpi.hint ? <p className="mt-1 text-xs text-slate-500">{kpi.hint}</p> : null}
          </>
        );

        return (
          <div
            key={kpi.id}
            className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"
          >
            {kpi.href ? (
              <Link href={kpi.href} className="block hover:opacity-90">
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
