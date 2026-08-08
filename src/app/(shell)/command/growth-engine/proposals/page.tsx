import Link from "next/link";
import {
  GROWTH_ENGINE_STAGE_LABELS,
  listGrowthProspectAudits,
  listGrowthProspects,
} from "@dg/platform-core";

import { CommandCentreNav } from "@/components/command/CommandCentreNav";
import { GenerateProspectReportButton } from "@/components/command/GrowthEngineActions";
import { GrowthEngineNav } from "@/components/command/GrowthEngineNav";

/**
 * Proposal drafts are templated from the latest audit — Commerce quote wiring comes later.
 */
export default async function GrowthProposalsPage() {
  const db = Boolean(process.env.DATABASE_URL);
  const [prospects, audits] = db
    ? await Promise.all([listGrowthProspects(), listGrowthProspectAudits({ limit: 100 })])
    : [[], []];

  const latestByProspect = new Map(audits.map((a) => [a.prospectId, a]));
  const candidates = prospects.filter((p) =>
    ["report_viewed", "meeting_booked", "proposal_sent", "follow_up_due", "audit_created", "report_sent"].includes(
      p.stage,
    ),
  );

  return (
    <>
      <header className="dg-page-header">
        <Link href="/command/growth-engine" className="text-sm text-sky-400 hover:underline">
          ← Growth Engine
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Proposal Generator</h1>
        <p className="mt-1 text-sm text-slate-400">
          Staff briefings from audit scores. Full AI pricing + Commerce quotes still to land.
        </p>
      </header>
      <main className="dg-page-main space-y-8">
        <CommandCentreNav active="growth" />
        <GrowthEngineNav active="/command/growth-engine/proposals" />

        {!db ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-sm text-amber-100">
            Configure DATABASE_URL to draft proposals.
          </div>
        ) : candidates.length === 0 ? (
          <div className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-6">
            <p className="text-slate-300">No proposal-ready prospects yet.</p>
            <p className="mt-2 text-sm text-slate-500">
              Advance prospects past audit / report stages, or run audits first.
            </p>
            <Link
              href="/command/growth-engine/audits"
              className="mt-4 inline-block text-sm text-sky-400 hover:underline"
            >
              Open audits →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {candidates.map((prospect) => {
              const audit = latestByProspect.get(prospect.id);
              const health = audit?.businessHealth ?? null;
              const services = buildServiceLines(health, prospect.industry);
              return (
                <article
                  key={prospect.id}
                  className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        {GROWTH_ENGINE_STAGE_LABELS[prospect.stage] ?? prospect.stage}
                        {health != null ? ` · Health ${health}` : " · No audit"}
                      </p>
                      <h2 className="mt-1 text-lg font-semibold text-white">
                        {prospect.businessName}
                      </h2>
                      <p className="mt-2 max-w-2xl text-sm text-slate-400">
                        {health == null
                          ? "Run a presence audit before drafting a priced proposal."
                          : `Based on live audit signals, lead with ${services[0]?.label ?? "platform onboarding"} and quantify ROI against their current digital gaps.`}
                      </p>
                    </div>
                    {!audit ? null : (
                      <GenerateProspectReportButton prospectId={prospect.id} auditId={audit.id} />
                    )}
                  </div>
                  {services.length > 0 ? (
                    <ul className="mt-4 space-y-2">
                      {services.map((line) => (
                        <li
                          key={line.label}
                          className="flex items-start justify-between gap-4 border-b border-slate-800/70 pb-2 last:border-0 last:pb-0"
                        >
                          <div>
                            <p className="font-medium text-white">{line.label}</p>
                            <p className="mt-0.5 text-sm text-slate-400">{line.description}</p>
                          </div>
                          <span className="shrink-0 text-xs text-slate-500">{line.hint}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}

function buildServiceLines(health: number | null, industry: string | null) {
  if (health == null) return [];
  const lines = [
    {
      label: "Website Health & conversion",
      description: "Fix critical presence issues surfaced by the live probe.",
      hint: health < 50 ? "Priority" : "Recommended",
    },
    {
      label: "AI Visibility™ programme",
      description: "Entity clarity, structured data, and answer-engine readiness.",
      hint: health < 70 ? "High fit" : "Upsell",
    },
  ];
  if ((industry ?? "").toLowerCase().includes("real estate")) {
    lines.push({
      label: "Real Estate App",
      description: "Vendor/buyer pipeline, listings, and WordPress sync for the agency.",
      hint: "Industry",
    });
  } else if ((industry ?? "").toLowerCase().includes("accommodation") || (industry ?? "").toLowerCase().includes("hotel")) {
    lines.push({
      label: "Accommodation App",
      description: "Bookings, housekeeping, and OTA calendar sync.",
      hint: "Industry",
    });
  } else {
    lines.push({
      label: "CRM + Commerce starter",
      description: "Contacts, opportunities, and invoices on the DigitalGate core.",
      hint: "Foundation",
    });
  }
  return lines;
}
