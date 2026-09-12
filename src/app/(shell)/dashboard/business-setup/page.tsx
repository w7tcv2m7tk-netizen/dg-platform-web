import Link from "next/link";

import {
  BUSINESS_SETUP_CHECKLIST,
  BUSINESS_SETUP_PILLARS,
  BUSINESS_SETUP_POSITIONING,
  abrCredentialsConfigured,
  buildBusinessSetupFirstSteps,
  checklistForPillar,
  getOrganisationBusinessProfile,
  type BusinessSetupStepStatus,
} from "@dg/platform-core";

import { BusinessSetupFirstSteps } from "@/components/platform/BusinessSetupFirstSteps";
import { BusinessSetupIdentifyPanel } from "@/components/platform/BusinessSetupIdentifyPanel";
import { getPlatformPageContext } from "@/lib/org-apps";

function statusLabel(status: BusinessSetupStepStatus): string {
  switch (status) {
    case "available":
      return "Ready";
    case "partial":
      return "Available with limits";
    case "deferred":
      return "Optional later";
    case "blocked_provider":
      return "External step";
    case "roadmap":
      return "Not available";
    default:
      return status;
  }
}

function statusClass(status: BusinessSetupStepStatus): string {
  switch (status) {
    case "available":
      return "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30";
    case "partial":
      return "bg-sky-500/15 text-sky-300 ring-sky-500/30";
    case "deferred":
      return "bg-amber-500/15 text-amber-300 ring-amber-500/30";
    case "blocked_provider":
      return "bg-rose-500/15 text-rose-300 ring-rose-500/30";
    case "roadmap":
      return "bg-slate-500/15 text-slate-400 ring-slate-500/30";
    default:
      return "bg-slate-500/15 text-slate-400 ring-slate-500/30";
  }
}

/** Start Your Business — customer launchpad for establishing the Business Profile. */
export default async function BusinessSetupPage() {
  const { session: platformSession } = await getPlatformPageContext();
  const abrReady = abrCredentialsConfigured();
  const profile = platformSession
    ? await getOrganisationBusinessProfile(platformSession.organisationId)
    : null;
  const firstSteps = buildBusinessSetupFirstSteps(profile);

  return (
    <>
      <header className="dg-page-header">
        <Link
          href="/dashboard"
          className="inline-flex min-h-11 items-center text-sm text-sky-400 hover:underline"
        >
          ← Overview
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Start Your Business</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">{BUSINESS_SETUP_POSITIONING}</p>
        <p className="mt-2 text-sm text-slate-500">
          {platformSession?.organisationName ?? "Your organisation"} · Business setup
        </p>
      </header>

      <main className="dg-page-main space-y-6">
        <section className="rounded-xl border border-sky-500/30 bg-sky-500/5 px-4 py-4 text-sm text-slate-300">
          <h2 className="font-medium text-sky-200">Your setup path</h2>
          <p className="mt-1 text-slate-400">
            Confirm your business identity, review the Business Profile, then connect the digital
            services you use. DigitalGate only reports a registration or connection as complete
            when it can verify it.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span
              className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset ${
                abrReady
                  ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
                  : "bg-amber-500/15 text-amber-300 ring-amber-500/30"
              }`}
            >
              ABN lookup {abrReady ? "available" : "temporarily unavailable"}
            </span>
            <span className="rounded-full bg-slate-500/15 px-3 py-1.5 text-xs font-medium text-slate-300 ring-1 ring-inset ring-slate-500/30">
              Business name registration uses the official registration process
            </span>
          </div>
        </section>

        <BusinessSetupFirstSteps progress={firstSteps} />

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

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {BUSINESS_SETUP_PILLARS.map((pillar) => {
            const items = checklistForPillar(pillar.id);
            return (
              <section key={pillar.id} className="dg-card space-y-3">
                <div>
                  <h2 className="font-semibold text-white">{pillar.title}</h2>
                  <p className="mt-1 text-sm text-slate-400">{pillar.summary}</p>
                </div>
                <ul className="space-y-3">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          {item.href && item.status !== "blocked_provider" ? (
                            <Link
                              href={item.href}
                              className="inline-flex min-h-11 items-center text-sm font-medium text-sky-300 hover:underline"
                            >
                              {item.label}
                            </Link>
                          ) : (
                            <p className="py-2 text-sm font-medium text-slate-200">{item.label}</p>
                          )}
                          <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>
                          {item.note ? (
                            <p className="mt-1 text-xs text-slate-500">{item.note}</p>
                          ) : null}
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${statusClass(item.status)}`}
                        >
                          {statusLabel(item.status)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        <section className="dg-card">
          <h2 className="font-semibold text-white">What to do now</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-300">
            <li>
              {firstSteps.identifyDone ? (
                <>
                  Your business identity is on file — open{" "}
                  <Link
                    href="/dashboard/business"
                    className="inline-flex min-h-11 items-center text-sky-400 hover:underline"
                  >
                    Business Profile
                  </Link>{" "}
                  to confirm the details.
                </>
              ) : (
                <>
                  Use the identity panel above to find or confirm your ABN / ACN, then review your{" "}
                  <Link
                    href="/dashboard/business"
                    className="inline-flex min-h-11 items-center text-sky-400 hover:underline"
                  >
                    Business Profile
                  </Link>
                  .
                </>
              )}
            </li>
            <li>
              Connect your digital presence through{" "}
              <Link
                href="/apps/infrastructure/domains"
                className="inline-flex min-h-11 items-center text-sky-400 hover:underline"
              >
                Domains
              </Link>
              ,{" "}
              <Link
                href="/apps/websites"
                className="inline-flex min-h-11 items-center text-sky-400 hover:underline"
              >
                Websites
              </Link>
              , and{" "}
              <Link
                href="/dashboard/settings/connectors"
                className="inline-flex min-h-11 items-center text-sky-400 hover:underline"
              >
                Connections
              </Link>
              .
            </li>
            <li>
              When you need to register a business name, use the official registration process with
              the business details you have confirmed here.
            </li>
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/support/help"
              className="inline-flex min-h-11 items-center rounded-full border border-slate-700 px-4 text-sm font-medium text-slate-200 hover:border-slate-600"
            >
              Setup help
            </Link>
            <Link
              href="/support"
              className="inline-flex min-h-11 items-center rounded-full border border-slate-700 px-4 text-sm font-medium text-slate-200 hover:border-slate-600"
            >
              Contact support
            </Link>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {BUSINESS_SETUP_CHECKLIST.length} setup checks available across your business launch path.
          </p>
        </section>
      </main>
    </>
  );
}
