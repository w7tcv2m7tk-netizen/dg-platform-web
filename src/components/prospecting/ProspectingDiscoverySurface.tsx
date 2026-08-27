import Link from "next/link";
import {
  GROWTH_ENGINE_STAGE_LABELS,
  listDiscoveryProviderStatuses,
  listGrowthProspects,
} from "@dg/platform-core";

import { BusinessDiscoverySearch } from "@/components/command/BusinessDiscoverySearch";
import { CreateProspectForm } from "@/components/command/CreateProspectForm";
import { EditProspectForm } from "@/components/command/EditProspectForm";
import {
  ArchiveProspectButton,
  RunProspectAuditButton,
} from "@/components/command/GrowthEngineActions";

export type ProspectingDiscoverySearchParams = {
  q?: string;
  industry?: string;
  location?: string;
  archived?: string;
  mode?: string;
};

type ModeCard = {
  id: string;
  label: string;
  href: string;
  body: string;
  group: "discover" | "ranked";
};

export async function ProspectingDiscoverySurface({
  organisationId,
  searchParams,
  variant,
}: {
  organisationId: string;
  searchParams: ProspectingDiscoverySearchParams;
  variant: "apps" | "command";
}) {
  const basePath = "/apps/prospecting/discovery";
  const pipelineHref =
    variant === "apps" ? "/apps/prospecting/pipeline" : "/command/growth-engine/pipeline";
  const hubHref = variant === "apps" ? "/apps/prospecting" : "/command/growth-engine";
  const scoresHref = "/apps/prospecting/scores";

  const q = (searchParams.q ?? "").trim().toLowerCase();
  const industry = (searchParams.industry ?? "").trim().toLowerCase();
  const location = (searchParams.location ?? "").trim().toLowerCase();
  const mode = (searchParams.mode ?? "").trim().toLowerCase();
  const showArchived = searchParams.archived === "1";

  const providers = listDiscoveryProviderStatuses();

  const all = process.env.DATABASE_URL
    ? await listGrowthProspects({
        organisationId,
        limit: 200,
        ...(showArchived ? { archivedOnly: true } : {}),
      })
    : [];

  const orgProspectIds = new Set(all.map((p) => p.id));

  const { prisma } = process.env.DATABASE_URL
    ? await import("@dg/database")
    : { prisma: null };

  let weakSeoIds: Set<string> | null = null;
  let weakAiIds: Set<string> | null = null;
  if (prisma && (mode === "problem" || mode === "ai") && orgProspectIds.size > 0) {
    const audits = await prisma.growthProspectAudit.findMany({
      where: { prospectId: { in: [...orgProspectIds] } },
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
    if (mode === "hot") return false;
    if (q) {
      const hay = `${p.businessName} ${p.contactName ?? ""} ${p.websiteUrl ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (industry && !(p.industry ?? "").toLowerCase().includes(industry)) return false;
    if (location && !(p.location ?? "").toLowerCase().includes(location)) return false;
    return true;
  });

  const searchDefaults = {
    initialIndustry:
      searchParams.industry?.trim() || (mode === "industry" ? "Finance" : "Real Estate"),
    initialLocation:
      searchParams.location?.trim() ||
      (mode === "location"
        ? "Burleigh Waters, QLD"
        : mode === "industry"
          ? "Brisbane, QLD"
          : "Currumbin, QLD"),
    initialBusinessType:
      mode === "industry" ? "Mortgage Broker" : mode === "location" ? "Agency" : "Agency",
    initialRadiusKm: (mode === "location" ? 25 : 10) as 5 | 10 | 25 | 50,
    initialQ: searchParams.q?.trim() || "",
  };

  const modeCards: ModeCard[] = [
    {
      id: "daily",
      label: "Daily Recommended",
      href: hubHref,
      body: "AI-selected businesses worth investigating today.",
      group: "discover",
    },
    {
      id: "location",
      label: "Location",
      href: `${basePath}?mode=location&location=Burleigh+Waters%2C+QLD&industry=Real+Estate`,
      body: "Find businesses in a specific area.",
      group: "discover",
    },
    {
      id: "industry",
      label: "Industry",
      href: `${basePath}?mode=industry&industry=Finance&location=Brisbane%2C+QLD&type=Mortgage+Broker`,
      body: "Find businesses within an industry or category.",
      group: "discover",
    },
    {
      id: "problem",
      label: "Problem",
      href: `${basePath}?mode=problem`,
      body: "Find businesses showing a particular business problem.",
      group: "discover",
    },
    {
      id: "ai",
      label: "AI Visibility",
      href: `${basePath}?mode=ai`,
      body: "Find businesses with weak AI/search visibility.",
      group: "discover",
    },
    {
      id: "highvalue",
      label: "High-Value",
      href: `${basePath}?mode=highvalue`,
      body: "Highest commercial potential.",
      group: "ranked",
    },
    {
      id: "hot",
      label: "Hot",
      href: `${basePath}?mode=hot`,
      body: "Strongest immediate opportunities.",
      group: "ranked",
    },
  ];

  const filterHref = (archived: boolean) => {
    const sp = new URLSearchParams();
    if (searchParams.q) sp.set("q", searchParams.q);
    if (searchParams.industry) sp.set("industry", searchParams.industry);
    if (searchParams.location) sp.set("location", searchParams.location);
    if (searchParams.mode) sp.set("mode", searchParams.mode);
    if (archived) sp.set("archived", "1");
    const qs = sp.toString();
    return `${basePath}${qs ? `?${qs}` : ""}`;
  };

  const discoverCards = modeCards.filter((c) => c.group === "discover");
  const rankedCards = modeCards.filter((c) => c.group === "ranked");

  return (
    <>
      <header className="dg-page-header">
        {variant === "command" ? (
          <Link href={hubHref} className="text-sm text-sky-400 hover:underline">
            ← Growth Engine (GTM)
          </Link>
        ) : (
          <Link href="/apps/prospecting" className="text-sm text-sky-400 hover:underline">
            ← Prospecting & Opportunity Engine
          </Link>
        )}
        <h1 className="mt-2 text-2xl font-bold text-white">Business Discovery</h1>
        <p className="mt-2 max-w-2xl text-base text-slate-200">
          Find businesses that could become your next customers.
        </p>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Discover, research and qualify businesses before they enter your CRM. DigitalGate
          combines location, industry, business data and digital signals to build a ranked prospect
          book.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Residential vendors live in Real Estate → Vendor Prospecting — not this prospect book.
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
        {/* Lifecycle architecture */}
        <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            Prospect ≠ CRM Company
          </p>
          <p className="mt-2 text-sm text-slate-300">
            A <span className="text-white">prospect</span> is a potential business. A{" "}
            <span className="text-white">CRM Company</span> is a qualified relationship. Discovery
            builds your prospect book — CRM stays clean until you convert.
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Discovery → Prospect → Qualified → Convert → CRM Company + Contact + Opportunity →
            Pipeline → Customer
          </p>
        </section>

        {/* Discover modes */}
        <section>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-400">Discover</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {discoverCards.map((card) => {
              const active = card.id === "daily" ? false : mode === card.id;
              return (
                <Link
                  key={card.id}
                  href={card.href}
                  className={`rounded-xl border px-4 py-4 transition ${
                    active
                      ? "border-sky-500/50 bg-sky-500/10"
                      : "border-slate-700/80 bg-slate-950/50 hover:border-sky-500/40"
                  }`}
                >
                  <p className="font-medium text-white">{card.label}</p>
                  <p className="mt-1.5 text-sm text-slate-400">{card.body}</p>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Ranked modes */}
        <section>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-400">Ranked</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {rankedCards.map((card) => {
              const active = mode === card.id;
              return (
                <Link
                  key={card.id}
                  href={card.href}
                  className={`rounded-xl border px-4 py-4 transition ${
                    active
                      ? "border-violet-500/50 bg-violet-500/10"
                      : "border-slate-700/80 bg-slate-950/50 hover:border-violet-500/40"
                  }`}
                >
                  <p className="font-medium text-white">{card.label}</p>
                  <p className="mt-1.5 text-sm text-slate-400">{card.body}</p>
                </Link>
              );
            })}
          </div>
          <p className="mt-3 text-sm text-slate-500">
            See how Opportunity Score™ and{" "}
            <Link href={scoresHref} className="text-sky-400 hover:underline">
              Why this prospect?
            </Link>{" "}
            explain ranked opportunities.
          </p>
        </section>

        {/* Future: AI Discovery */}
        <section className="rounded-xl border border-dashed border-sky-500/30 bg-sky-500/5 px-5 py-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-400">
            ✦ AI Discovery · Coming soon
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">
            Tell DigitalGate who you&apos;re looking for
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            “Find boutique real estate agencies on the southern Gold Coast with 5–20 staff, strong
            Google reviews but weak AI visibility.”
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Natural language → search criteria → enrich → score. Use Location, Industry or AI
            Visibility cards above for now.
          </p>
        </section>

        {mode === "hot" ? (
          <p className="text-sm text-amber-200/90">
            Hot prospects need buying-signal sources — not wired yet. Use Daily Recommended or
            Location / Industry discovery.
          </p>
        ) : null}
        {mode === "problem" || mode === "ai" || mode === "highvalue" ? (
          <p className="text-sm text-slate-500">
            Filtering your prospect book ({mode}). Provider search below stays available for new
            discovery.
          </p>
        ) : null}

        <BusinessDiscoverySearch initialProviders={providers} {...searchDefaults} />

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
            <h2 className="font-semibold text-white">Add prospect</h2>
            <p className="mt-1 text-sm text-slate-400">
              Creates a pipeline record automatically —{" "}
              <span className="text-slate-200">no CRM Company until you convert</span>.
            </p>
            <div className="mt-4">
              <CreateProspectForm pipelineHref={pipelineHref} />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="font-semibold text-white">Prospect book</h2>
              <p className="mt-1 text-sm text-slate-500">
                Research and scoring live here — not in CRM.
              </p>
            </div>
            <form className="grid gap-3 sm:grid-cols-3" method="get">
              {showArchived ? <input type="hidden" name="archived" value="1" /> : null}
              {mode ? <input type="hidden" name="mode" value={mode} /> : null}
              <label className="block text-sm">
                <span className="text-slate-400">Filter book</span>
                <input
                  name="q"
                  defaultValue={searchParams.q ?? ""}
                  placeholder="Name or site"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-400">Industry</span>
                <input
                  name="industry"
                  defaultValue={searchParams.industry ?? ""}
                  placeholder="Real estate"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-400">Location</span>
                <input
                  name="location"
                  defaultValue={searchParams.location ?? ""}
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
              <div className="rounded-xl border border-dashed border-slate-700 px-5 py-8">
                {all.length === 0 ? (
                  showArchived ? (
                    <p className="text-sm text-slate-500">No archived prospects.</p>
                  ) : (
                    <div className="space-y-2 text-sm text-slate-400">
                      <p className="font-medium text-slate-200">Your prospect book is empty.</p>
                      <p>
                        Discover businesses using Location, Industry or AI Visibility search, or add
                        a prospect.
                      </p>
                      <p className="text-slate-500">
                        Qualified prospects can later be converted into CRM Companies and
                        Opportunities.
                      </p>
                    </div>
                  )
                ) : (
                  <p className="text-sm text-slate-500">No prospects match these filters.</p>
                )}
              </div>
            ) : (
              <ul className="space-y-2">
                {filtered.map((prospect) => (
                  <li
                    key={prospect.id}
                    className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
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
                        {[prospect.contactName, prospect.contactEmail, prospect.contactPhone]
                          .filter(Boolean)
                          .length > 0 ? (
                          <p className="mt-1 text-xs text-slate-600">
                            {[prospect.contactName, prospect.contactEmail, prospect.contactPhone]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {!showArchived ? (
                          <>
                            <EditProspectForm prospect={prospect} />
                            <Link
                              href={pipelineHref}
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
