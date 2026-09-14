import Link from "next/link";
import {
  getAppsByTier,
  getRoadmapByArea,
  INDUSTRY_TAXONOMY,
  PLATFORM_ROADMAP,
} from "@dg/platform-core";
import { INDUSTRY_SUBINDUSTRY_ROADMAP } from "@dg/platform-core/roadmap/industry-roadmap";
import { PLATFORM_STRATEGIC_ROADMAP } from "@dg/platform-core/roadmap/strategic-roadmap";
import type { RoadmapItem, RoadmapStatus } from "@dg/platform-core";

import { RoadmapStatusBadge } from "@/components/platform/RoadmapStatusBadge";

export type RoadmapView = "overview" | "core" | "growth" | "command" | "industry" | "configuration";

const WEIGHT: Record<RoadmapStatus, number> = { done: 1, in_progress: 0.65, scaffold: 0.35, planned: 0.05 };
const VIEWS: Array<{ id: RoadmapView; label: string; description: string }> = [
  { id: "overview", label: "Overview", description: "Entire platform" },
  { id: "core", label: "Core", description: "Business operating foundation" },
  { id: "growth", label: "Growth Apps", description: "Acquisition and visibility" },
  { id: "command", label: "Command Centre", description: "DigitalGate operator plane" },
  { id: "industry", label: "Industry Apps", description: "Industry operating systems" },
  { id: "configuration", label: "Configuration", description: "Administration and infrastructure" },
];

function percent(items: RoadmapItem[]) {
  return items.length ? Math.round((items.reduce((n, item) => n + WEIGHT[item.status], 0) / items.length) * 100) : 0;
}

function Progress({ value }: { value: number }) {
  return <div className="h-2.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-sky-500" style={{ width: `${value}%` }} /></div>;
}

function RoadmapList({ items }: { items: RoadmapItem[] }) {
  return <ul className="mt-3 divide-y divide-slate-800/70">{items.map((item) => <li key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2">{item.href && item.status !== "planned" ? <Link href={item.href} className="text-sm font-medium text-white hover:text-sky-300">{item.label}</Link> : <span className="text-sm font-medium text-slate-200">{item.label}</span>}<RoadmapStatusBadge status={item.status}/>{item.priority === "high" ? <span className="text-[10px] font-semibold uppercase tracking-wide text-rose-400">High</span> : null}</div><p className="mt-1 text-xs leading-relaxed text-slate-500">{item.description}</p></div></li>)}</ul>;
}

function ProgressCard({ title, subtitle, items, href }: { title: string; subtitle?: string; items: RoadmapItem[]; href?: string }) {
  const value = percent(items);
  const body = <><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-white">{title}</p>{subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}</div><span className="text-lg font-bold tabular-nums text-white">{value}%</span></div><div className="mt-3"><Progress value={value}/></div><p className="mt-2 text-[11px] text-slate-500">{items.filter((item) => item.status === "done").length} done · {items.filter((item) => item.status === "in_progress").length} in progress · {items.length} capabilities</p></>;
  return href ? <Link href={href} className="block rounded-xl border border-slate-800 bg-slate-950/35 p-4 transition hover:border-sky-500/35">{body}</Link> : <div className="rounded-xl border border-slate-800 bg-slate-950/35 p-4">{body}</div>;
}

export function PlatformRoadmapV2Panel({ view = "overview" }: { view?: RoadmapView }) {
  const all = [...PLATFORM_ROADMAP, ...PLATFORM_STRATEGIC_ROADMAP, ...INDUSTRY_SUBINDUSTRY_ROADMAP];
  const catalogue = getAppsByTier();
  const businessIds = new Set(catalogue.business.map((app) => app.manifest.id));
  const growthIds = new Set(catalogue.growth.map((app) => app.manifest.id));

  function categoryOf(item: RoadmapItem): Exclude<RoadmapView, "overview"> {
    if (item.id.startsWith("industry.") || (item.appId && businessIds.has(item.appId))) return "industry";
    if (item.appId && growthIds.has(item.appId)) return "growth";
    if (item.area === "Infrastructure" || item.appId === "infrastructure" || /(^|\.)(config|settings|security|access|connector|billing|api)/.test(item.id)) return "configuration";
    if (item.area === "Command Centre" || item.id.startsWith("command.") || item.appId?.startsWith("dg-") || item.appId === "command-centre") return "command";
    return "core";
  }

  const categoryItems = Object.fromEntries(VIEWS.filter((entry) => entry.id !== "overview").map((entry) => [entry.id, all.filter((item) => categoryOf(item) === entry.id)])) as Record<Exclude<RoadmapView, "overview">, RoadmapItem[]>;
  const overall = percent(all);
  const selectedItems = view === "overview" ? all : categoryItems[view];

  const areas = new Map<string, RoadmapItem[]>();
  for (const item of selectedItems) areas.set(item.area, [...(areas.get(item.area) ?? []), item]);

  const appsForView = view === "core" ? catalogue.core.filter((app) => app.manifest.visibility !== "internal" && app.manifest.id !== "infrastructure") : view === "growth" ? catalogue.growth.filter((app) => app.manifest.visibility !== "internal") : [];

  return <div className="space-y-6">
    <nav className="flex gap-2 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50 p-2" aria-label="Roadmap sections">{VIEWS.map((entry) => <Link key={entry.id} href={entry.id === "overview" ? "/command/product/roadmap" : `/command/product/roadmap?view=${entry.id}`} className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition ${view === entry.id ? "bg-sky-500/15 text-sky-200 ring-1 ring-sky-500/30" : "text-slate-400 hover:bg-slate-800/70 hover:text-white"}`}>{entry.label}</Link>)}</nav>

    <section className="rounded-2xl border border-sky-500/20 bg-slate-950/60 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-sky-300">{view === "overview" ? "Entire DigitalGate platform build" : VIEWS.find((entry) => entry.id === view)?.label}</p><h2 className="mt-1 text-2xl font-semibold text-white">{view === "overview" ? "Overall platform progress" : `${VIEWS.find((entry) => entry.id === view)?.label} progress`}</h2><p className="mt-1 max-w-3xl text-sm text-slate-400">Weighted capability progress across shipped, active, scaffolded and planned work. The roadmap measures the full product vision, not only launch readiness.</p></div><p className="text-4xl font-bold tabular-nums text-white">{percent(selectedItems)}%</p></div>
      <div className="mt-5"><Progress value={percent(selectedItems)} /></div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500"><span>{selectedItems.filter((item) => item.status === "done").length} done</span><span>{selectedItems.filter((item) => item.status === "in_progress").length} in progress</span><span>{selectedItems.filter((item) => item.status === "scaffold").length} scaffolded</span><span>{selectedItems.filter((item) => item.status === "planned").length} planned</span><span>{selectedItems.length} measurable capabilities</span></div>
    </section>

    {view === "overview" ? <>
      <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 p-5"><h2 className="text-lg font-semibold text-white">Major build areas</h2><p className="mt-1 text-sm text-slate-500">The platform is now organised the same way you think about the business: operating foundation, growth, operator control, industry products and configuration.</p><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{VIEWS.filter((entry) => entry.id !== "overview").map((entry) => <ProgressCard key={entry.id} title={entry.label} subtitle={entry.description} items={categoryItems[entry.id]} href={`/command/product/roadmap?view=${entry.id}`}/>)}</div></section>
      <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-white">Overall build horizon</h2><p className="mt-1 text-sm text-slate-500">{all.length} measurable capabilities across the complete DigitalGate vision.</p></div><span className="text-2xl font-bold tabular-nums text-white">{overall}%</span></div></section>
    </> : null}

    {(view === "core" || view === "growth") ? <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 p-5"><h2 className="text-lg font-semibold text-white">App build progress</h2><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{appsForView.map((app) => <ProgressCard key={app.manifest.id} title={app.manifest.name} subtitle={app.manifest.description} items={all.filter((item) => item.appId === app.manifest.id)}/>)}</div></section> : null}

    {view === "industry" ? <section className="space-y-5">{INDUSTRY_TAXONOMY.map((group) => { const groupItems = categoryItems.industry.filter((item) => item.id.startsWith(`industry.${group.id}.`) || (item.appId && group.appIds.includes(item.appId))); return <div key={group.id} className="rounded-xl border border-slate-700/80 bg-slate-950/40 p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-sky-300">Industry</p><h2 className="text-xl font-semibold text-white">{group.name}</h2><p className="mt-1 max-w-3xl text-sm text-slate-500">{group.description}</p></div><div className="w-52 max-w-full"><p className="mb-1 text-right text-lg font-bold tabular-nums text-white">{percent(groupItems)}%</p><Progress value={percent(groupItems)}/></div></div><div className="mt-5 grid gap-3 lg:grid-cols-2">{group.subIndustries.map((sub) => { const items = INDUSTRY_SUBINDUSTRY_ROADMAP.filter((item) => item.id.startsWith(`industry.${group.id}.${sub.id}.`)); return <div key={sub.id} className="rounded-xl border border-slate-800 bg-slate-950/35 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-100">{sub.name}</h3><p className="mt-1 text-xs leading-relaxed text-slate-500">{sub.description}</p></div><span className="text-lg font-bold tabular-nums text-white">{percent(items)}%</span></div><div className="mt-3"><Progress value={percent(items)}/></div><RoadmapList items={items}/></div>; })}</div></div>; })}</section> : null}

    {view !== "overview" && view !== "industry" ? <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 p-5"><h2 className="text-lg font-semibold text-white">{VIEWS.find((entry) => entry.id === view)?.label} roadmap</h2><div className="mt-6 space-y-7">{[...areas.entries()].map(([area, items]) => <section key={area}><div className="flex flex-wrap items-end justify-between gap-3"><div><h3 className="font-semibold text-slate-200">{area}</h3><p className="text-xs text-slate-500">{items.filter((item) => item.status === "done").length}/{items.length} shipped</p></div><div className="w-48 max-w-full"><div className="mb-1 text-right text-xs tabular-nums text-slate-400">{percent(items)}%</div><Progress value={percent(items)}/></div></div><RoadmapList items={items}/></section>)}</div></section> : null}
  </div>;
}
