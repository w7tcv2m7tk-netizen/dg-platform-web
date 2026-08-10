import Link from "next/link";
import {
  GROWTH_ENGINE_STAGE_LABELS,
  listDiscoveryProviderStatuses,
  listGrowthProspects,
} from "@dg/platform-core";

import { BusinessDiscoverySearch } from "@/components/command/BusinessDiscoverySearch";
import { CommandCentreNav } from "@/components/command/CommandCentreNav";
import { CreateProspectForm } from "@/components/command/CreateProspectForm";
import {
  ArchiveProspectButton,
  RunProspectAuditButton,
} from "@/components/command/GrowthEngineActions";
import { GrowthEngineNav } from "@/components/command/GrowthEngineNav";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    industry?: string;
    location?: string;
    archived?: string;
    mode?: string;
  }>;
}

const MODE_CHIPS: Array<{
  id: string;
  label: string;
  href: string;
  hint: string;
}> = [
  {
    id: "daily",
    label: "Daily Recommended",
    href: "/command/growth-engine",
    hint: "Opportunity Engine briefing",
  },
  {
    id: "location",
    label: "Location Search",
    href: "/command/growth-engine/discovery?mode=location&location=Burleigh+Waters%2C+QLD&industry=Real+Estate",
    hint: "Agencies near Burleigh Waters",
  },
  {
    id: "industry",
    label: "Industry Search",
    href: "/command/growth-engine/discovery?mode=industry&industry=Finance&location=Brisbane%2C+QLD&type=Mortgage+Broker",
    hint: "Mortgage brokers in Brisbane",
  },
  {
    id: "problem",
    label: "Problem Search",
    href: "/command/growth-engine/discovery?mode=problem",
    hint: "Audited book · weak SEO",
  },
  {
    id: "ai",
    label: "AI Visibility Search",
    href: "/command/growth-engine/discovery?mode=ai",
    hint: "Audited book · weak AI visibility",
  },
  {
    id: "highvalue",
    label: "High-Value Prospects",
    href: "/command/growth-engine/discovery?mode=highvalue",
    hint: "Proposal-sent pipeline",
  },
  {
    id: "hot",
    label: "Hot Prospects",
    href: "/command/growth-engine/discovery?mode=hot",
    hint: "Coming when buying signals ship",
  },
];

export default async function GrowthDiscoveryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = (params.q ?? "").trim().toLowerCase();
  const industry = (params.industry ?? "").trim().toLowerCase();
  const location = (params.location ?? "").trim().toLowerCase();
  const mode = (params.mode ?? "").trim().toLowerCase();
  const showArchived = params.archived === "1";

  const providers = listDiscoveryProviderStatuses();

  const all = process.env.DATABASE_URL
    ? await listGrowthProspects({
        limit: 200,
        ...(showArchived ? { archivedOnly: true } : {}),
      })
    : [];

  // Mode filters on the prospect book (problem / AI / high-value) use audit metadata when present
  const { prisma } = process.env.DATABASE_URL
    ? await import("@dg/database")
    : { prisma: null };

  let weakSeoIds: Set<string> | null = null;
  let weakAiIds: Set<string> | null = null;
  if (prisma && (mode === "problem" || mode === "ai")) {
    const audits = await prisma.growthProspectAudit.findMany({
      orderBy: { auditedAt: "desc" },
      take: 400,
      select: {
        prospectId: true,
        seoScore: true,
        aiVisibility: true,
      },
    });
    const seen = new Set<string>();
    weakSeoIds = new Set();
    weakAiIds = new Set();
    for (const a of audits) {
      if (seen.has(a.prospectId)) continue;
      seen.add(a.prospectId);
      if (a.seoScore != null && a.seoScore < 55) weakSeoIds.add(a.prospectId);
      if (a.aiVisibility != null && a.aiVisibility < 50) weakAiIds.add(a.prospectId);
    }
  }

  const filtered = all.filter((p) => {
    if (mode === "problem" && weakSeoIds && !weakSeoIds.has(p.id)) return false;
    if (mode === "ai" && weakAiIds && !weakAiIds.has(p.id)) return false;
    if (mode === "highvalue" && p.stage !== "proposal_sent") return false;
    if (mode === "hot") return false; // no buying-signal source yet
    if (q) {
      const hay = `${p.businessName} ${p.contactName ?? ""} ${p.websiteUrl ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (industry && !(p.industry ?? "").toLowerCase().includes(industry)) return false;
    if (location && !(p.location ?? "").toLowerCase().includes(location)) return false;
    return true;
  });

  const searchDefaults = {
    initialIndustry: params.industry?.trim() || (mode === "industry" ? "Finance" : "Real Estate"),
    initialLocation:
      params.location?.trim() ||
      (mode === "location"
        ? "Burleigh Waters, QLD"
        : mode === "industry"
          ? "Brisbane, QLD"
          : "Currumbin, QLD"),
    initialBusinessType:
      mode === "industry" ? "Mortgage Broker" : mode === "location" ? "Agency" : "Agency",
    initialRadiusKm: (mode === "location" ? 25 : 10) as 5 | 10 | 25 | 50,
    initialQ: params.q?.trim() || "",
  };

  const filterHref = (archived: boolean) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.industry) sp.set("industry", params.industry);
    if (params.location) sp.set("location", params.location);
    if (archived) sp.set("archived", "1");
    const qs = sp.toString();
    return `/command/growth-engine/discovery${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <header className="dg-page-header">
        <Link href="/command/growth-engine" className="text-sm text-sky-400 hover:underline">
          ← Prospecting
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Business Discovery</h1>
        <p className="mt-1 text-sm text-slate-400">
          Core Platform engine — discover via providers, select-import to prospects, then audit /
          report / pipeline. Manual add remains for one-off leads.
        </p>
        <p className="mt-2 text-xs">
          {showArchived ? (
            <Link href={filterHref(false)} className="text-sky-400 hover:underline">
              ← Hide archived
            </Link>
          ) : (
            <Link
              href={filterHref(true)}
              className="text-slate-500 hover:text-sky-400 hover:underline"
            >
              Show archived
            </Link>
          )}
        </p>
      </header>
      <main className="dg-page-main space-y-8">
        <CommandCentreNav active="growth" />
        <GrowthEngineNav active="/command/growth-engine/discovery" />

        <div className="flex flex-wrap gap-2">
          {MODE_CHIPS.map((chip) => {
            const active = chip.id === "daily" ? false : mode === chip.id;
            return (
              <Link
                key={chip.id}
                href={chip.href}
                title={chip.hint}
                className={`rounded-md px-3 py-1.5 text-xs ${
                  active
                    ? "bg-sky-600 text-white"
                    : "bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                {chip.label}
              </Link>
            );
          })}
        </div>
        {mode === "hot" ? (
          <p className="text-sm text-amber-200/90">
            Hot Prospects need buying-signal sources — not wired yet. Use Daily Recommended or
            Location / Industry search.
          </p>
        ) : null}
        {mode === "problem" || mode === "ai" || mode === "highvalue" ? (
          <p className="text-sm text-slate-500">
            Filtering your prospect book ({mode}
            ). Provider search below stays available for new discovery.
          </p>
        ) : null}

        <BusinessDiscoverySearch initialProviders={providers} {...searchDefaults} />

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
            <h2 className="font-semibold text-white">Add prospect manually</h2>
            <p className="mt-1 text-sm text-slate-400">
              Creates a pipeline record automatically — no CRM Company until you convert.
            </p>
            <div className="mt-4">
              <CreateProspectForm />
            </div>
          </div>

          <div className="space-y-4">
            <form className="grid gap-3 sm:grid-cols-3" method="get">
              {showArchived ? <input type="hidden" name="archived" value="1" /> : null}
              <label className="block text-sm">
                <span className="text-slate-400">Filter book</span>
                <input
                  name="q"
                  defaultValue={params.q ?? ""}
                  placeholder="Name or site"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-400">Industry</span>
                <input
                  name="industry"
                  defaultValue={params.industry ?? ""}
                  placeholder="Real estate"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-400">Location</span>
                <input
                  name="location"
                  defaultValue={params.location ?? ""}
                  placeholder="Gold Coast"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                />
              </label>
              <div className="sm:col-span-3">
                <button
                  type="submit"
                  className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
                >
                  Filter
                </button>
              </div>
            </form>

            {!process.env.DATABASE_URL ? (
              <p className="text-sm text-amber-200">DATABASE_URL required to list prospects.</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-slate-500">
                {all.length === 0
                  ? showArchived
                    ? "No archived prospects."
                    : "No prospects yet — discover above or add manually."
                  : "No prospects match these filters."}
              </p>
            ) : (
              <ul className="space-y-2">
                {filtered.map((prospect) => (
                  <li
                    key={prospect.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700/80 bg-slate-950/40 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-white">{prospect.businessName}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {GROWTH_ENGINE_STAGE_LABELS[prospect.stage] ?? prospect.stage}
                        {[prospect.industry, prospect.location]
                          .filter(Boolean)
                          .map((v) => ` · ${v}`)
                          .join("")}
                        {prospect.archivedAt ? " · Archived" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!showArchived ? (
                        <>
                          <Link
                            href="/command/growth-engine/pipeline"
                            className="text-xs text-sky-400 hover:underline"
                          >
                            Pipeline
                          </Link>
                          <RunProspectAuditButton prospectId={prospect.id} label="Audit" />
                        </>
                      ) : null}
                      <ArchiveProspectButton
                        prospectId={prospect.id}
                        businessName={prospect.businessName}
                        archived={showArchived}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
