"use client";

import Link from "next/link";
import { useState } from "react";
import type { CommandCentreOpsHome } from "@dg/platform-core";
import { clientIntelligencePresentation } from "@dg/platform-core";

function severityClass(severity: string) {
  if (severity === "urgent") return "border-rose-500/40 text-rose-200";
  if (severity === "today") return "border-amber-500/35 text-amber-100";
  return "border-slate-600 text-slate-300";
}

function severityEmoji(severity: string) {
  if (severity === "urgent") return "🔴";
  if (severity === "today") return "🟠";
  return "🟡";
}

function relativeTime(iso: string) {
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return "just now";
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function activityCategory(item: {
  sourceApp: string | null;
  humanTitle: string;
}): string {
  const app = (item.sourceApp ?? "").toLowerCase();
  const title = item.humanTitle.toLowerCase();
  if (app.includes("crm") || title.includes("contact") || title.includes("opportunity")) {
    return "CRM";
  }
  if (app.includes("commerce") || title.includes("subscription")) return "Commerce";
  if (app.includes("seo") || title.includes("seo") || title.includes("audit")) return "SEO";
  if (app.includes("automation") || title.includes("automation")) return "Automation";
  if (app.includes("founding")) return "Founding";
  return "Platform";
}

export function CommandOpsHome({ data }: { data: CommandCentreOpsHome }) {
  const [showTechnicalActivity, setShowTechnicalActivity] = useState(false);
  const {
    pulse,
    organisationHealth,
    actions,
    billing,
    connectors,
    clients,
    recentActivity,
    delivery,
    partnerPulse,
    growthEngine,
  } = data;

  const needsAttentionClients = clients.filter((c) => c.needsAttention).slice(0, 5);
  const foundingPhaseQuiet =
    growthEngine.prospects === 0 &&
    growthEngine.engagementsThisWeek === 0 &&
    growthEngine.activePipeline === 0;
  const revenueNote =
    billing.estimatedMrrCents === 0 && pulse.organisations > 0
      ? "Founding customers may not yet be on paid platform subscriptions."
      : null;

  return (
    <div className="space-y-8">
      {/* Platform pulse */}
      <section className="rounded-xl border border-sky-500/20 bg-slate-950/50 px-5 py-5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-400">
          Platform pulse
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <PulseChip label="Customers" value={pulse.organisations} href="/command/clients" />
          <PulseChip label="New leads" value={pulse.leadsThisWeek} href="/command/opportunities" />
          <PulseChip
            label="Open opportunities"
            value={pulse.openOpportunities}
            href="/command/opportunities"
          />
          <PulseChip
            label="Growth prospects"
            value={pulse.growthProspects}
            href="/command/growth-engine"
          />
          <PulseChip label="MRR" value={billing.estimatedMrrLabel} href="/command/revenue" isText />
        </div>
        <p className="mt-4 text-xs text-slate-500">
          {organisationHealth.organisationsWithSufficientData}/
          {organisationHealth.totalOrganisations} organisations with sufficient data · Average
          organisation health {organisationHealth.averageHealthLabel}
        </p>
      </section>

      {/* What needs attention */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">What needs your attention</h2>
            <p className="mt-1 text-sm text-slate-400">
              Ranked platform actions — not customer industry operations.
            </p>
          </div>
          {actions.length > 0 ? (
            <Link href="#command-attention" className="text-sm text-sky-400 hover:underline">
              Open priorities →
            </Link>
          ) : null}
        </div>
        <div id="command-attention" className="mt-4">
          {actions.length === 0 ? (
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-4 text-sm text-emerald-100">
              No urgent platform actions — cockpit is quiet.
            </div>
          ) : (
            <ul className="space-y-2">
              {actions.slice(0, 6).map((action) => (
                <li key={action.id}>
                  <Link
                    href={action.href}
                    className={`flex items-start justify-between gap-4 rounded-xl border bg-slate-950/50 px-4 py-3 transition-colors hover:bg-slate-900 ${severityClass(action.severity)}`}
                  >
                    <div>
                      <p className="text-sm font-medium text-white">
                        {severityEmoji(action.severity)} {action.title}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">{action.detail}</p>
                    </div>
                    <span className="shrink-0 text-sm text-sky-400">Open →</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Customer intelligence */}
      <section className="rounded-xl border border-violet-500/20 bg-slate-950/40 px-5 py-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-400">
              Customer intelligence
            </p>
            <h2 className="mt-2 text-lg font-semibold text-white">
              {organisationHealth.needsAttentionCount} organisation
              {organisationHealth.needsAttentionCount === 1 ? "" : "s"} need attention
            </h2>
          </div>
          <Link href="/command/clients" className="text-sm text-sky-400 hover:underline">
            Open Client Intelligence →
          </Link>
        </div>
        {needsAttentionClients.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">All tracked organisations look stable.</p>
        ) : (
          <ul className="mt-4 flex flex-wrap gap-2">
            {needsAttentionClients.map((client) => (
              <li key={client.organisationId}>
                <Link
                  href={`/command/clients/${client.organisationId}`}
                  className="inline-flex rounded-full border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-sm text-slate-200 hover:border-violet-500/40 hover:text-white"
                >
                  {client.organisationName}
                </Link>
              </li>
            ))}
          </ul>
        )}
        {needsAttentionClients.length > 0 ? (
          <ul className="mt-4 space-y-2 border-t border-slate-800 pt-4">
            {needsAttentionClients.slice(0, 3).map((client) => {
              const presentation = clientIntelligencePresentation(client);
              return (
                <li key={`detail-${client.organisationId}`} className="text-sm text-slate-400">
                  <span className="font-medium text-slate-200">{client.organisationName}</span>
                  {" — "}
                  {presentation.summary}
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>

      {/* Operating pulse — compact cockpit strip */}
      <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
          Operating pulse
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <OperatingCell
            label="Delivery"
            value={`${delivery.activeImplementations} active`}
            href="/command/delivery"
            detail={
              delivery.activeImplementations === 0
                ? "No implementations in flight"
                : undefined
            }
          />
          <OperatingCell
            label="Partners"
            value={`${partnerPulse.foundingResellers} active · ${partnerPulse.referredCustomers} referred`}
            href="/command/partners"
          />
          <OperatingCell
            label="Revenue"
            value={`${billing.estimatedMrrLabel} MRR`}
            href="/command/revenue"
            detail={`${billing.activeSubscriptions} active subscriptions · Stripe ${connectors.stripeMode}${connectors.stripeOk ? "" : " · needs setup"}`}
          />
          <OperatingCell
            label="Platform"
            value={`${connectors.wordpressConfiguredCount} connectors`}
            href="/command/platform-health"
            detail={`${connectors.orgsWithBillingCustomer} orgs with billing customer`}
          />
        </div>
        {revenueNote ? (
          <p className="mt-3 text-xs text-slate-500">{revenueNote}</p>
        ) : null}
      </section>

      {/* Growth Engine */}
      <section className="rounded-xl border border-sky-500/20 bg-slate-950/40 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-400">
              Growth Engine™
            </p>
            <p className="mt-1 text-lg font-semibold text-white">
              {growthEngine.prospects} active prospect
              {growthEngine.prospects === 1 ? "" : "s"}
            </p>
            {foundingPhaseQuiet ? (
              <p className="mt-1 text-sm text-slate-400">
                Founding pipeline currently managed manually — zero in-engine activity is expected
                during closed beta.
              </p>
            ) : (
              <p className="mt-1 text-sm text-slate-400">
                {growthEngine.engagementsThisWeek} engagements this week ·{" "}
                {growthEngine.activePipeline} in pipeline
              </p>
            )}
          </div>
          <Link
            href={growthEngine.href}
            className="text-sm font-medium text-sky-400 hover:underline"
          >
            Open Growth Engine →
          </Link>
        </div>
      </section>

      {/* Recent platform activity */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Recent platform activity</h2>
            <p className="mt-1 text-sm text-slate-400">
              Live events across customer organisations.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowTechnicalActivity((v) => !v)}
            className="text-sm text-sky-400 hover:underline"
          >
            {showTechnicalActivity ? "Hide technical activity" : "View technical activity →"}
          </button>
        </div>
        {recentActivity.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No recent activity logged yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {recentActivity.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-slate-700/80 bg-slate-950/40 px-4 py-3"
              >
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {activityCategory(item)}
                  </p>
                  <p className="mt-0.5 text-sm text-white">
                    {showTechnicalActivity ? item.technicalTitle : item.humanTitle}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{item.organisationName}</p>
                </div>
                <span className="shrink-0 text-xs text-slate-500">
                  {relativeTime(item.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* AI Advisor */}
      <section className="rounded-xl border border-violet-500/25 bg-violet-500/5 px-5 py-5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-400">
          AI Advisor
        </p>
        <h2 className="mt-2 text-lg font-semibold text-white">
          What should DigitalGate focus on today?
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Turn live signals into assessment, priorities and recommended actions.
        </p>
        <Link
          href="/command/advisor"
          className="mt-4 inline-flex rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
        >
          Open AI Advisor
        </Link>
      </section>
    </div>
  );
}

function PulseChip({
  label,
  value,
  href,
  isText,
}: {
  label: string;
  value: number | string;
  href: string;
  isText?: boolean;
}) {
  return (
    <Link href={href} className="group">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={`mt-0.5 font-semibold tracking-tight text-white group-hover:text-sky-300 ${
          isText ? "text-xl" : "text-2xl"
        }`}
      >
        {value}
      </p>
    </Link>
  );
}

function OperatingCell({
  label,
  value,
  href,
  detail,
}: {
  label: string;
  value: string;
  href: string;
  detail?: string;
}) {
  return (
    <Link href={href} className="group block rounded-lg border border-slate-800/80 px-3 py-3 hover:border-slate-600">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white group-hover:text-sky-300">{value}</p>
      {detail ? <p className="mt-1 text-xs text-slate-500">{detail}</p> : null}
    </Link>
  );
}
