import Link from "next/link";
import type { PartnerDashboardWorkspace } from "@dg/platform-core";

function formatAud(cents: number) {
  return (cents / 100).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });
}

function formatAudOrDash(cents: number | null, emptyHint?: string) {
  if (cents == null) return { value: "—", hint: emptyHint };
  return { value: formatAud(cents), hint: undefined as string | undefined };
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
    onboardingQueue,
    foundingSeats,
    resellers,
    deliveryPartners,
    recentActivity,
    deliveryPulse,
  } = data;

  const activeAcquisition = resellers.filter((r) => r.status === "active").length;
  const activeDelivery = deliveryPartners.filter((r) => r.status === "active").length;
  const pendingAcquisition = resellers.filter((r) => r.status === "pending").length;
  const pendingDelivery = deliveryPartners.filter((r) => r.status === "pending").length;
  const onboardingTotal =
    onboardingQueue.acquisition.length + onboardingQueue.delivery.length;

  const platformRevenue = formatAudOrDash(
    pulse.mrrReferredCents,
    "Billing attribution lands with subscription linkage",
  );
  const pipelineValue = formatAudOrDash(
    pulse.pipelineValueCents,
    "Partner-attributed pipeline value — scaffold until Sales linkage",
  );
  const serviceRevenue = formatAudOrDash(
    deliveryPulse.serviceRevenueCents,
    "Professional Services — scaffold until billing split",
  );
  const supportRevenue = formatAudOrDash(
    deliveryPulse.supportRevenueCents,
    "Support & Success — scaffold until attribution",
  );
  const partnerShare = formatAudOrDash(
    deliveryPulse.partnerShareCents,
    "Partner share of qualifying service revenue — scaffold",
  );
  const totalServiceCents =
    deliveryPulse.serviceRevenueCents != null && deliveryPulse.supportRevenueCents != null
      ? deliveryPulse.serviceRevenueCents + deliveryPulse.supportRevenueCents
      : null;
  const totalService = formatAudOrDash(
    totalServiceCents,
    "Total partner service revenue when Professional Services + Support are attributed",
  );

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
        {/* Partner onboarding + other attention */}
        <section className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-5 py-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-200/90">
            What needs your attention
          </p>

          {onboardingTotal > 0 ? (
            <div className="mt-4 border-b border-amber-500/10 pb-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200/80">
                    Partner onboarding
                  </p>
                  <p className="mt-2 text-sm text-slate-200">
                    <span aria-hidden>🟠 </span>
                    {onboardingTotal} partner{onboardingTotal === 1 ? "" : "s"} awaiting
                    onboarding completion
                  </p>
                </div>
                <Link
                  href="/command/partners/onboarding"
                  className="text-xs text-sky-400 hover:underline shrink-0"
                >
                  Review onboarding →
                </Link>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {onboardingQueue.acquisition.length > 0 ? (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Acquisition
                    </p>
                    <ul className="mt-2 space-y-1">
                      {onboardingQueue.acquisition.map((p) => (
                        <li key={p.id}>
                          <Link
                            href={p.href}
                            className="text-sm text-slate-300 hover:text-sky-300"
                          >
                            {p.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {onboardingQueue.delivery.length > 0 ? (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Delivery
                    </p>
                    <ul className="mt-2 space-y-1">
                      {onboardingQueue.delivery.map((p) => (
                        <li key={p.id}>
                          <Link
                            href={p.href}
                            className="text-sm text-slate-300 hover:text-sky-300"
                          >
                            {p.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {attention.length === 0 && onboardingTotal === 0 ? (
            <p className="mt-3 text-sm text-slate-300">No partner interventions required.</p>
          ) : attention.length > 0 ? (
            <ul className={`space-y-3 ${onboardingTotal > 0 ? "mt-4" : "mt-4"}`}>
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
          ) : null}
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
              { label: "Pending partners", value: String(pendingAcquisition) },
              { label: "Referrals this month", value: String(pulse.referralsThisMonth) },
              { label: "Customers acquired", value: String(pulse.customersReferred) },
              {
                label: "Active referred customers",
                value:
                  pulse.activeReferredCustomers == null
                    ? "—"
                    : String(pulse.activeReferredCustomers),
                hint:
                  pulse.activeReferredCustomers == null
                    ? "Still generating commission — scaffold until retention linkage"
                    : undefined,
              },
              {
                label: "Pipeline value",
                value: pipelineValue.value,
                hint: pipelineValue.hint,
              },
              {
                label: "Platform revenue referred",
                value: platformRevenue.value,
                hint: platformRevenue.hint,
              },
              { label: "Commissions owing", value: formatAud(pulse.commissionOwingCents) },
              {
                label: "Channel conversion",
                value: pulse.conversionRate == null ? "—" : `${pulse.conversionRate}%`,
              },
            ]}
          />
          <section className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-5 py-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                  Delivery Partners
                </p>
                <p className="mt-1 text-sm text-slate-400">Implement and onboard customers</p>
              </div>
              <Link
                href="/command/delivery"
                className="text-xs text-sky-400 hover:underline shrink-0"
              >
                Open Delivery Partners →
              </Link>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <MetricTile label="Active partners" value={String(activeDelivery)} />
              <MetricTile label="Pending partners" value={String(pendingDelivery)} />
              <MetricTile
                label="Customers in implementation"
                value={String(deliveryPulse.customersInImplementation)}
              />
              <MetricTile
                label="Active projects"
                value={String(deliveryPulse.activeProjects)}
              />
              <MetricTile
                label="Projects at risk"
                value={String(deliveryPulse.projectsAtRisk)}
                tone={deliveryPulse.projectsAtRisk > 0 ? "amber" : undefined}
              />
            </div>
            <div className="mt-5 border-t border-slate-800 pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Delivery revenue
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <MetricTile
                  label="Professional Services"
                  value={serviceRevenue.value}
                  hint={serviceRevenue.hint}
                />
                <MetricTile
                  label="Support & Success"
                  value={supportRevenue.value}
                  hint={supportRevenue.hint}
                />
                <MetricTile
                  label="Total partner service revenue"
                  value={totalService.value}
                  hint={totalService.hint}
                />
                <MetricTile
                  label="Partner share"
                  value={partnerShare.value}
                  hint={partnerShare.hint}
                />
              </div>
            </div>
          </section>
        </div>

        {/* Acquisition Partner Programme — not another Founding 10 */}
        <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-400">
                Acquisition Partner Programme
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                Build a recurring revenue channel with DigitalGate
              </h2>
              <p className="mt-2 max-w-xl text-sm text-slate-300">
                First-wave Acquisition Partners receive founding commercial terms and work
                directly with DigitalGate to introduce qualified businesses.
              </p>
              <p className="mt-3 text-sm text-slate-400">
                <span className="font-medium text-slate-200">
                  {foundingSeats.invited} founding partner
                  {foundingSeats.invited === 1 ? "" : "s"} currently invited
                </span>
                <span className="text-slate-600"> · </span>
                invitation only
              </p>
            </div>
            <Link
              href="/command/partners/acquisition"
              className="shrink-0 rounded-lg border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-300 hover:bg-sky-500/20"
            >
              View Acquisition Partners →
            </Link>
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
          empty="No Acquisition Partners on file yet. Invite from Acquisition Partners to start the channel."
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

        <section className="rounded-xl border border-slate-800 bg-slate-950/30 px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            DigitalGate commercial architecture
          </p>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ArchItem
              title="Sales / Growth Engine"
              body="DigitalGate’s own acquisition operation."
            />
            <ArchItem
              title="Acquisition Partners"
              body="External channel for qualified introductions."
            />
            <ArchItem
              title="Delivery Partners"
              body="Implementation, professional services and customer fulfilment."
            />
            <ArchItem title="Customer" body="Runs their business on DigitalGate." />
            <ArchItem
              title="Revenue"
              body="Platform subscriptions + Apps + services."
            />
          </dl>
          <p className="mt-5 text-xs text-slate-500">
            Architectural rule: Partner Overview must never become a prospecting or sales
            pipeline. Sales / Growth Engine own DigitalGate customer acquisition. Acquisition
            Partners introduce; Delivery Partners implement; Customers operate; Revenue
            monetises.
          </p>
        </section>
      </main>
    </>
  );
}

function ArchItem({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <dt className="text-sm font-medium text-slate-200">{title}</dt>
      <dd className="mt-1 text-xs text-slate-500">{body}</dd>
    </div>
  );
}

function MetricTile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "amber";
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-3">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={`mt-1 text-xl font-bold ${
          tone === "amber" ? "text-amber-300" : "text-white"
        }`}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-[10px] text-slate-600">{hint}</p> : null}
    </div>
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
          <MetricTile key={metric.label} {...metric} />
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
