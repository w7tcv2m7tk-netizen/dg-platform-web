import Link from "next/link";
import { ROADMAP_MAJOR_SECTIONS } from "@dg/platform-core/roadmap/taxonomy";

export function PlatformRoadmapCategoryNav({ active }: { active: string }) {
  return <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Roadmap sections">
    <Link href="/command/product/roadmap" className={`whitespace-nowrap rounded-lg border px-3 py-2 text-sm ${active === "overview" ? "border-sky-500/50 bg-sky-500/10 text-sky-200" : "border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200"}`}>Overview</Link>
    {ROADMAP_MAJOR_SECTIONS.map((section) => <Link key={section.id} href={`/command/product/roadmap/${section.id}`} className={`whitespace-nowrap rounded-lg border px-3 py-2 text-sm ${active === section.id ? "border-sky-500/50 bg-sky-500/10 text-sky-200" : "border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200"}`}>{section.label}</Link>)}
  </nav>;
}
