import Link from "next/link";
import type { PartnerDashboardWorkspace } from "@dg/platform-core";

import { InviteFoundingResellerForm } from "@/components/founding/InviteFoundingResellerForm";

function formatAud(cents: number) {
  return (cents / 100).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });
}

function severityIcon(severity: "amber" | "yellow" | "none") {
  if (severity === "amber") return "🟠";
  if (severity === "yellow") return "🟡";
  return "·";
}

export function PartnerProgrammeDashboard({ data }: { data: PartnerDashboardWorkspace }) {
  const {
    pulse,
    attention,
    foundingSeats,
    resellers,
    deliveryPartners,
    recentActivity,
    deliveryPulse,
  } = data;

  const activeAcquisition = resellers.filter((r) => r.status === "active").length;
  const activeDelivery = deliveryPartners.filter((r) => r.status === "active").length;
  const acquisitionProspects = resellers.filter((r) => r.status === "pending").length;
  const deliveryOnboarding = deliveryPartners.filter((r) => r.status === "pending").length;

  return (
    <>
      <header className="dg-page-header">
        <Link href="/command" className="text-sm text-sky-400 hover:underline">
          ← Command Centre
        </Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-sky-400">
          Partners
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Partner Network</h1>
        <p className="mt-3 max-w-2xl text-base text-slate-200">
          Operating layer for Acquisition Partners, Delivery Partners, ecosystem relationships,
          referrals and commissions.
        </p>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Acquisition Partners bring customers in. Delivery Partners implement and onboard them.
          Founding 10 remains the customer programme — separate from partner status.
        </p>
      </header>

      <main className="dg-page-main space-y-8">
        {/* What needs attention */}
        <section className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-5 py-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-200/90">
            What needs your attention
          </p>
          {attention.length === 0 ? (
            <p className="mt-3 text-sm text-slate-300">No partner interventions required.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {attention.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-start justify-between gap-3 border-b border-amber-500/10 pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm text-slate-200">
                      <span aria-hidden>{severityIcon(item.severity)} </span>
                      {item.title}
                    </p>
                    {item.detail ? (
                      <p className="mt-1 text-xs text-slate-500">{item.detail}</p>
                    ) : null}
                  </div>
                  <Link href={item.href} className="text-xs text-sky-400 hover:underline shrink-0">
                    {item.cta} →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Division command centres */}
        <div className="grid gap-6 xl:grid-cols-2">
          <DivisionPanel
            title="Acquisition Partners"
            subtitle="Bring customers into DigitalGate"
            href="/command/partners/acquisition"
            hrefLabel="Open Acquisition Partners"
            metrics={[
              { label: "Active partners", value: String(activeAcquisition) },
              { label: "Prospects / pending", value: String(acquisitionProspects) },
              { label: "Referrals this month", value: String(pulse.referralsThisMonth) },
              { label: "Customers acquired", value: String(pulse.customersReferred) },
              {
                label: "Platform revenue referred",
                value:
                  pulse.mrrReferredCents == null ? "—" : formatAud(pulse.mrrReferredCents),
                hint:
                  pulse.mrrReferredCents == null
                    ? "Billing attribution lands with subscription linkage"
                    : undefined,
              },
              { label: "Commissions owing", value: formatAud(pulse.commissionOwingCents) },
              {
                label: "Channel conversion",
                value: pulse.conversionRate == null ? "—" : `${pulse.conversionRate}%`,
              },
            ]}
          />
          <DivisionPanel
            title="Delivery Partners"
            subtitle="Implement and onboard customers"
            href="/command/delivery"
            hrefLabel="Open Delivery Partners"
            metrics={[
              { label: "Active partners", value: String(activeDelivery) },
              { label: "Onboarding / pending", value: String(deliveryOnboarding) },
              {
                label: "Customers in implementation",
                value: String(deliveryPulse.customersInImplementation),
              },
              {
                label: "Active projects",
                value: String(deliveryPulse.activeProjects),
              },
              {
                label: "Projects at risk",
                value: String(deliveryPulse.projectsAtRisk),
                tone: deliveryPulse.projectsAtRisk > 0 ? "amber" : undefined,
              },
              {
                label: "Service revenue",
                value:
                  deliveryPulse.serviceRevenueCents == null
                    ? "—"
                    : formatAud(deliveryPulse.serviceRevenueCents),
                hint: "Professional Services — scaffold until billing split",
              },
              {
                label: "Support & Success revenue",
                value:
                  deliveryPulse.supportRevenueCents == null
                    ? "—"
                    : formatAud(deliveryPulse.supportRevenueCents),
                hint: "Scaffold — Support & Success attribution next",
              },
            ]}
          />
        </div>

        {/* Founding Acquisition Partner seats */}
        <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-5 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-300">
                Founding Acquisition Partner Programme
              </p>
              <p className="mt-2 text-3xl font-bold text-white">
                {foundingSeats.used} / {foundingSeats.cap}{" "}
                <span className="text-lg font-medium text-slate-400">seats filled</span>
              </p>
              <p className="mt-2 max-w-xl text-sm text-slate-300">
                Invitation only · First-wave Acquisition Partners receive founding commercial
                terms.
              </p>
              <p className="mt-2 text-sm text-slate-400">
                <span className="text-slate-200">Founding Acquisition Partners</span> introduce
                qualified businesses to DigitalGate. Ben closes the opportunity.
              </p>
            </div>
          </div>
          <div className="mt-5">
            <InviteFoundingResellerForm compact />
          </div>
        </section>

        {/* Partner Briefing + Ecosystem */}
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-sky-700/30 bg-sky-900/10 px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-sky-400">
              Partner Briefing
            </p>
            <p className="mt-2 text-sm text-slate-300">
              Run-sheet for Acquisition Partner briefings — agenda, discussion prompts and
              outcomes.
            </p>
            <Link
              href="/command/partners/briefing"
              className="mt-3 inline-block text-sm font-medium text-sky-400 hover:underline"
            >
              Open briefing →
            </Link>
          </section>
          <section className="rounded-xl border border-violet-700/30 bg-violet-900/10 px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-violet-300">
              Ecosystem
            </p>
            <p className="mt-2 text-sm text-slate-300">
              Acquisition · Delivery · Technology · Strategic — roles that must stay distinct.
            </p>
            <Link
              href="/command/partners/ecosystem"
              className="mt-3 inline-block text-sm font-medium text-violet-300 hover:underline"
            >
              Open ecosystem →
            </Link>
          </section>
        </div>

        {/* Role definitions */}
        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-4">
            <h3 className="font-semibold text-white">Acquisition Partners</h3>
            <p className="mt-2 text-sm text-slate-400">
              Introduce qualified businesses to DigitalGate. Ben closes the opportunity.
            </p>
            <p className="mt-2 text-xs text-emerald-300/90">They introduce. You close.</p>
          </article>
          <article className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-4">
            <h3 className="font-semibold text-white">Delivery Partners</h3>
            <p className="mt-2 text-sm text-slate-400">
              Provide implementation, specialist services and customer fulfilment.
            </p>
            <p className="mt-2 text-xs text-violet-300/90">Delivery Partners deliver.</p>
          </article>
        </section>

        <PartnerTable
          title="Acquisition Partners"
          empty="No Acquisition Partners on file yet. Invite a Founding Acquisition Partner to start the channel."
          href="/command/partners/acquisition"
          hrefLabel="All Acquisition Partners"
          rows={resellers}
        />

        <PartnerTable
          title="Delivery Partners"
          empty="No Delivery Partners yet. Delivery Partners implement and onboard customers."
          href="/command/delivery"
          hrefLabel="Delivery Partners workspace"
          rows={deliveryPartners}
        />

        <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            Recent activity
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">Partner events</h2>
          {recentActivity.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              Referrals and commission events will appear here as the channel moves.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {recentActivity.map((row) => (
                <li key={row.id}>
                  <Link
                    href={row.href}
                    className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-slate-800 px-3 py-2 hover:border-sky-500/40"
                  >
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">{row.label}</p>
                      <p className="text-sm text-slate-200">{row.detail}</p>
                    </div>
                    <p className="text-xs text-slate-500">
                      {new Date(row.at).toLocaleDateString("en-AU")}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="text-xs text-slate-500">
          Architectural rule: Partner Overview must never become a prospecting or sales pipeline.
          Sales / Growth Engine own DigitalGate customer acquisition. Acquisition Partners
          introduce; Delivery Partners implement; Customers operate; Revenue monetises.
        </p>
      </main>
    </>
  );
}

function DivisionPanel({
  title,
  subtitle,
  href,
  hrefLabel,
  metrics,
}: {
  title: string;
  subtitle: string;
  href: string;
  hrefLabel: string;
  metrics: Array<{ label: string; value: string; hint?: string; tone?: "amber" }>;
}) {
  return (
    <section className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-5 py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{title}</p>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        </div>
        <Link href={href} className="text-xs text-sky-400 hover:underline shrink-0">
          {hrefLabel} →
        </Link>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-3"
          >
            <p className="text-[10px] uppercase tracking-wide text-slate-500">{metric.label}</p>
            <p
              className={`mt-1 text-xl font-bold ${
                metric.tone === "amber" ? "text-amber-300" : "text-white"
              }`}
            >
              {metric.value}
            </p>
            {metric.hint ? (
              <p className="mt-1 text-[10px] text-slate-600">{metric.hint}</p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function PartnerTable({
  title,
  empty,
  href,
  hrefLabel,
  rows,
}: {
  title: string;
  empty: string;
  href: string;
  hrefLabel: string;
  rows: PartnerDashboardWorkspace["resellers"];
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-700/60 bg-slate-950/40">
      <div className="flex items-center justify-between border-b border-slate-700/60 px-4 py-3">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <Link href={href} className="text-xs text-sky-400 hover:underline">
          {hrefLabel} →
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-slate-500">{empty}</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/60 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Partner</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/40">
            {rows.map((p) => (
              <tr key={p.id} className="hover:bg-slate-800/40">
                <td className="px-4 py-3">
                  <Link
                    href={`/command/partners/${p.id}`}
                    className="font-medium text-white hover:text-sky-300"
                  >
                    {p.name}
                  </Link>
                  {p.email ? <p className="text-xs text-slate-500">{p.email}</p> : null}
                </td>
                <td className="px-4 py-3 text-slate-300">{p.partnerTypeLabel}</td>
                <td className="px-4 py-3 capitalize text-slate-300">{p.status}</td>
                <td className="px-4 py-3 text-slate-400">
                  {p.joinedAt ? new Date(p.joinedAt).toLocaleDateString("en-AU") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
