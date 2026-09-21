"use client";

import Link from "next/link";
import { useState } from "react";
import {
  buildCommandCockpitPresentation,
  clientIntelligencePresentation,
  type CommandCentreOpsHome,
  type SalesWeekPrompt,
} from "@dg/platform-core";

import { AiAdvisorPanel } from "@/components/command/AiAdvisorPanel";
import { SalesWeekNowBanner } from "@/components/command/SalesWeekNowBanner";

type AdvisorOrg = {
  organisationId: string;
  organisationName: string;
  successScore: number;
  scoreProvisional?: boolean;
  needsAttention?: boolean;
};

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

function LayerEyebrow({ index, label }: { index: string; label: string }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-300/80">
      <span className="mr-2 text-violet-500/80">{index}</span>
      {label}
    </p>
  );
}

function BriefingList({
  items,
}: {
  items: Array<{ id: string; text: string; href?: string }>;
}) {
  return (
    <ul className="mt-3 space-y-2.5">
      {items.map((item) => (
        <li key={item.id} className="text-sm leading-6 text-slate-300">
          {item.href ? (
            <Link href={item.href} className="transition hover:text-white">
              {item.text}
            </Link>
          ) : (
            item.text
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * DigitalGate operator cockpit — Act first, then understand the fleet.
 * Layers: Executive Pulse → Aida → Priorities → Customers → Commercial → Platform → Activity.
 */
export function CommandOpsHome({
  data,
  orgs,
  initialOrgId,
  intelligenceAvailable,
  salesPrompt,
}: {
  data: CommandCentreOpsHome;
  orgs: AdvisorOrg[];
  initialOrgId?: string;
  intelligenceAvailable: boolean;
  salesPrompt: SalesWeekPrompt;
}) {
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
    referEarn,
    prospectingToday,
    platformOperations,
    deliveryAlerts,
    today,
  } = data;
  const cockpit = buildCommandCockpitPresentation(data);

  const needsAttentionClients = clients.filter((c) => c.needsAttention).slice(0, 5);
  const foundingPhaseQuiet =
    growthEngine.prospects === 0 &&
    growthEngine.engagementsThisWeek === 0 &&
    growthEngine.activePipeline === 0;
  const revenueNote =
    billing.estimatedMrrCents === 0 && pulse.organisations > 0
      ? "Founding customers may not yet be on paid platform subscriptions."
      : null;
  const exceptionAlerts = (deliveryAlerts ?? []).filter(
    (alert) => alert.severity === "critical" || alert.severity === "warning",
  );
  const statusTone =
    cockpit.status === "critical"
      ? "text-rose-200"
      : cockpit.status === "attention"
        ? "text-amber-100"
        : "text-emerald-200";
  const statusDot =
    cockpit.status === "critical"
      ? "bg-rose-400 shadow-[0_0_18px_rgba(251,113,133,.85)]"
      : cockpit.status === "attention"
        ? "bg-amber-400 shadow-[0_0_18px_rgba(251,191,36,.7)]"
        : "bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,.8)]";

  return (
    <div className="space-y-16">
      <section id="command-executive-pulse" className="relative">
        <div
          className="pointer-events-none absolute -inset-x-4 -top-6 h-56 opacity-80"
          style={{
            background:
              "radial-gradient(ellipse at 12% 20%, rgba(124,58,237,.16), transparent 42%), radial-gradient(ellipse at 78% 0%, rgba(59,130,246,.12), transparent 38%)",
          }}
        />
        <div className="relative">
          <LayerEyebrow index="01" label="Executive Pulse" />
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2.5">
                <span className={`h-2.5 w-2.5 rounded-full ${statusDot}`} />
                <h2 className={`text-2xl font-semibold tracking-tight ${statusTone}`}>
                  {cockpit.statusLabel}
                </h2>
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                {cockpit.statusDetail}
              </p>
            </div>
            <p className="text-xs text-slate-500">{cockpit.generatedLabel}</p>
          </div>

          <div className="mt-8 grid gap-8 border-t border-white/5 pt-8 sm:grid-cols-2 xl:grid-cols-6">
            {cockpit.pulseMetrics.map((metric) => (
              <Link
                key={metric.id}
                href={metric.href}
                className="group min-w-0"
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                  {metric.label}
                </p>
                <p
                  className={`mt-2 font-semibold tracking-tight text-white transition group-hover:text-violet-200 ${
                    metric.available ? "text-3xl" : "text-2xl text-slate-500"
                  }`}
                >
                  {metric.value}
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-500">{metric.detail}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="command-advisor" className="relative">
        <div
          className="pointer-events-none absolute inset-x-0 -top-8 h-40"
          style={{
            background:
              "radial-gradient(ellipse at 88% 30%, rgba(167,139,250,.14), transparent 46%)",
          }}
        />
        <div className="relative">
          <LayerEyebrow index="02" label="Aida Intelligence" />
          <div className="mt-4 grid items-start gap-10 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <div>
              <div className="flex items-start gap-5">
                <img
                  src="/aida/aida-thinking.webp"
                  alt="Aida, DigitalGate intelligence"
                  className="hidden h-28 w-28 shrink-0 object-contain object-bottom drop-shadow-[0_16px_30px_rgba(124,58,237,.28)] sm:block"
                />
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-white">
                    Executive briefing
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                    {cockpit.briefingHeadline}
                  </p>
                </div>
              </div>

              <div className="mt-8 grid gap-8 sm:grid-cols-2">
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    What changed
                  </h3>
                  <BriefingList items={cockpit.whatChanged} />
                </div>
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200/80">
                    What needs attention
                  </h3>
                  <BriefingList items={cockpit.needsAttention} />
                </div>
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300/80">
                    Opportunities
                  </h3>
                  <BriefingList items={cockpit.opportunities} />
                </div>
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-300/80">
                    Recommended next actions
                  </h3>
                  <BriefingList items={cockpit.nextActions} />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white">Ask Aida</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Reason across Customer Intelligence and live platform signals without leaving Command.
              </p>
              <div className="mt-5">
                {intelligenceAvailable ? (
                  <AiAdvisorPanel orgs={orgs} initialOrgId={initialOrgId} compact />
                ) : (
                  <div className="border-l border-amber-400/40 pl-4 text-sm leading-6 text-amber-100">
                    Operator intelligence is temporarily unavailable. Live priorities and platform
                    diagnostics remain available below.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="command-priorities">
        <LayerEyebrow index="03" label="Priorities & Alerts" />
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
          What needs your attention
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          Ranked actions for DigitalGate staff — not customer industry operations.
        </p>

        <div className="mt-6">
          <SalesWeekNowBanner prompt={salesPrompt} compact />
        </div>

        {today.length > 0 ? (
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-300">
            {today.map((item) => (
              <li key={item.id}>
                <Link href={item.href} className="transition hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        <div id="command-attention" className="mt-6">
          {actions.length === 0 ? (
            <p className="text-sm leading-6 text-emerald-200/90">
              No urgent platform actions — cockpit is quiet.
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {actions.slice(0, 6).map((action) => {
                const tone =
                  action.severity === "urgent"
                    ? "border-rose-400 text-rose-100"
                    : action.severity === "today"
                      ? "border-amber-300 text-amber-50"
                      : "border-slate-600 text-slate-300";
                return (
                  <li key={action.id}>
                    <Link
                      href={action.href}
                      className={`flex min-h-11 items-start justify-between gap-4 border-l-2 py-4 pl-4 transition hover:bg-white/[0.03] ${tone}`}
                    >
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-70">
                          {action.severity}
                        </p>
                        <p className="mt-1 text-sm font-medium text-white">{action.title}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-400">{action.detail}</p>
                      </div>
                      <span className="shrink-0 pt-1 text-sm text-violet-200">Open →</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {exceptionAlerts.length > 0 ? (
          <ul className="mt-6 space-y-3">
            {exceptionAlerts.map((alert) => (
              <li key={alert.id}>
                <Link
                  href={alert.href}
                  className={`block border-l-2 py-2 pl-4 text-sm leading-6 ${
                    alert.severity === "critical"
                      ? "border-rose-400 text-rose-100"
                      : "border-amber-300 text-amber-50"
                  }`}
                >
                  {alert.message}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section id="command-customers">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <LayerEyebrow index="04" label="Customers & Growth" />
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
              {organisationHealth.needsAttentionCount} organisation
              {organisationHealth.needsAttentionCount === 1 ? "" : "s"} requiring attention
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {organisationHealth.organisationsWithSufficientData}/
              {organisationHealth.totalOrganisations} organisations with sufficient data · Average
              organisation health {organisationHealth.averageHealthLabel}
            </p>
          </div>
          <Link
            href="/command/clients"
            className="inline-flex min-h-11 items-center text-sm text-violet-200 hover:text-white"
          >
            Open Client Intelligence →
          </Link>
        </div>

        {needsAttentionClients.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">All tracked organisations look stable.</p>
        ) : (
          <ul className="mt-6 divide-y divide-white/5">
            {needsAttentionClients.map((client) => {
              const presentation = clientIntelligencePresentation(client);
              return (
                <li key={client.organisationId}>
                  <Link
                    href={`/command/clients/${client.organisationId}`}
                    className="flex min-h-11 flex-wrap items-center justify-between gap-3 py-4 transition hover:text-white"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">{client.organisationName}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        {presentation.summary}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-medium uppercase tracking-[0.14em] text-amber-200">
                      Review →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-10 grid gap-8 border-t border-white/5 pt-8 sm:grid-cols-2 xl:grid-cols-4">
          <Link href={growthEngine.href} className="group">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Prospecting</p>
            <p className="mt-2 text-xl font-semibold text-white group-hover:text-violet-200">
              {growthEngine.prospects} active prospects
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {foundingPhaseQuiet
                ? "Founding pipeline managed manually"
                : `${growthEngine.engagementsThisWeek} engagements this week`}
            </p>
          </Link>
          <Link href="/command/partners" className="group">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Partners</p>
            <p className="mt-2 text-xl font-semibold text-white group-hover:text-violet-200">
              {partnerPulse.foundingResellers} active · {partnerPulse.referredCustomers} referred
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {partnerPulse.onboardingCount} partner onboarding · {partnerPulse.activeProspects}{" "}
              prospects
            </p>
          </Link>
          <Link href="/command/growth-engine" className="group">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Growth pipeline</p>
            <p className="mt-2 text-xl font-semibold text-white group-hover:text-violet-200">
              {growthEngine.activePipeline} in pipeline
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {growthEngine.topPriorityLabel
                ? `Next · ${growthEngine.topPriorityLabel}`
                : "No ranked prospect in this snapshot"}
            </p>
          </Link>
          <Link href="/apps/prospecting" className="group">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              Prospecting today
            </p>
            {prospectingToday ? (
              <>
                <p className="mt-2 text-xl font-semibold text-white group-hover:text-violet-200">
                  {prospectingToday.stillRequireAction} still require action
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {prospectingToday.recommendedCount} recommended · {prospectingToday.contactedToday}{" "}
                  contacted · {prospectingToday.meetingsBooked} meetings
                </p>
              </>
            ) : (
              <>
                <p className="mt-2 text-xl font-semibold text-slate-500">—</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Daily briefing is not in this snapshot
                </p>
              </>
            )}
          </Link>
        </div>
      </section>

      <section id="command-commercial">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <LayerEyebrow index="05" label="Revenue / Commercial" />
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
              {billing.estimatedMrrLabel} recurring
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Live Commerce subscriptions and paid invoices — not inferred Growth Engine revenue.
            </p>
          </div>
          <Link
            href="/command/revenue"
            className="inline-flex min-h-11 items-center text-sm text-violet-200 hover:text-white"
          >
            Open Revenue →
          </Link>
        </div>

        <div className="mt-8 grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
          <Link href="/command/revenue" className="group">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">MRR</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-white group-hover:text-violet-200">
              {billing.estimatedMrrLabel}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {billing.activeSubscriptions} active subscriptions
            </p>
          </Link>
          <Link href="/command/revenue" className="group">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Invoiced MTD</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-white group-hover:text-violet-200">
              {billing.invoicePaidMtdLabel}
            </p>
            <p className="mt-2 text-xs text-slate-500">Paid invoices this month</p>
          </Link>
          <Link href="/command/referrals" className="group">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Refer & Earn</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-white group-hover:text-violet-200">
              {referEarn.paid}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {referEarn.totalReferrals} referrals · {referEarn.signedUp} signed up
            </p>
          </Link>
          <Link
            href={billing.stripeOk ? "/command/revenue" : "/dashboard/settings/billing"}
            className="group"
          >
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Stripe</p>
            <p
              className={`mt-2 text-3xl font-semibold tracking-tight group-hover:text-violet-200 ${
                billing.stripeOk ? "text-white" : "text-amber-200"
              }`}
            >
              {billing.stripeMode}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {billing.orgsWithBillingCustomer} orgs with billing customer
              {billing.stripeOk ? "" : " · needs setup"}
            </p>
          </Link>
        </div>
        {revenueNote ? <p className="mt-5 text-xs text-slate-500">{revenueNote}</p> : null}
      </section>

      <section id="command-platform">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <LayerEyebrow index="06" label="Platform & Delivery Health" />
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
              {delivery.blocked > 0
                ? `${delivery.blocked} delivery blocked`
                : delivery.activeImplementations > 0
                  ? `${delivery.activeImplementations} implementations in flight`
                  : "Delivery is quiet"}
            </h2>
          </div>
          <Link
            href="/command/platform-health"
            className="inline-flex min-h-11 items-center text-sm text-violet-200 hover:text-white"
          >
            Platform health →
          </Link>
        </div>

        {delivery.blocked > 0 ? (
          <Link
            href="/command/delivery"
            className="mt-6 block border-l-2 border-rose-400 py-2 pl-4 text-sm leading-6 text-rose-100"
          >
            {delivery.blocked} implementation{delivery.blocked === 1 ? "" : "s"} blocked — open
            Delivery.
          </Link>
        ) : null}

        <div className="mt-8 grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
          <Link href="/command/delivery" className="group">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Delivery</p>
            <p className="mt-2 text-xl font-semibold text-white group-hover:text-violet-200">
              {delivery.activeImplementations} active
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {delivery.activeImplementations === 0
                ? "No implementations in flight"
                : `${delivery.awaitingCustomerInfo} awaiting info · ${delivery.readyForGoLive} ready for go-live`}
            </p>
          </Link>
          <Link href="/command/platform-health" className="group">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Connectors</p>
            <p className="mt-2 text-xl font-semibold text-white group-hover:text-violet-200">
              {connectors.wordpressConfiguredCount} configured
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {connectors.wordpressSyncedRecently} synced recently · Stripe{" "}
              {connectors.stripeMode}
              {connectors.stripeOk ? "" : " · needs setup"}
            </p>
          </Link>
          <Link href="/command/delivery" className="group">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Training / QA</p>
            <p className="mt-2 text-xl font-semibold text-white group-hover:text-violet-200">
              {delivery.inTraining} training · {delivery.inQa} QA
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {delivery.readyForGoLive} ready for go-live
            </p>
          </Link>
          <Link href="/command/partners" className="group">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              Partner delivery
            </p>
            <p className="mt-2 text-xl font-semibold text-white group-hover:text-violet-200">
              {partnerPulse.onboardingCount} onboarding
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Partner-referred onboarding — not a platform trial count
            </p>
          </Link>
        </div>

        <div className="mt-10 space-y-6 border-t border-white/5 pt-8">
          {platformOperations.map((group) => (
            <div key={group.id}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                {group.label}
              </p>
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                {group.links.map((link) => (
                  <li key={link.id}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-400 transition hover:text-white"
                      title={link.description}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section id="command-activity">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <LayerEyebrow index="07" label="Recent Activity" />
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
              Live events across the platform
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setShowTechnicalActivity((v) => !v)}
            className="inline-flex min-h-11 items-center text-sm text-violet-200 hover:text-white"
          >
            {showTechnicalActivity ? "Hide technical activity" : "View technical activity →"}
          </button>
        </div>
        {recentActivity.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">No recent activity logged yet.</p>
        ) : (
          <ul className="mt-6 space-y-0">
            {recentActivity.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-1 border-l border-white/10 py-4 pl-4 sm:grid sm:grid-cols-[88px_minmax(0,1fr)_auto] sm:items-start sm:gap-4"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {activityCategory(item)}
                </p>
                <div>
                  <p className="text-sm text-white">
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
    </div>
  );
}
