import Link from "next/link";
import type {
  BusinessContext,
  BusinessOverview,
  DigitalTwinSnapshot,
} from "@dg/platform-core";
import { enquiryInboxHref, hasRealEstateWorkspace } from "@dg/platform-core";

const SYSTEM_LABELS: Record<string, string> = {
  website: "Website",
  websites: "Design Studio",
  wordpress: "WordPress",
  stripe: "Stripe",
  crm: "CRM",
  "real-estate": "Real Estate",
  accommodation: "Accommodation",
  commerce: "Commerce",
  automation: "Automation",
  reviews: "Reviews",
  "ai-communications": "AI Communications",
  voice: "AI Communications",
};

const SOCIAL_LABELS: Record<string, string> = {
  googleBusiness: "Google Business",
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  tiktok: "TikTok",
  x: "X",
  pinterest: "Pinterest",
};

function money(cents?: number | null, currency = "AUD") {
  if (cents == null || cents <= 0) return null;
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function appLabel(id: string) {
  return SYSTEM_LABELS[id] ?? id.replace(/-/g, " ");
}

function ScoreCard({
  label,
  value,
  href,
}: {
  label: string;
  value?: number | null;
  href?: string;
}) {
  const scored = typeof value === "number";
  const inner = (
    <>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">
        {scored ? `${Math.round(value)}/100` : "—"}
      </p>
    </>
  );
  if (!href) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">{inner}</div>
    );
  }
  return (
    <Link
      href={href}
      className="block rounded-lg border border-slate-800 bg-slate-900/40 p-3 hover:border-sky-500/40"
    >
      {inner}
    </Link>
  );
}

function MetricCard({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number;
  href?: string;
}) {
  const inner = (
    <>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </>
  );
  if (!href) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">{inner}</div>
    );
  }
  return (
    <Link
      href={href}
      className="block rounded-lg border border-slate-800 bg-slate-900/40 p-3 hover:border-sky-500/40"
    >
      {inner}
    </Link>
  );
}

export function DigitalTwinView({
  context,
  snapshot,
  overview,
}: {
  context: BusinessContext;
  snapshot: DigitalTwinSnapshot | null;
  overview?: BusinessOverview | null;
}) {
  const { identity, contact, brandVoice, twin, enabledAppIds } = context;
  const reWorkspace = hasRealEstateWorkspace(enabledAppIds);
  const enquiryHref = enquiryInboxHref(enabledAppIds);
  const captured = snapshot
    ? new Date(snapshot.capturedAt).toLocaleString("en-AU", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: identity.timezone || "Australia/Brisbane",
      })
    : null;
  const revenue = money(twin.revenueMtdCents, context.currency);
  const outstanding = money(snapshot?.metrics.outstandingArCents, context.currency);
  const overdueAr = money(snapshot?.metrics.overdueArCents, context.currency);
  const pipeline =
    twin.pipelineValue && twin.pipelineValue > 0
      ? new Intl.NumberFormat("en-AU", {
          style: "currency",
          currency: context.currency,
          maximumFractionDigits: 0,
        }).format(twin.pipelineValue)
      : null;
  const location = identity.locations[0]?.formatted;
  const socialEntries = Object.entries(contact.social).filter(([, url]) => url);
  const knowledge = [
    identity.industry ? `Industry: ${identity.industry.replace(/_/g, " ")}` : null,
    brandVoice.services ? `Offers: ${brandVoice.services}` : null,
    brandVoice.targetAudience ? `Audience: ${brandVoice.targetAudience}` : null,
    location ? `Location: ${location}` : null,
    identity.website ? `Website: ${identity.website}` : null,
    identity.timezone ? `Timezone: ${identity.timezone}` : null,
    identity.businessHours ? `Hours: ${identity.businessHours}` : null,
    brandVoice.tone ? `Voice: ${brandVoice.tone}` : null,
    contact.businessEmail ? `Email: ${contact.businessEmail}` : null,
    contact.businessPhone ? `Phone: ${contact.businessPhone}` : null,
  ].filter(Boolean) as string[];

  const connectedIds = twin.connectedSystems.length
    ? twin.connectedSystems
    : snapshot?.connectors ?? [];

  return (
    <div className="space-y-6">
      <section className="dg-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-300">
              Digital Twin™
            </p>
            <h2 className="mt-1 text-xl font-bold text-white">{identity.businessName}</h2>
            {brandVoice.tagline ? (
              <p className="mt-1 text-sm text-slate-300">{brandVoice.tagline}</p>
            ) : (
              <p className="mt-1 text-sm text-slate-400">
                A live digital representation of this business — identity, pipeline, and
                connected systems.
              </p>
            )}
            {captured ? (
              <p className="mt-2 text-xs text-slate-500">Last captured {captured}</p>
            ) : null}
          </div>
          {typeof twin.businessHealth === "number" ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-right">
              <p className="text-xs text-emerald-300/80">Business Health</p>
              <p className="mt-1 text-2xl font-bold text-emerald-300">
                {Math.round(twin.businessHealth)}/100
              </p>
            </div>
          ) : null}
        </div>
        {identity.brandColours?.length ? (
          <div className="mt-4 flex gap-2">
            {identity.brandColours.slice(0, 6).map((colour) => (
              <span
                key={colour}
                className="h-6 w-6 rounded-full border border-slate-700"
                style={{ backgroundColor: colour }}
                title={colour}
              />
            ))}
          </div>
        ) : null}
      </section>

      <section className="dg-card">
        <h3 className="text-lg font-semibold text-white">What the Twin knows</h3>
        <p className="mt-1 text-sm text-slate-400">
          Identity from Business Profile. Edit the profile when the story changes — the Twin
          reads it live for Advisor, emails, and Overview.
        </p>
        {knowledge.length ? (
          <ul className="mt-4 space-y-1 text-sm text-slate-300">
            {knowledge.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            Add industry, services, and audience on{" "}
            <Link href="/dashboard/business" className="text-sky-400 hover:underline">
              Business Profile
            </Link>{" "}
            so Advisor and emails speak in your voice.
          </p>
        )}
        {socialEntries.length ? (
          <p className="mt-3 text-sm text-slate-400">
            Channels:{" "}
            {socialEntries
              .map(([key]) => SOCIAL_LABELS[key] ?? key)
              .join(" · ")}
          </p>
        ) : null}
        <Link
          href="/dashboard/business"
          className="mt-4 inline-block text-sm text-sky-400 hover:underline"
        >
          Edit Business Profile →
        </Link>
      </section>

      <section className="dg-card">
        <h3 className="text-lg font-semibold text-white">Live signals</h3>
        <p className="mt-1 text-sm text-slate-400">
          Read-only metrics aggregated from apps and connectors. Updates as the business
          operates.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Contacts"
            value={twin.contactCount ?? 0}
            href="/apps/crm/contacts"
          />
          <MetricCard
            label="Open opportunities"
            value={snapshot?.metrics.openOpportunities ?? 0}
            href="/apps/crm/opportunities"
          />
          <MetricCard
            label="Active enquiries"
            value={twin.activeLeads ?? 0}
            href={enquiryHref}
          />
          <MetricCard
            label="Platform Consultations"
            value={snapshot?.metrics.consultations ?? 0}
            href="/apps/crm/consultations"
          />
          <MetricCard
            label="New this week"
            value={snapshot?.metrics.newEnquiriesThisWeek ?? 0}
            href={enquiryHref}
          />
          <MetricCard
            label="Tasks due"
            value={snapshot?.metrics.openTasks ?? 0}
            href="/apps/crm/tasks"
          />
          <MetricCard label="Connected systems" value={connectedIds.length} />
          {reWorkspace && pipeline ? <MetricCard label="Listing pipeline" value={pipeline} /> : null}
          {revenue ? (
            <MetricCard label="Revenue MTD" value={revenue} href="/apps/commerce" />
          ) : null}
          {outstanding ? (
            <MetricCard
              label="Outstanding AR"
              value={outstanding}
              href="/apps/commerce/invoices"
            />
          ) : null}
          {overdueAr ? (
            <MetricCard
              label="Overdue invoices"
              value={overdueAr}
              href="/apps/commerce/invoices"
            />
          ) : null}
        </div>
      </section>

      <section className="dg-card">
        <h3 className="text-lg font-semibold text-white">Health scores</h3>
        <p className="mt-1 text-sm text-slate-400">
          Generated from the Twin — website, search, visibility, reputation, and operations.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ScoreCard label="Business Health" value={twin.businessHealth} href="/dashboard/health" />
          <ScoreCard label="Website" value={twin.websiteHealth} href="/apps/websites/health" />
          <ScoreCard label="SEO" value={twin.seo} href="/apps/seo" />
          <ScoreCard label="AI Visibility" value={twin.aiVisibility} href="/apps/ai-visibility" />
          <ScoreCard
            label="Reputation"
            value={snapshot?.scores.reputation}
            href="/apps/reviews"
          />
          <ScoreCard
            label="Automation"
            value={snapshot?.scores.automation}
            href="/apps/automation"
          />
          <ScoreCard
            label="Growth"
            value={snapshot?.scores.businessGrowth}
            href="/dashboard"
          />
        </div>
      </section>

      {overview?.dailyBriefing || overview?.recommendedActions.length ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {overview.dailyBriefing ? (
            <section className="dg-card">
              <h3 className="text-lg font-semibold text-white">What the Twin is saying</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                {overview.dailyBriefing}
              </p>
              {overview.priorities.length ? (
                <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-slate-300">
                  {overview.priorities.map((item) => (
                    <li key={item.rank}>{item.text}</li>
                  ))}
                </ol>
              ) : null}
            </section>
          ) : null}
          {overview.recommendedActions.length ? (
            <section className="dg-card">
              <h3 className="text-lg font-semibold text-white">Recommended next</h3>
              <p className="mt-1 text-sm text-slate-400">
                Actions inferred from Twin state — same engine as Overview.
              </p>
              <ul className="mt-4 space-y-3">
                {overview.recommendedActions.map((action) => (
                  <li
                    key={action.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{action.label}</p>
                      <p className="text-xs text-slate-500">{action.impact}</p>
                    </div>
                    {action.href ? (
                      <Link
                        href={action.href}
                        className="text-xs text-sky-400 hover:underline"
                      >
                        {action.buttonLabel ?? "Open"} →
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="dg-card">
          <h3 className="text-lg font-semibold text-white">Connected systems</h3>
          {connectedIds.length ? (
            <ul className="mt-4 space-y-2 text-sm">
              {connectedIds.map((id) => (
                <li
                  key={id}
                  className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-2"
                >
                  <span className="text-white">{appLabel(id)}</span>
                  <span className="text-xs text-emerald-400">Live</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              Connect WordPress, Stripe, or your website to deepen the Twin.
            </p>
          )}
          {twin.websites.length ? (
            <p className="mt-3 text-sm text-slate-400">
              Sites: {twin.websites.join(", ")}
            </p>
          ) : identity.website ? (
            <p className="mt-3 text-sm text-slate-400">Site: {identity.website}</p>
          ) : null}
          <Link
            href="/dashboard/settings/connectors"
            className="mt-4 inline-block text-sm text-sky-400 hover:underline"
          >
            Manage connectors →
          </Link>
        </section>

        <section className="dg-card">
          <h3 className="text-lg font-semibold text-white">Operating apps</h3>
          {enabledAppIds.length ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {enabledAppIds.map((id) => (
                <li
                  key={id}
                  className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200"
                >
                  {appLabel(id)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No apps enabled yet.</p>
          )}
        </section>
      </div>

      {overview?.growthOpportunities.length ? (
        <section className="dg-card">
          <h3 className="text-lg font-semibold text-white">Opportunities detected</h3>
          <p className="mt-1 text-sm text-slate-400">
            Gaps the Twin can see between current capability and growth.
          </p>
          <ul className="mt-4 space-y-2">
            {overview.growthOpportunities.slice(0, 6).map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 px-3 py-2"
              >
                <div>
                  <p className="text-sm text-white">{item.label}</p>
                  <p className="text-xs text-slate-500">
                    {item.status}
                    {item.impact ? ` · ${item.impact}` : ""}
                  </p>
                </div>
                {item.href ? (
                  <Link href={item.href} className="text-xs text-sky-400 hover:underline">
                    Review →
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {overview?.timeline.length ? (
        <section className="dg-card">
          <h3 className="text-lg font-semibold text-white">Recent activity</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {overview.timeline.slice(0, 8).map((entry) => (
              <li
                key={entry.id}
                className="flex gap-3 border-b border-slate-800/80 py-2 last:border-0"
              >
                <span className="w-24 shrink-0 text-xs text-slate-500">{entry.timeLabel}</span>
                {entry.href ? (
                  <Link href={entry.href} className="text-slate-200 hover:text-white">
                    {entry.title}
                  </Link>
                ) : (
                  <span className="text-slate-300">{entry.title}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="dg-card">
        <h3 className="text-lg font-semibold text-white">Surfaces that read this Twin</h3>
        <p className="mt-1 text-sm text-slate-400">
          Scores, recommendations, reports, and AI answers are generated from this state — not
          from isolated app silos.
        </p>
        <ul className="mt-4 flex flex-wrap gap-3 text-sm">
          <li>
            <Link href="/dashboard" className="text-sky-400 hover:underline">
              Overview
            </Link>
          </li>
          <li>
            <Link href="/dashboard/advisor" className="text-sky-400 hover:underline">
              Advisor
            </Link>
          </li>
          <li>
            <Link href="/dashboard/health" className="text-sky-400 hover:underline">
              Business Health
            </Link>
          </li>
          <li>
            <Link href="/apps/crm/opportunities" className="text-sky-400 hover:underline">
              CRM pipeline
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
