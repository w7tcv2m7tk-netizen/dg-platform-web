import Link from "next/link";
import { notFound } from "next/navigation";
import {
  communicationsHealthCheck,
  getCommunicationsOverview,
  getVoiceProviderStatus,
  sessionHasFeature,
} from "@dg/platform-core";

import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

function statusTone(ready: boolean) {
  return ready ? "text-emerald-400" : "text-amber-400";
}

export default async function CommsSettingsPage() {
  const session = await getAuthorisedPlatformPageSession("comms.agents.configure");
  if (!session) notFound();

  const canViewBilling = sessionHasFeature(session, "comms.billing.read");
  const [health, voice, overview] = await Promise.all([
    communicationsHealthCheck(session.organisationId),
    getVoiceProviderStatus(),
    canViewBilling ? getCommunicationsOverview(session.organisationId) : Promise.resolve(null),
  ]);

  const emailReady = health.providers.email === "resend";
  const voiceReady = Boolean(voice.configured && voice.connected);

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">AI Communications Settings</h1>
        <p className="mt-1 text-sm text-slate-400">
          Review the communication capabilities available to {session.organisationName} and manage
          agent defaults.
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <div className="dg-card">
          <h2 className="font-semibold text-white">Service status</h2>
          <p className="mt-1 text-sm text-slate-400">
            DigitalGate manages the underlying communication services. You only need to know whether
            each live capability is ready for your organisation.
          </p>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Email delivery</dt>
              <dd className={statusTone(emailReady)}>
                {emailReady ? "Available" : "Needs setup"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">AI voice</dt>
              <dd className={statusTone(voiceReady)}>
                {voiceReady ? "Connected" : "Needs setup"}
              </dd>
            </div>
          </dl>
          {!emailReady || !voiceReady ? (
            <p className="mt-4 text-xs text-slate-500">
              If a capability you need is not ready, DigitalGate can complete the platform-side setup
              without exposing provider credentials or technical configuration to your team.
            </p>
          ) : null}
        </div>

        <div className="dg-card">
          <h2 className="font-semibold text-white">AI agents</h2>
          <p className="mt-2 text-sm text-slate-400">
            Create and manage the voice agents that represent your business. Identity, behaviour,
            approved knowledge, privacy handling and human fallback are configured per agent.
          </p>
          <Link
            href="/apps/ai-communications/agents"
            className="mt-3 inline-block text-sm text-sky-400 hover:underline"
          >
            Open Agent Builder →
          </Link>
        </div>

        {canViewBilling ? (
          <div className="dg-card">
            <h2 className="font-semibold text-white">Usage</h2>
            <p className="mt-2 text-sm text-slate-400">
              Current recorded AI communication usage for this organisation.
            </p>
            <p className="mt-3 text-sm text-white">
              Estimated usage cost: ${(((overview?.estimatedCostCents ?? 0) as number) / 100).toFixed(2)} ·{" "}
              {overview?.conversations ?? 0} conversations
            </p>
          </div>
        ) : null}

        <div className="dg-card">
          <h2 className="font-semibold text-white">Communications</h2>
          <p className="mt-2 text-sm text-slate-400">
            Return to the Communications workspace to use the channels and AI capabilities currently enabled for your organisation.
          </p>
          <Link
            href="/apps/communications"
            className="mt-3 inline-block text-sm text-sky-400 hover:underline"
          >
            Back to Communications →
          </Link>
        </div>
      </main>
    </>
  );
}
