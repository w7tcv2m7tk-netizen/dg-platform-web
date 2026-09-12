import Link from "next/link";

export type DigitalPerformanceSignal = {
  id: "website_operations" | "seo" | "ai_visibility" | "analytics";
  label: string;
  value: string;
  detail: string;
  href: string;
  state: "live" | "stale" | "unavailable";
};

function stateClasses(state: DigitalPerformanceSignal["state"]) {
  if (state === "live") {
    return {
      border: "border-emerald-500/25 hover:border-emerald-400/45",
      badge: "bg-emerald-500/10 text-emerald-300",
      dot: "bg-emerald-400",
      label: "Live",
    };
  }
  if (state === "stale") {
    return {
      border: "border-amber-500/25 hover:border-amber-400/45",
      badge: "bg-amber-500/10 text-amber-300",
      dot: "bg-amber-400",
      label: "Refresh due",
    };
  }
  return {
    border: "border-slate-800 hover:border-slate-600",
    badge: "bg-slate-800/80 text-slate-400",
    dot: "bg-slate-500",
    label: "Not connected",
  };
}

export function DigitalPerformanceStrip({ signals }: { signals: DigitalPerformanceSignal[] }) {
  return (
    <section className="mb-7">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Digital performance
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">Your digital presence, separated by evidence</h2>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-500">
            Website Operations measures platform readiness. SEO and AI Visibility come from a public-site audit matched to this organisation&apos;s website. Analytics only becomes live when a real traffic source is connected.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {signals.map((signal) => {
          const styles = stateClasses(signal.state);
          return (
            <Link
              key={signal.id}
              href={signal.href}
              className={`group rounded-2xl border bg-slate-950/45 px-4 py-4 transition ${styles.border}`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {signal.label}
                </p>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium ${styles.badge}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
                  {styles.label}
                </span>
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-white">{signal.value}</p>
              <p className="mt-2 min-h-10 text-xs leading-relaxed text-slate-500">{signal.detail}</p>
              <p className="mt-3 text-xs font-medium text-sky-400 opacity-80 transition group-hover:opacity-100">
                View details →
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
