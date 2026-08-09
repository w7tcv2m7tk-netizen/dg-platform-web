import Link from "next/link";
import type { CommandCentreOpsHome } from "@dg/platform-core";

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
  const {
    pulse,
    actions,
    billing,
    referEarn,
    connectors,
    clients,
    deepLinks,
    recentActivity,
  } = data;
  const prospectingToday = data.prospectingToday ?? {
    recommendedCount: 0,
    contactedToday: 0,
    conversations: 0,
    meetingsBooked: 0,
    stillRequireAction: 0,
    proposalPipelineCents: null,
    topBusinessName: null,
    topScore: null,
  };
  const attentionClients = clients.filter((c) => c.needsAttention).slice(0, 5);

  return (
    <div className="space-y-10">
      {/* Opportunity Engine — Today's Prospecting */}
      <section className="rounded-xl border border-sky-500/25 bg-sky-500/5 px-5 py-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-400">
              Today&apos;s Prospecting
            </p>
            <h2 className="mt-2 text-lg font-semibold text-white">Opportunity Engine</h2>
            <p className="mt-1 text-sm text-slate-400">
              Who to speak to today — ranked from audits, engagement, and fit. No invented MRR.
            </p>
          </div>
          <Link
            href="/command/growth-engine"
            className="text-sm text-sky-300 hover:underline"
          >
            Open Daily Briefing →
          </Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <PulseStat
            label="Recommended"
            value={prospectingToday.recommendedCount}
            href="/command/growth-engine"
          />
          <PulseStat
            label="Contacted today"
            value={prospectingToday.contactedToday}
            href="/command/growth-engine"
          />
          <PulseStat
            label="Conversations"
            value={prospectingToday.conversations}
            href="/command/growth-engine/pipeline"
          />
          <PulseStat
            label="Meetings booked"
            value={prospectingToday.meetingsBooked}
            href="/command/growth-engine/pipeline"
          />
        </div>
        <p className="mt-3 text-sm text-slate-400">
          {prospectingToday.stillRequireAction} still require action
          {prospectingToday.topBusinessName
            ? ` · Top: ${prospectingToday.topBusinessName}${
                prospectingToday.topScore != null ? ` (${prospectingToday.topScore}/100)` : ""
              }`
            : ""}
          {prospectingToday.proposalPipelineCents != null
            ? ` · Open proposals ${formatAudCents(prospectingToday.proposalPipelineCents)}`
            : ""}
        </p>
      </section>

      {/* Pulse */}
      <section>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-400">
          Platform pulse
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <PulseStat label="Organisations" value={pulse.organisations} href="/command/clients" />
          <PulseStat
            label="Leads this week"
            value={pulse.leadsThisWeek}
            sub={`${pulse.leads} total · ${pulse.openOpportunities} open opps`}
            href="/apps/crm/opportunities"
          />
          <PulseStat
            label="Listings live"
            value={pulse.listedProperties}
            sub={`${pulse.properties} properties`}
            href="/apps/re/listings"
          />
          <PulseStat
            label="Stay bookings"
            value={pulse.stayBookingsActive}
            sub={
              pulse.checkinsToday > 0
                ? `${pulse.checkinsToday} check-in${pulse.checkinsToday === 1 ? "" : "s"} today`
                : `${pulse.stayBookings} total`
            }
            href="/apps/accommodation/bookings"
          />
        </div>
      </section>

      {/* Today's actions */}
      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Today&apos;s actions</h2>
            <p className="mt-1 text-sm text-slate-400">
              What needs staff attention across the platform right now.
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

      {/* Cross-app + org health */}
      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="text-lg font-semibold text-white">Core apps</h2>
          <p className="mt-1 text-sm text-slate-400">Deep links into live Gen 2 surfaces.</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {deepLinks.map((link) => (
              <li key={link.id}>
                <Link
                  href={link.href}
                  className="block rounded-xl border border-slate-700/80 bg-slate-950/40 px-4 py-3 transition-colors hover:border-sky-500/40 hover:bg-slate-900/60"
                >
                  <p className="font-medium text-white">{link.label}</p>
                  <p className="mt-1 text-xs text-slate-400">{link.description}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">Org health</h2>
          <p className="mt-1 text-sm text-slate-400">
            Connectors, billing, and Refer &amp; Earn — platform-wide.
          </p>
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white">Connectors</p>
                <span
                  className={`text-xs ${connectors.stripeOk ? "text-emerald-400" : "text-amber-400"}`}
                >
                  Stripe {connectors.stripeMode}
                  {connectors.stripeOk ? " · ok" : " · needs setup"}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-400">
                WordPress configured on {connectors.wordpressConfiguredCount} org
                {connectors.wordpressConfiguredCount === 1 ? "" : "s"}
                {connectors.wordpressSyncedRecently > 0
                  ? ` · ${connectors.wordpressSyncedRecently} synced in 7d`
                  : ""}
              </p>
              <Link
                href="/command/platform-health"
                className="mt-3 inline-block text-sm text-sky-400 hover:underline"
              >
                Platform health →
              </Link>
            </div>

            <div className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white">Billing</p>
                <Link href="/command/revenue" className="text-sm text-sky-400 hover:underline">
                  Revenue →
                </Link>
              </div>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
                {billing.estimatedMrrLabel}
                <span className="ml-2 text-sm font-normal text-slate-500">est. MRR</span>
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {billing.activeSubscriptions} active subscription
                {billing.activeSubscriptions === 1 ? "" : "s"} · {billing.invoicePaidMtdLabel}{" "}
                invoices paid MTD · {billing.orgsWithBillingCustomer} Stripe customers
              </p>
            </div>

            <div className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white">Refer &amp; Earn</p>
                <Link
                  href="/dashboard/settings/referrals"
                  className="text-sm text-sky-400 hover:underline"
                >
                  Dashboard →
                </Link>
              </div>
              <p className="mt-2 text-sm text-slate-300">
                {referEarn.totalReferrals} referral{referEarn.totalReferrals === 1 ? "" : "s"} ·{" "}
                {referEarn.paid} paid · {formatAudCents(referEarn.creditsMtdCents)} credits MTD
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Clients needing attention + activity */}
      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Clients needing attention</h2>
              <p className="mt-1 text-sm text-slate-400">
                Lowest Success Score™ / needs-attention tier.
              </p>
            </div>
            <Link href="/command/clients" className="text-sm text-sky-400 hover:underline">
              Ranking →
            </Link>
          </div>
          {attentionClients.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No attention flags on recent tenants.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {attentionClients.map((client) => (
                <li
                  key={client.organisationId}
                  className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{client.organisationName}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {client.successScore != null ? `Score ${client.successScore} · ` : ""}
                        {client.status}
                        {client.industry ? ` · ${client.industry}` : ""} · {client.leadCount} leads
                      </p>
                      <p className="mt-2 text-sm text-amber-200/90">
                        {client.attentionReasons.slice(0, 2).join(" · ")}
                      </p>
                    </div>
                    <Link
                      href={`/command/advisor?org=${client.organisationId}`}
                      className="shrink-0 text-xs text-sky-400 hover:underline"
                    >
                      Advise
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">Recent activity</h2>
          <p className="mt-1 text-sm text-slate-400">Latest timeline events across organisations.</p>
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
                      <p className="text-sm text-white">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.organisationName}
                        {item.sourceApp ? ` · ${item.sourceApp}` : ""}
                      </p>
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
      </div>

      {/* Growth Engine teaser */}
      <section className="overflow-hidden rounded-2xl border border-sky-500/25 bg-gradient-to-br from-slate-950 via-slate-950 to-sky-950/40 px-6 py-6">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-400">
          Growth Engine™
        </p>
        <h2 className="mt-2 text-xl font-semibold text-white">Acquisition OS</h2>
        <p className="mt-2 max-w-xl text-sm text-slate-400">
          {data.growth.totalProspects} prospects · {data.growth.engagementsThisWeek} engagements
          this week ·{" "}
          {data.pulse.growthInPipeline} in active pipeline.
        </p>
        <Link
          href="/command/growth-engine"
          className="mt-4 inline-flex rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          Open Growth Engine
        </Link>
      </section>
    </div>
  );
}

function PulseStat({
  label,
  value,
  sub,
  href,
}: {
  label: string;
  value: number;
  sub?: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4 transition-colors hover:border-sky-500/35"
    >
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-white">{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
    </Link>
  );
}
