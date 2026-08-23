export type OperatorMetric = {
  label: string;
  value: string | number;
  tone?: "default" | "sky" | "amber" | "emerald";
};

const VALUE_TONE: Record<NonNullable<OperatorMetric["tone"]>, string> = {
  default: "text-white",
  sky: "text-sky-300",
  amber: "text-amber-300",
  emerald: "text-emerald-300",
};

export function OperatorMetricStrip({
  metrics,
  columnsClassName = "sm:grid-cols-2 lg:grid-cols-4",
}: {
  metrics: OperatorMetric[];
  columnsClassName?: string;
}) {
  if (metrics.length === 0) return null;
  return (
    <div className={`grid gap-3 ${columnsClassName}`}>
      {metrics.map((m) => (
        <div
          key={m.label}
          className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4"
        >
          <p className="text-xs uppercase tracking-wide text-slate-500">{m.label}</p>
          <p
            className={`mt-1 text-3xl font-semibold tabular-nums ${VALUE_TONE[m.tone ?? "default"]}`}
          >
            {m.value}
          </p>
        </div>
      ))}
    </div>
  );
}
