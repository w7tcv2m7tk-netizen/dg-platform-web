import Link from "next/link";
import { redirect } from "next/navigation";
import { PLATFORM_DOCS_CATALOG } from "@dg/platform-core";

import { OperatorCategoryHeader } from "@/components/command/OperatorCategoryHeader";
import { ProductOverviewDashboard } from "@/components/command/ProductOverviewDashboard";
import { PlatformRoadmapV2Panel, type RoadmapView } from "@/components/platform/PlatformRoadmapV2Panel";
import { requirePlatformOperatorContext } from "@/lib/platform-operator";

const RELEASE_SLUGS = new Set(["commercially-ready-v1","platform-releases","gate-1-dogfood","founding-10-release-gate","founding-10-verification","acc-beta-launch","re-beta-launch","websites-beta-launch","commerce-beta-launch","infrastructure-beta-launch","services-beta-launch"]);
const ROADMAP_VIEWS = new Set<RoadmapView>(["overview","core","growth","command","industry","configuration"]);

export default async function ProductSectionPage({ params, searchParams }: { params: Promise<{ section: string }>; searchParams: Promise<{ view?: string }> }) {
  await requirePlatformOperatorContext();
  const { section } = await params;
  const query = await searchParams;
  if (section === "overview") return <><header className="dg-page-header"><OperatorCategoryHeader eyebrow="Product" title="Overview" question="What exists, what is being built, what is planned, what has changed, and what feedback needs a decision?" backHref="/command" backLabel="Command Centre" /></header><main className="dg-page-main space-y-6"><ProductOverviewDashboard /></main></>;
  if (section === "roadmap") { const view = ROADMAP_VIEWS.has(query.view as RoadmapView) ? query.view as RoadmapView : "overview"; return <><header className="dg-page-header"><OperatorCategoryHeader eyebrow="Product" title="Roadmap" question="The entire DigitalGate build — Core, Growth Apps, Command Centre, Industry Apps and Configuration." backHref="/command/product/overview" backLabel="Product" /></header><main className="dg-page-main"><PlatformRoadmapV2Panel view={view} /></main></>; }
  if (section === "feedback") return <><header className="dg-page-header"><OperatorCategoryHeader eyebrow="Product" title="Feedback" question="Product feedback that needs a decision — Support is the intake surface today." backHref="/command/product/overview" backLabel="Product" /></header><main className="dg-page-main space-y-4"><p className="max-w-2xl text-sm text-slate-400">Capture product requests via Support conversations so they stay actionable and attributed.</p><div className="flex flex-wrap gap-3"><Link href="/support" className="inline-flex rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500">Open Support centre</Link><Link href="/support/tickets" className="inline-flex rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:border-slate-500">Support conversations</Link></div></main></>;
  if (section === "releases") { const docs=PLATFORM_DOCS_CATALOG.filter(d=>RELEASE_SLUGS.has(d.slug)); return <><header className="dg-page-header"><OperatorCategoryHeader eyebrow="Product" title="Releases" question="Curated Platform Docs for rollout and launch." backHref="/command/product/overview" backLabel="Product" /></header><main className="dg-page-main space-y-6"><p className="max-w-2xl text-sm text-slate-400">Release evidence and rollout controls remain grounded in Platform Docs and Feature Flags.</p>{docs.length===0?<p className="text-sm text-slate-500">No release docs in the allowlist.</p>:<ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{docs.map(doc=><li key={doc.slug}><Link href={`/command/docs/${doc.slug}`} className="block h-full rounded-xl border border-slate-700/80 bg-slate-950/50 px-5 py-4 transition hover:border-sky-500/30"><p className="font-medium text-white">{doc.title}</p><p className="mt-1 text-sm text-slate-400">{doc.summary}</p></Link></li>)}</ul>}</main></>; }
  redirect("/command/product/overview");
}
