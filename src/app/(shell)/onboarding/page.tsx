import Link from "next/link";

import {
  abrCredentialsConfigured,
  buildBusinessSetupFirstSteps,
  buildSetupProgress,
  getOrganisationBusinessProfile,
  getPlatformSetupStatus,
} from "@dg/platform-core";

import { BusinessSetupFirstSteps } from "@/components/platform/BusinessSetupFirstSteps";
import { BusinessSetupIdentifyPanel } from "@/components/platform/BusinessSetupIdentifyPanel";
import { OnboardingBusinessNameForm } from "@/components/platform/OnboardingBusinessNameForm";
import { getOrgEnabledAppIdsCached, getPlatformPageContext } from "@/lib/org-apps";

function isPlaceholderOrgName(name: string): boolean {
  return /'s Organisation$/i.test(name) || /^My Organisation$/i.test(name);
}

/**
 * Guided first-run hub: name business → identify/profile → understand DG →
 * connect something → first value. Replaces the old Profile-only redirect.
 */
export default async function OnboardingPage() {
  const { session } = await getPlatformPageContext();
  const enabledAppIds = await getOrgEnabledAppIdsCached();
  const profile = session
    ? await getOrganisationBusinessProfile(session.organisationId)
    : null;
  const setupStatus = session
    ? await getPlatformSetupStatus(session.organisationId)
    : null;
  const firstSteps = buildBusinessSetupFirstSteps(profile);
  const setupProgress = buildSetupProgress({
    setupStatus,
    businessProfile: profile,
    enabledAppIds,
    hasSession: Boolean(session),
  });
  const abrReady = abrCredentialsConfigured();
  const needsBusinessName = session
    ? isPlaceholderOrgName(session.organisationName) &&
      !profile?.businessName?.trim() &&
      !profile?.tradingName?.trim()
    : false;
  const pathComplete =
    firstSteps.identifyDone &&
    firstSteps.profileSeeded &&
    (setupProgress.steps.find((s) => s.id === "contacts")?.done ||
      setupProgress.steps.find((s) => s.id === "connectors")?.done);

  return (
    <>
      <header className="dg-page-header">
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-300">
          Getting started
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">
          Welcome to DigitalGate
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Name your business, set identity, understand what we recommend, connect
          one digital asset, then capture first value — without a dump to Profile
          alone.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          {session?.organisationName ?? "DigitalGate"} · guided setup
        </p>
      </header>

      <main className="dg-page-main space-y-6">
        {pathComplete ? (
          <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-4 text-sm text-slate-300">
            <p className="font-medium text-emerald-200">Core path complete</p>
            <p className="mt-1 text-slate-400">
              Identity and first value signals are in place. Keep going from
              Overview — or deepen connectors and apps anytime.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-500"
              >
                Open Overview
              </Link>
              <Link
                href="/dashboard/business-setup"
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:border-slate-500"
              >
                Full Business Setup
              </Link>
            </div>
          </section>
        ) : (
          <section className="rounded-xl border border-sky-500/25 bg-sky-500/5 px-4 py-3 text-sm text-slate-300">
            <p className="font-medium text-sky-200">Your founding path</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-slate-400">
              <li>Name the business (replace the placeholder org name)</li>
              <li>Verify identity and seed Business Profile</li>
              <li>See what DigitalGate recommends next</li>
              <li>Connect website, domain, or Google</li>
              <li>Add a contact or run an AI Visibility check — first value</li>
            </ol>
          </section>
        )}

        {needsBusinessName ? (
          <section className="dg-card space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-300">
                Step 1 · Create business
              </p>
              <h2 className="mt-1 text-lg font-semibold text-white">
                Name your business
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                We auto-created &ldquo;{session?.organisationName}&rdquo;. Give it
                the real trading or legal name — this becomes your organisation
                label and seeds Business Profile.
              </p>
            </div>
            <OnboardingBusinessNameForm
              currentName={session?.organisationName ?? ""}
            />
          </section>
        ) : (
          <section className="dg-card">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">
              Step 1 · Business
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">
              {session?.organisationName ?? "Organisation ready"}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Organisation is provisioned
              {profile?.businessName
                ? ` · profile name ${profile.businessName}`
                : ""}
              . Rename anytime from Business Profile.
            </p>
          </section>
        )}

        <BusinessSetupFirstSteps progress={firstSteps} />

        <div id="identify" className="scroll-mt-24">
        <BusinessSetupIdentifyPanel
          abrConfigured={abrReady}
          existingIdentity={
            profile
              ? {
                  abn: profile.abn,
                  acn: profile.acn,
                  businessName: profile.businessName,
                  tradingName: profile.tradingName,
                }
              : null
          }
        />
        </div>

        <section className="dg-card space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-300">
              Understand DigitalGate
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">
              What we recommend for this business
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              DigitalGate is a Business Operating Platform — run customers,
              understand presence, grow pipeline. Start with the outcome path,
              not every module.
            </p>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            <li className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2.5 text-sm">
              <p className="font-medium text-white">Run</p>
              <p className="mt-0.5 text-slate-400">
                Contacts, opportunities, and tasks in CRM — daily follow-through.
              </p>
              <Link
                href="/apps/crm/contacts"
                className="mt-2 inline-block text-sky-400 hover:underline"
              >
                Open CRM →
              </Link>
            </li>
            <li className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2.5 text-sm">
              <p className="font-medium text-white">Understand</p>
              <p className="mt-0.5 text-slate-400">
                Honest AI Visibility / presence score — measurable signals only.
              </p>
              <Link
                href="/apps/ai-visibility"
                className="mt-2 inline-block text-sky-400 hover:underline"
              >
                AI Visibility →
              </Link>
            </li>
            <li className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2.5 text-sm">
              <p className="font-medium text-white">Grow</p>
              <p className="mt-0.5 text-slate-400">
                Website → leads → CRM → automation → opportunities.
              </p>
              <Link
                href="/dashboard"
                className="mt-2 inline-block text-sky-400 hover:underline"
              >
                Overview briefing →
              </Link>
            </li>
            <li className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2.5 text-sm">
              <p className="font-medium text-white">Help</p>
              <p className="mt-0.5 text-slate-400">
                Short KB stubs for signup, billing, connectors, and RE beta.
              </p>
              <Link
                href="/support/help"
                className="mt-2 inline-block text-sky-400 hover:underline"
              >
                Knowledge base →
              </Link>
            </li>
          </ul>
        </section>

        <section className="dg-card space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-300">
              Connect something
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">
              Link one digital asset
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Pick one — Domain, Website, WordPress, or Google. No auto-publish
              claims from this step.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/apps/infrastructure/domains"
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-sky-500/40 hover:text-white"
            >
              Domains
            </Link>
            <Link
              href="/apps/websites"
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-sky-500/40 hover:text-white"
            >
              Websites
            </Link>
            <Link
              href="/dashboard/settings/connectors"
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-sky-500/40 hover:text-white"
            >
              Connectors / Google
            </Link>
          </div>
        </section>

        <section className="dg-card space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">
              First value
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">
              Capture one real outcome
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Add a CRM contact, create a follow-up task, or run a presence audit.
              Platform setup: {setupProgress.completed}/{setupProgress.total} (
              {setupProgress.percent}%).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/apps/crm/contacts"
              className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500"
            >
              Add a contact
            </Link>
            <Link
              href="/apps/crm/tasks"
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-sky-500/40"
            >
              Create a task
            </Link>
            <Link
              href="/apps/ai-visibility"
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-sky-500/40"
            >
              Run AI Visibility
            </Link>
            <Link
              href="/apps/re"
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-sky-500/40"
            >
              Real Estate app
            </Link>
          </div>
        </section>

        <p className="text-xs text-slate-500">
          Prefer the longer Launchpad?{" "}
          <Link href="/dashboard/business-setup" className="text-sky-400 hover:underline">
            Start Your Business
          </Link>{" "}
          · skip to{" "}
          <Link href="/dashboard" className="text-sky-400 hover:underline">
            Overview
          </Link>
        </p>
      </main>
    </>
  );
}
