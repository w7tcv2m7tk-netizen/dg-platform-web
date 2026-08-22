import Link from "next/link";

import type { AnalyticsTrendPoint } from "@dg/platform-core";

export function AnalyticsTrendChart({
  points,
  note,
}: {
  points: AnalyticsTrendPoint[];
  note: string;
}) {
  const values = points.map((point) => point.value ?? 0);
  const hasData = points.some((point) => point.value != null);
  const max = Math.max(...values, 1);
  const h = 96;

  return (
    <div>
      <div className="flex items-end gap-2" aria-hidden>
        {points.map((point) => {
          const value = point.value ?? 0;
          const height = hasData && point.value != null ? Math.max(8, (value / max) * (h - 16)) : 8;
          return (
            <div key={point.label} className="flex flex-1 flex-col items-center gap-2">
              <div
                className={
                  point.value != null
                    ? "w-full rounded-t bg-sky-500/80"
                    : "w-full rounded-t bg-slate-800"
                }
                style={{ height }}
              />
              <span className="text-[10px] text-slate-500">{point.label}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-slate-500">{note}</p>
      <Link href="/apps/crm/leads" className="mt-2 inline-block text-xs text-sky-400 hover:underline">
        Inspect leads →
      </Link>
    </div>
  );
}
