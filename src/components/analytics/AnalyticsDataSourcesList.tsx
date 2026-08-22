import Link from "next/link";

import type { AnalyticsDataSource } from "@dg/platform-core";

function statusTone(status: AnalyticsDataSource["status"]) {
  if (status === "connected") return "text-emerald-300";
  if (status === "partial") return "text-amber-300";
  return "text-slate-500";
}

function statusIcon(status: AnalyticsDataSource["status"]) {
  if (status === "connected") return "🟢";
  if (status === "partial") return "🟡";
  return "⚪";
}

export function AnalyticsDataSourcesList({
  sources,
  connectedCount,
}: {
  sources: AnalyticsDataSource[];
  connectedCount: number;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 px-4 py-3 text-sm text-sky-100/90">
        <p className="font-medium">{connectedCount} connected source{connectedCount === 1 ? "" : "s"}</p>
        <p className="mt-1 text-sky-100/70">
          DigitalGate combines connected business data to provide a more complete view of your
          business.
        </p>
      </div>

      <ul className="space-y-3">
        {sources.map((source) => (
          <li
            key={source.id}
            className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-white">
                  {source.label}{" "}
                  <span className="text-sm font-normal text-slate-500">
                    {statusIcon(source.status)} {source.statusLabel}
                  </span>
                </p>
                <p className={`mt-1 text-xs ${statusTone(source.status)}`}>{source.updatedLabel}</p>
              </div>
            </div>
            <p className="mt-2 text-sm text-slate-400">{source.detail}</p>
            {source.href ? (
              <Link href={source.href} className="mt-2 inline-block text-sm text-sky-400 hover:underline">
                {source.status === "not_connected" ? "Connect →" : "View →"}
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
