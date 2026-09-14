import Link from "next/link";
import { getAppsByTier, PLATFORM_ROADMAP } from "@dg/platform-core";
import { PLATFORM_STRATEGIC_ROADMAP } from "@dg/platform-core/roadmap/strategic-roadmap";
import { INDUSTRY_APP_IDS, INDUSTRY_TAXONOMY, ROADMAP_MAJOR_SECTIONS, type RoadmapMajorSectionId } from "@dg/platform-core/roadmap/taxonomy";
import type { RoadmapItem, RoadmapStatus } from "@dg/platform-core";

import { PlatformRoadmapCategoryNav } from "@/components/platform/PlatformRoadmapCategoryNav";
import { RoadmapStatusBadge } from "@/components/platform/RoadmapStatusBadge";

const WEIGHT: Record<RoadmapStatus, number> = { done: 1, in_progress: .65, scaffold: .35, planned: .05 };
const GROWTH_IDS = new Set(["ai-visibility","seo","automation","analytics","social","marketing","reviews","prospecting","ai-communications"]);
const COMMAND_IDS = new Set(["command-centre"]);
const CONFIG_AREAS = ["settings","configuration","security","billing","integration","connector","onboarding","organisation","team","subscription","entitlement"];

function percent(items: RoadmapItem[]) { return items.length ? Math.round(items.reduce((n,i)=>n+WEIGHT[i.status],0)/items.length*100) : 0; }
function Progress({ value }: { value:number }) { return <div className="h-2.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-sky-500" style={{width:`${value}%`}} /></div>; }
function sectionFor(item: RoadmapItem): RoadmapMajorSectionId {
  if (item.appId && INDUSTRY_APP_IDS.has(item.appId)) return "industry";
  if (item.appId && COMMAND_IDS.has(item.appId)) return "command";
  if (item.appId && GROWTH_IDS.has(item.appId)) return "growth";
  const area = item.area.toLowerCase();
  if (area.includes("command") || area.includes("operator") || area.includes("customer success")) return "command";
  if (CONFIG_AREAS.some((token)=>area.includes(token))) return "configuration";
  if (area.includes("growth") || area.includes("seo") || area.includes("reputation") || area.includes("social")) return "growth";
  return "core";
}
function syntheticIndustryItems(): RoadmapItem[] {
  return INDUSTRY_TAXONOMY.flatMap((group)=>group.subIndustries.filter((sub)=>!sub.appId).map((sub)=>({
    id:`future.industry.${group.id}.${sub.id}`, area:group.label, label:`${sub.label} industry pack`, description:sub.description,
    status:"planned" as const, priority:"medium" as const, appId:sub.id, track:"gen2" as const,
  })));
}
function RoadmapList({ items }: { items: RoadmapItem[] }) {
  return <ul className="divide-y divide-slate-800/70">{items.map(item=><li key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2">{item.href && item.status!=="planned" ? <Link href={item.href} className="text-sm font-medium text-white hover:text-sky-300">{item.label}</Link> : <span className="text-sm font-medium text-slate-200">{item.label}</span>}<RoadmapStatusBadge status={item.status}/>{item.priority==="high"?<span className="text-[10px] font-semibold uppercase tracking-wide text-rose-400">High</span>:null}</div><p className="mt-1 text-xs leading-relaxed text-slate-500">{item.description}</p></div></li>)}</ul>;
}

export function PlatformRoadmapV2Panel({ activeSection = "overview" }: { activeSection?: "overview" | RoadmapMajorSectionId }) {
  const all = [...PLATFORM_ROADMAP, ...PLATFORM_STRATEGIC_ROADMAP, ...syntheticIndustryItems()];
  const overall = percent(all);
  const catalogue = getAppsByTier();
  const registeredApps = [...catalogue.core, ...catalogue.business, ...catalogue.growth, ...catalogue.internal];
  const sectionItems = activeSection === "overview" ? all : all.filter((item)=>sectionFor(item)===activeSection);
  const sectionMeta = ROADMAP_MAJOR_SECTIONS.find((section)=>section.id===activeSection);

  return <div className="space-y-6">
    <PlatformRoadmapCategoryNav active={activeSection} />
    <section className="rounded-2xl border border-sky-500/20 bg-slate-950/60 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-sky-300">Entire DigitalGate platform build</p><h2 className="mt-1 text-2xl font-semibold text-white">{activeSection === "overview" ? "Overall platform progress" : `${sectionMeta?.label ?? "Roadmap"} progress`}</h2><p className="mt-1 max-w-3xl text-sm text-slate-400">{activeSection === "overview" ? "One measurable build plan covering the operating platform, Growth Apps, Command Centre, configuration and every Industry App horizon." : sectionMeta?.description}</p></div><p className="text-4xl font-bold tabular-nums text-white">{percent(sectionItems)}%</p></div>
      <div className="mt-5"><Progress value={percent(sectionItems)} /></div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500"><span>{sectionItems.filter(i=>i.status==="done").length} done</span><span>{sectionItems.filter(i=>i.status==="in_progress").length} in progress</span><span>{sectionItems.filter(i=>i.status==="scaffold").length} scaffolded</span><span>{sectionItems.filter(i=>i.status==="planned").length} planned</span><span>{sectionItems.length} measurable capabilities</span>{activeSection!=="overview"?<span>Overall platform {overall}%</span>:null}</div>
    </section>

    {activeSection === "overview" ? <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">{ROADMAP_MAJOR_SECTIONS.map((section)=>{const items=all.filter((item)=>sectionFor(item)===section.id); const value=percent(items); return <Link key={section.id} href={`/command/product/roadmap/${section.id}`} className="rounded-xl border border-slate-700/80 bg-slate-950/40 p-4 transition hover:border-sky-500/30"><div className="flex items-start justify-between gap-3"><h3 className="font-semibold text-white">{section.label}</h3><span className="text-sm font-semibold tabular-nums text-slate-200">{value}%</span></div><div className="mt-3"><Progress value={value}/></div><p className="mt-3 text-xs leading-relaxed text-slate-500">{section.description}</p><p className="mt-2 text-[11px] text-slate-600">{items.length} capabilities</p></Link>})}</section> : null}

    {activeSection === "industry" ? <section className="space-y-5">{INDUSTRY_TAXONOMY.map((group)=>{const groupIds=new Set(group.subIndustries.map((sub)=>sub.appId ?? sub.id)); const groupItems=all.filter((item)=>item.appId && groupIds.has(item.appId)); return <div key={group.id} className="rounded-xl border border-slate-700/80 bg-slate-950/40 p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-semibold text-white">{group.label}</h2><p className="mt-1 text-sm text-slate-500">{group.description}</p></div><div className="w-48 max-w-full"><div className="mb-1 text-right text-xs tabular-nums text-slate-400">{percent(groupItems)}%</div><Progress value={percent(groupItems)}/></div></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{group.subIndustries.map((sub)=>{const id=sub.appId ?? sub.id; const items=all.filter((item)=>item.appId===id); const app=registeredApps.find((entry)=>entry.manifest.id===sub.appId); return <div key={sub.id} className="rounded-lg border border-slate-800 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-white">{sub.label}</p><p className="mt-1 text-[11px] text-slate-500">{app ? "Registered Industry App" : "Future industry pack"}</p></div><span className="text-sm font-semibold tabular-nums text-slate-200">{percent(items)}%</span></div><div className="mt-3"><Progress value={percent(items)}/></div><p className="mt-3 text-xs leading-relaxed text-slate-500">{sub.description}</p><p className="mt-2 text-[11px] text-slate-600">{items.length} measurable capabilities</p></div>})}</div></div>})}</section> : null}

    {activeSection !== "industry" ? <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 p-5"><h2 className="text-lg font-semibold text-white">{activeSection === "overview" ? "Whole-platform roadmap" : sectionMeta?.label}</h2><p className="mt-1 text-sm text-slate-500">Completed work remains visible; active and future capability is grouped into the product area where it belongs.</p><div className="mt-5"><RoadmapList items={sectionItems}/></div></section> : null}
  </div>;
}
