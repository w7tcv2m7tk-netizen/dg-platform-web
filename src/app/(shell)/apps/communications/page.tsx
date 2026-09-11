import Link from "next/link";
import { sessionHasFeature } from "@dg/platform-core";

import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

const CHANNELS = [
  { href: "/apps/communications/inbox", label: "Inbox", blurb: "Universal conversations" },
  { href: "/apps/communications/email", label: "Email", blurb: "Compose, sent, mailboxes" },
] as const;

const AI_COMMS = [
  {
    featureId: "comms.voice.read",
    href: "/apps/ai-communications/voice",
    label: "Voice Agents",
    blurb: "AI voice employees",
  },
  {
    featureId: "comms.call_centre.read",
    href: "/apps/ai-communications/call-centre",
    label: "Call Centre",
    blurb: "AI call activity and outcomes",
  },
  {
    featureId: "comms.agents.configure",
    href: "/apps/ai-communications/agents",
    label: "Agent Builder",
    blurb: "Configure and publish",
  },
  {
    featureId: "comms.knowledge.read",
    href: "/apps/ai-communications/knowledge",
    label: "Knowledge",
    blurb: "Approved business context for AI conversations",
  },
] as const;

const CONFIG = [
  {
    featureId: "comms.agents.configure",
    href: "/apps/ai-communications/settings",
    label: "AI Communications Settings",
    blurb: "Agent behaviour, voice experience and usage",
  },
  {
    featureId: "communications.read",
    href: "/apps/communications/signatures",
    label: "Signatures",
    blurb: "Email Signature Studio",
  },
] as const;

function CardLink({ href, label, blurb }: { href: string; label: string; blurb: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-4 py-4 transition hover:border-sky-500/40 hover:bg-slate-900/60"
    >
      <p className="font-medium text-white">{label}</p>
      <p className="mt-1 text-sm text-slate-400">{blurb}</p>
    </Link>
  );
}

export default async function CommunicationsOverviewPage() {
  const session = await getAuthorisedPlatformPageSession("communications.read");
  if (!session) return null;

  const aiComms = AI_COMMS.filter((item) => sessionHasFeature(session, item.featureId));
  const config = CONFIG.filter((item) => sessionHasFeature(session, item.featureId));

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Communications</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Centralise customer conversations and use the communication capabilities enabled for this organisation.
        </p>
      </header>
      <main className="dg-page-main space-y-8">
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Channels</h2>
          <p className="mt-1 text-sm text-slate-400">Live customer communication channels in DigitalGate.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CHANNELS.map((item) => (
              <CardLink key={item.href} {...item} />
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Additional channels will appear here as they become available for this organisation.
          </p>
        </section>

        {aiComms.length > 0 ? (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">AI Communications</h2>
            <p className="mt-1 text-sm text-slate-400">
              AI-powered communication capabilities available to your role.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {aiComms.map((item) => (
                <CardLink key={item.href} href={item.href} label={item.label} blurb={item.blurb} />
              ))}
            </div>
          </section>
        ) : null}

        {config.length > 0 ? (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Configuration</h2>
            <p className="mt-1 text-sm text-slate-400">Communication settings available to your role.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {config.map((item) => (
                <CardLink key={item.href} href={item.href} label={item.label} blurb={item.blurb} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </>
  );
}
