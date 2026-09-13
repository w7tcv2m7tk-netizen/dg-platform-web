import Link from "next/link";

export type MonitoredVisibilityDimension = {
  id: string;
  label: string;
  value: number | null;
  available: boolean;
  evidenceCount: number;
  coverage: string;
  explanation: string;
  lastUpdated: string | null;
  evidenceSource: string;
};

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function AiVisibilityCompositeSummary({
  readiness,
  readinessUpdatedAt,
  dimensions,
}: {
  readiness: number | null;
  readinessUpdatedAt: string | null;
  dimensions: MonitoredVisibilityDimension[];
}) {
  const layers = [
    {
      id: "ai_readiness",
      label: "AI Readiness",
      value: readiness,
      available: readiness != null,
      coverage: readiness == null ? "No domain-matched website audit" : "Domain-matched website audit",
      href: "/apps/ai-visibility/technical",
    },
    ...dimensions.map((dimension) => ({
      id: dimension.id,
      label: dimension.label,
      value: dimension.value,
      available: dimension.available,
      coverage: dimension.coverage,
      href:
        dimension.id === "ai_presence"
          ? "/apps/ai-visibility/presence"
          : dimension.id === "competitive_share"
            ? "/apps/ai-visibility/competitors"
            : "/apps/ai-visibility/citations",
    })),
  ];
  const available = layers.filter((layer) => layer.available && layer.value != null);
  const composite = available.length
    ? clamp(available.reduce((sum, layer) => sum + (layer.value ?? 0), 0) / available.length)
    : null;

  return (
    <section className="dg-card border-violet-500/20">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-300/80">AI Visibility™ composite</p>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-4xl font-bold text-white">{composite == null ? "—" : composite}</span>
            {composite != null ? <span className="pb-1 text-sm text-slate-500">/100</span> : null}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            {available.length
              ? `Calculated from ${available.length} of ${layers.length} evidence layers currently available. Missing layers are excluded, not scored as zero.`
              : "No evidence layers are available yet. DigitalGate will not manufacture a visibility score without evidence."}
          </p>
        </div>
        <div className="text-xs text-slate-500">
          <p>{available.length}/{layers.length} scored layers</p>
          {readinessUpdatedAt ? (
            <p className="mt-1">Readiness updated {new Date(readinessUpdatedAt).toLocaleDateString("en-AU")}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {layers.map((layer) => (
          <Link key={layer.id} href={layer.href} className="rounded-xl border border-slate-800 bg-slate-950/30 p-3 hover:border-violet-500/30">
            <p className="text-xs text-slate-500">{layer.label}</p>
            <p className="mt-1 text-xl font-semibold text-white">{layer.value == null ? "—" : layer.value}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{layer.coverage}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
