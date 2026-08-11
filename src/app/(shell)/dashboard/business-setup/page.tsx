import Link from "next/link";

import {
  ASIC_CONNECTOR_STATUS,
  BUSINESS_SETUP_CHECKLIST,
  BUSINESS_SETUP_PILLARS,
  BUSINESS_SETUP_POSITIONING,
  abrCredentialsConfigured,
  checklistForPillar,
  currentBusinessSetupPhase,
  getAsicConnectorLifecycle,
  type BusinessSetupStepStatus,
} from "@dg/platform-core";

import { BusinessSetupIdentifyPanel } from "@/components/platform/BusinessSetupIdentifyPanel";
import { getPlatformPageContext } from "@/lib/org-apps";

function statusLabel(status: BusinessSetupStepStatus): string {
  switch (status) {
    case "available":
      return "Ready";
    case "partial":
      return "Partial";
    case "deferred":
      return "Coming next";
    case "blocked_provider":
      return "Waiting on provider";
    case "roadmap":
      return "Roadmap";
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

/**
 * Start Your Business — Launchpad for Business Services / Business Setup.
 * Identify is live-ish (ABR). Does not invent ASIC availability or registration success.
 */
export default async function BusinessSetupPage() {
  const { session: platformSession } = await getPlatformPageContext();
  const phase = currentBusinessSetupPhase();
  const abrReady = abrCredentialsConfigured();
  const asicLifecycle = getAsicConnectorLifecycle();

  return (
    <>
      <header className="dg-page-header">
        <Link href="/dashboard" className="text-sm text-sky-400 hover:underline">
          ← Overview
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Start Your Business</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">{BUSINESS_SETUP_POSITIONING}</p>
        <p className="mt-2 text-sm text-slate-500">
          {platformSession?.organisationName ?? "DigitalGate"} · Business Setup · Phase {phase}{" "}
          · Identify
        </p>
      </header>

      <main className="dg-page-main space-y-6">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-slate-300">
          <p className="font-medium text-amber-200">Honest launch path</p>
          <p className="mt-1 text-slate-400">
            Identify → Register → Establish → Build → Connect → Grow. ABN / ACN
            verification uses the ABR connector when configured. Name registration
            stays blocked until the authorised digital pathway is approved — we never
            invent availability or claim a registration succeeded.
          </p>
          <ul className="mt-3 space-y-1 text-slate-400">
            <li>
              ABR credentials:{" "}
              <span className={abrReady ? "text-emerald-300" : "text-amber-300"}>
                {abrReady
                  ? "configured"
                  : "not set (ABN_LOOKUP_GUID or ABR_GUID in .env.local)"}
              </span>
            </li>
            <li>
              Name registration connector:{" "}
              <span className="text-rose-300">
                {ASIC_CONNECTOR_STATUS} ({asicLifecycle})
              </span>
            </li>
          </ul>
        </div>

        <BusinessSetupIdentifyPanel abrConfigured={abrReady} />

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
                              className="text-sm font-medium text-sky-300 hover:underline"
                            >
                              {item.label}
                            </Link>
                          ) : (
                            <p className="text-sm font-medium text-slate-200">{item.label}</p>
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
              Identify: use the panel above to verify ABN / ACN (or search by name),
              then apply to{" "}
              <Link href="/dashboard/business" className="text-sky-400 hover:underline">
                Business Profile
              </Link>
              .
            </li>
            <li>
              Connect digital presence via{" "}
              <Link
                href="/apps/infrastructure/domains"
                className="text-sky-400 hover:underline"
              >
                Domains
              </Link>{" "}
              and{" "}
              <Link href="/apps/websites" className="text-sky-400 hover:underline">
                Websites
              </Link>
              .
            </li>
            <li>
              Name registration in-product stays on hold until the authorised
              digital service provider pathway is approved — use the official
              process with details prepared here when that step opens.
            </li>
          </ol>
          <p className="mt-3 text-xs text-slate-500">
            {BUSINESS_SETUP_CHECKLIST.length} checklist items · capability: Business Services ·
            docs/foundations/BUSINESS-SETUP.md
          </p>
        </section>
      </main>
    </>
  );
}
