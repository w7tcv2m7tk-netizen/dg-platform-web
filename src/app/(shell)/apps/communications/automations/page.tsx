import Link from "next/link";

import { CommunicationsSubnav } from "@/components/communications/CommunicationsList";
import { getPlatformPageContext } from "@/lib/platform-page-context";

const CATALOGUE = [
  {
    id: "founding_10_personal_invitation",
    title: "Founding 10 personal invitation",
    source: "system",
    detail: "Sent when staff invite a prospect into the Founding 10 cohort.",
    historyHref: "/apps/communications/history?filter=system",
    actionHref: "/command/founding",
    actionLabel: "Open Founding pipeline",
  },
  {
    id: "founding_10_stage",
    title: "Founding stage emails",
    source: "system",
    detail: "Stage-side-effect mail (acceptance, onboarding nudges) via Founding programme.",
    historyHref: "/apps/communications/history?filter=system",
    actionHref: "/command/founding",
    actionLabel: "Open Founding pipeline",
  },
  {
    id: "platform_referral_invite",
    title: "Platform referral invite",
    source: "system",
    detail: "Refer & Earn invite email when someone is invited onto the platform.",
    historyHref: "/apps/communications/history?filter=system",
    actionHref: "/command/referrals",
    actionLabel: "Open referrals",
  },
] as const;

export default async function CommunicationsAutomationsPage() {
  const { session } = await getPlatformPageContext();

  if (!session?.organisationId) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Automations</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-sm text-slate-500">Sign in to continue.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/communications" className="text-sm text-sky-400 hover:underline">
          ← Communications
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Automations</h1>
        <p className="mt-1 text-sm text-slate-400">
          System and invite emails DigitalGate can send today. Full drip sequencing stays with
          Prospecting / Automation — those emit Communication records here.
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <CommunicationsSubnav active="email" />
        <ul className="space-y-3">
          {CATALOGUE.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-slate-700/60 bg-slate-800/30 px-4 py-4"
            >
              <p className="text-sm font-medium text-white">{item.title}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                source · {item.source} · {item.id}
              </p>
              <p className="mt-2 text-sm text-slate-400">{item.detail}</p>
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                <Link href={item.historyHref} className="text-sky-400 hover:underline">
                  View in History
                </Link>
                <Link href={item.actionHref} className="text-sky-400 hover:underline">
                  {item.actionLabel}
                </Link>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-500">
          Multi-step drip builders and Prospecting campaign sequencers are not built here yet —
          when they send, rows appear under History with source Automation or Prospecting.
        </p>
      </main>
    </>
  );
}
