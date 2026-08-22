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

function formatAudCents(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
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

export function CommandOpsHome({ data }: { data: CommandCentreOpsHome }) {
  const [showTechnicalActivity, setShowTechnicalActivity] = useState(false);
  const {
    pulse,
    today,
    organisationHealth,
    actions,
    billing,
    referEarn,
    connectors,
    clients,
    platformOperations,
    recentActivity,
    delivery,
    partnerPulse,
    growthEngine,
  } = data;

  const intelligencePreview = clients.slice(0, 4);
  const deliveryAlerts = data.deliveryAlerts ?? [];

  return (
    <div className="space-y-10">
      {/* Platform Pulse */}
      <section className="rounded-xl border border-sky-500/20 bg-slate-950/50 px-5 py-5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-400">
          Platform pulse
        </p>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
          <PulseChip label="Organisations" value={pulse.organisations} href="/command/clients" />
          <PulseChip label="New leads" value={pulse.leadsThisWeek} href="/command/opportunities" />
          <PulseChip
            label="Open opportunities"
            value={pulse.openOpportunities}
            href="/command/opportunities"
          />
          <PulseChip
            label="Growth Engine prospects"
            value={pulse.growthProspects}
            href="/command/growth-engine"
          />
          <PulseChip
            label="MRR"
            value={billing.estimatedMrrLabel}
            href="/command/revenue"
            isText
          />
        </div>
        <p className="mt-4 text-xs text-slate-500">
          {organisationHealth.organisationsWithSufficientData}/{organisationHealth.totalOrganisations}{" "}
          organisations with sufficient data · Average health:{" "}
          {organisationHealth.averageHealthLabel}
        </p>
      </section>

      {/* Today */}
      <section>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-400">Today</p>
        {today.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No platform priorities flagged for today.</p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-3">
            {today.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-2 text-sm font-medium text-amber-50 transition hover:bg-amber-500/10"
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* What needs attention */}
      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">What needs your attention now</h2>
            <p className="mt-1 text-sm text-slate-400">
              AI-ranked actions for the DigitalGate team — platform operations only.
            </p>
          </div>
        </div>
        {actions.length === 0 ? (
          <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-5 text-sm text-emerald-100">
            No urgent actions — platform looks quiet. Check Growth Engine for pipeline work.
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {actions.map((action) => (
              <li key={action.id}>
                <Link
                  href={action.href}
                  className={`flex items-start justify-between gap-4 rounded-xl border bg-slate-950/50 px-4 py-3 transition-colors hover:bg-slate-900 ${severityClass(action.severity)}`}
                >
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
                      {action.severity}
                    </p>
                    <p className="mt-0.5 font-medium text-white">{action.title}</p>
                    <p className="mt-1 text-sm text-slate-400">{action.detail}</p>
                  </div>
                  <span className="shrink-0 text-sm text-sky-400">Open →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Client Intelligence */}
        <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-400">
                Client Intelligence
              </p>
              <h2 className="mt-2 text-lg font-semibold text-white">
                {organisationHealth.needsAttentionCount} organisation
                {organisationHealth.needsAttentionCount === 1 ? "" : "s"} need attention
              </h2>
            </div>
            <Link href="/command/clients" className="text-sm text-sky-400 hover:underline">
              View Client Intelligence →
            </Link>
          </div>
          <ul className="mt-4 space-y-3">
            {intelligencePreview.map((client) => {
              const presentation = clientIntelligencePresentation(client);
              return (
                <li
                  key={client.organisationId}
                  className="rounded-lg border border-slate-700/60 bg-slate-950/50 px-4 py-3"
                >
                  <div className="flex items-start gap-2">
                    <span aria-hidden>{presentation.statusEmoji}</span>
                    <div>
                      <p className="font-medium text-white">{client.organisationName}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{presentation.category}</p>
                      <p className="mt-1 text-sm text-slate-300">{presentation.summary}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Delivery */}
        <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-400">
                Delivery
              </p>
              <h2 className="mt-2 text-lg font-semibold text-white">
                {delivery.activeImplementations} active implementation
                {delivery.activeImplementations === 1 ? "" : "s"}
              </h2>
            </div>
            <Link href="/command/delivery" className="text-sm text-emerald-300 hover:underline">
              Open Delivery →
            </Link>
          </div>
          <ul className="mt-4 space-y-1 text-sm text-slate-300">
            {delivery.awaitingCustomerInfo > 0 ? (
              <li>{delivery.awaitingCustomerInfo} awaiting customer information</li>
            ) : null}
            {delivery.blocked > 0 ? <li>{delivery.blocked} blocked</li> : null}
            {delivery.inTraining > 0 ? <li>{delivery.inTraining} in training</li> : null}
            {delivery.inQa > 0 ? <li>{delivery.inQa} in QA</li> : null}
            {delivery.readyForGoLive > 0 ? (
              <li>{delivery.readyForGoLive} ready for go-live</li>
            ) : null}
            {delivery.activeImplementations === 0 ? (
              <li className="text-slate-500">No active implementations yet.</li>
            ) : null}
          </ul>
          {deliveryAlerts.length > 0 ? (
            <ul className="mt-4 space-y-2 border-t border-emerald-500/15 pt-4">
              {deliveryAlerts.slice(0, 3).map((alert) => (
                <li key={alert.id}>
                  <Link href={alert.href} className="text-sm text-emerald-100 hover:underline">
                    {alert.message}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Partner Pulse */}
        <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-fuchsia-400">
                Partner pulse
              </p>
              <h2 className="mt-2 text-lg font-semibold text-white">
                {partnerPulse.foundingResellers} founding reseller
                {partnerPulse.foundingResellers === 1 ? "" : "s"}
              </h2>
            </div>
            <Link href="/command/partners" className="text-sm text-sky-400 hover:underline">
              Open Resellers →
            </Link>
          </div>
          <ul className="mt-4 space-y-1 text-sm text-slate-300">
            <li>{partnerPulse.activeProspects} active prospects</li>
            <li>{partnerPulse.referredCustomers} referred customers</li>
            {partnerPulse.onboardingCount > 0 ? (
              <li>{partnerPulse.onboardingCount} onboarding</li>
            ) : null}
            {partnerPulse.pendingCommissionsCents > 0 ? (
              <li>{formatAudCents(partnerPulse.pendingCommissionsCents)} expected commissions</li>
            ) : null}
          </ul>
        </section>

        {/* Platform Alerts */}
        <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
            Platform alerts
          </p>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            <p>
              {connectors.wordpressConfiguredCount} connector
              {connectors.wordpressConfiguredCount === 1 ? "" : "s"} configured · Stripe{" "}
              {connectors.stripeMode}
              {connectors.stripeOk ? " · ok" : " · needs setup"}
            </p>
            <p>
              {billing.activeSubscriptions} subscription
              {billing.activeSubscriptions === 1 ? "" : "s"} · {billing.estimatedMrrLabel} MRR
            </p>
            <p>
              {referEarn.totalReferrals} referral{referEarn.totalReferrals === 1 ? "" : "s"} ·{" "}
              {referEarn.paid} paid
            </p>
          </div>
          <Link
            href="/command/platform-health"
            className="mt-4 inline-block text-sm text-sky-400 hover:underline"
          >
            Open Platform Alerts →
          </Link>
        </section>
      </div>

      {/* Growth Engine */}
      <section className="overflow-hidden rounded-2xl border border-sky-500/25 bg-gradient-to-br from-slate-950 via-slate-950 to-sky-950/40 px-6 py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-400">
              Growth Engine™
            </p>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-300">
              <span>{growthEngine.prospects} prospects</span>
              <span>{growthEngine.engagementsThisWeek} engagements this week</span>
              <span>{growthEngine.activePipeline} active opportunities</span>
            </div>
            {growthEngine.topPriorityLabel ? (
              <p className="mt-3 text-sm text-sky-100">
                Today&apos;s priority: {growthEngine.topPriorityLabel}
                {growthEngine.topPriorityScore != null
                  ? ` — ${growthEngine.topPriorityScore}/100`
                  : ""}
              </p>
            ) : null}
          </div>
          <Link
            href={growthEngine.href}
            className="inline-flex rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
          >
            Open Growth Engine
          </Link>
        </div>
      </section>

      {/* Revenue */}
      <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">Revenue</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
              {billing.estimatedMrrLabel}
              <span className="ml-2 text-sm font-normal text-slate-500">est. MRR</span>
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {billing.activeSubscriptions} subscriptions · {billing.invoicePaidMtdLabel} paid MTD
            </p>
          </div>
          <Link href="/command/revenue" className="text-sm text-sky-400 hover:underline">
            Open Revenue →
          </Link>
        </div>
      </section>

      {/* Recent Activity */}
      <section>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Recent activity</h2>
            <p className="mt-1 text-sm text-slate-400">Human-readable platform events.</p>
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
                className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-white">
                      {showTechnicalActivity ? item.technicalTitle : item.humanTitle}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{item.organisationName}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-500">
                    {relativeTime(item.createdAt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Platform Operations */}
      <section>
        <h2 className="text-lg font-semibold text-white">Platform operations</h2>
        <p className="mt-1 text-sm text-slate-400">
          Orchestrate the platform — not a duplicate of the side panel.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {platformOperations.map((group) => (
            <div
              key={group.id}
              className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-4 py-4"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {group.label}
              </p>
              <ul className="mt-3 space-y-2">
                {group.links.map((link) => (
                  <li key={link.id}>
                    <Link href={link.href} className="group block">
                      <p className="text-sm font-medium text-white group-hover:text-sky-300">
                        {link.label} →
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">{link.description}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* AI Advisor */}
      <section className="rounded-xl border border-violet-500/25 bg-violet-500/5 px-5 py-5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-400">
          AI Advisor
        </p>
        <h2 className="mt-2 text-lg font-semibold text-white">
          What should the DigitalGate team focus on today?
        </h2>
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
    <Link href={href} className="group min-w-[7rem]">
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
