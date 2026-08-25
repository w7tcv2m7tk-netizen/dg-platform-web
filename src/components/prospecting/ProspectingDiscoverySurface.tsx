import Link from "next/link";
import {
  GROWTH_ENGINE_STAGE_LABELS,
  listDiscoveryProviderStatuses,
  listGrowthProspects,
} from "@dg/platform-core";

import { BusinessDiscoverySearch } from "@/components/command/BusinessDiscoverySearch";
import { CommandCentreNav } from "@/components/command/CommandCentreNav";
import { CreateProspectForm } from "@/components/command/CreateProspectForm";
import { EditProspectForm } from "@/components/command/EditProspectForm";
import {
  ArchiveProspectButton,
  RunProspectAuditButton,
} from "@/components/command/GrowthEngineActions";
import { GrowthEngineNav } from "@/components/command/GrowthEngineNav";

export type ProspectingDiscoverySearchParams = {
  q?: string;
  industry?: string;
  location?: string;
  archived?: string;
  mode?: string;
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
  const hubHref =
    variant === "apps" ? "/apps/prospecting" : "/command/growth-engine";

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

  const modeChips: Array<{ id: string; label: string; href: string; hint: string }> = [
    {
      id: "daily",
      label: "Daily Recommended",
      href: hubHref,
      hint: "Opportunity Engine briefing",
    },
    {
      id: "location",
      label: "Location Search",
      href: `${basePath}?mode=location&location=Burleigh+Waters%2C+QLD&industry=Real+Estate`,
      hint: "Agencies near Burleigh Waters",
    },
    {
      id: "industry",
      label: "Industry Search",
      href: `${basePath}?mode=industry&industry=Finance&location=Brisbane%2C+QLD&type=Mortgage+Broker`,
      hint: "Mortgage brokers in Brisbane",
    },
    {
      id: "problem",
      label: "Problem Search",
      href: `${basePath}?mode=problem`,
      hint: "Audited book · weak SEO",
    },
    {
      id: "ai",
      label: "AI Visibility Search",
      href: `${basePath}?mode=ai`,
      hint: "Audited book · weak AI visibility",
    },
    {
      id: "highvalue",
      label: "High-Value Prospects",
      href: `${basePath}?mode=highvalue`,
      hint: "Proposal-sent pipeline",
    },
    {
      id: "hot",
      label: "Hot Prospects",
      href: `${basePath}?mode=hot`,
      hint: "Coming when buying signals ship",
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

  return (
    <>
      <header className="dg-page-header">
        {variant === "command" ? (
          <Link href={hubHref} className="text-sm text-sky-400 hover:underline">
            ← Prospecting
          </Link>
        ) : null}
        <h1 className={`${variant === "command" ? "mt-2 " : ""}text-2xl font-bold text-white`}>
          Business Discovery
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Find businesses that may need your product or service. Residential vendors live in Real
          Estate → Vendor Prospecting — not this prospect book.
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
        {variant === "command" ? (
          <>
            <CommandCentreNav active="growth" />
            <GrowthEngineNav active="/apps/prospecting/discovery" />
          </>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {modeChips.map((chip) => {
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
            Filtering your prospect book ({mode}). Provider search below stays available for new
            discovery.
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
              <CreateProspectForm pipelineHref={pipelineHref} />
            </div>
          </div>

          <div className="space-y-4">
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
