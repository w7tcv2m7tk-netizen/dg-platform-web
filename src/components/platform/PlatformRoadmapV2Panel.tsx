import Link from "next/link";
import { getAppsByTier, getRoadmapByArea, PLATFORM_ROADMAP } from "@dg/platform-core";
import { PLATFORM_STRATEGIC_ROADMAP } from "@dg/platform-core/roadmap/strategic-roadmap";
import type { RoadmapItem, RoadmapStatus } from "@dg/platform-core";

import { RoadmapStatusBadge } from "@/components/platform/RoadmapStatusBadge";

const WEIGHT: Record<RoadmapStatus, number> = { done: 1, in_progress: .65, scaffold: .35, planned: .05 };
function percent(items: RoadmapItem[]) { return items.length ? Math.round(items.reduce((n,i)=>n+WEIGHT[i.status],0)/items.length*100) : 0; }
function Progress({ value }: { value:number }) { return <div className="h-2.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-sky-500" style={{width:`${value}%`}} /></div>; }

export function PlatformRoadmapV2Panel() {
  const all = [...PLATFORM_ROADMAP, ...PLATFORM_STRATEGIC_ROADMAP];
  const overall = percent(all);
  const catalogue = getAppsByTier();
  const apps = [...catalogue.core, ...catalogue.business, ...catalogue.growth].filter((a)=>a.manifest.visibility !== "internal");
  const areas = new Map(getRoadmapByArea().map((x)=>[x.area, [...x.items]]));
  for (const item of PLATFORM_STRATEGIC_ROADMAP) areas.set(item.area, [...(areas.get(item.area) ?? []), item]);

  return <div className="space-y-6">
    <section className="rounded-2xl border border-sky-500/20 bg-slate-950/60 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-sky-300">Entire DigitalGate platform build</p><h2 className="mt-1 text-2xl font-semibold text-white">Overall platform progress</h2><p className="mt-1 max-w-3xl text-sm text-slate-400">One measurable roadmap covering shipped capability, active remediation, platform intelligence, Core, Growth and the full Industry App horizon.</p></div><p className="text-4xl font-bold tabular-nums text-white">{overall}%</p></div>
      <div className="mt-5"><Progress value={overall} /></div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500"><span>{all.filter(i=>i.status==="done").length} done</span><span>{all.filter(i=>i.status==="in_progress").length} in progress</span><span>{all.filter(i=>i.status==="scaffold").length} scaffolded</span><span>{all.filter(i=>i.status==="planned").length} planned</span><span>{all.length} measurable capabilities</span></div>
    </section>

    <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 p-5"><h2 className="text-lg font-semibold text-white">App build progress</h2><p className="mt-1 text-sm text-slate-500">Progress is calculated from every roadmap capability assigned to each app, including the expanded strategic horizon.</p><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{apps.map((app)=>{const items=all.filter(i=>i.appId===app.manifest.id); const value=percent(items); return <div key={app.manifest.id} className="rounded-lg border border-slate-800 p-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-white">{app.manifest.name}</p><span className="text-sm font-semibold tabular-nums text-slate-200">{value}%</span></div><div className="mt-2"><Progress value={value}/></div><p className="mt-2 text-[11px] text-slate-500">{items.length} roadmap capabilities · {items.filter(i=>i.status==="done").length} done</p></div>})}</div></section>

    <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 p-5"><h2 className="text-lg font-semibold text-white">Whole-platform roadmap</h2><p className="mt-1 text-sm text-slate-500">Completed work remains visible. Future work is deliberately ambitious and measurable — including full Industry Apps and the intelligence layer needed to make DigitalGate a true operating system rather than a collection of tools.</p><div className="mt-6 space-y-7">{[...areas.entries()].map(([area,items])=>{const value=percent(items); return <section key={area}><div className="flex flex-wrap items-end justify-between gap-3"><div><h3 className="font-semibold text-slate-200">{area}</h3><p className="text-xs text-slate-500">{items.filter(i=>i.status==="done").length}/{items.length} shipped</p></div><div className="w-48 max-w-full"><div className="mb-1 text-right text-xs tabular-nums text-slate-400">{value}%</div><Progress value={value}/></div></div><ul className="mt-3 divide-y divide-slate-800/70">{items.map(item=><li key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2">{item.href && item.status!=="planned" ? <Link href={item.href} className="text-sm font-medium text-white hover:text-sky-300">{item.label}</Link> : <span className="text-sm font-medium text-slate-200">{item.label}</span>}<RoadmapStatusBadge status={item.status}/>{item.priority==="high"?<span className="text-[10px] font-semibold uppercase tracking-wide text-rose-400">High</span>:null}</div><p className="mt-1 text-xs leading-relaxed text-slate-500">{item.description}</p></div></li>)}</ul></section>})}</div></section>
  </div>;
}
