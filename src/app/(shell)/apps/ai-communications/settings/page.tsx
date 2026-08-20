import Link from "next/link";
import {
  communicationsHealthCheck,
  getCommunicationsOverview,
  getVoiceProviderStatus,
} from "@dg/platform-core";

import { CommsSubnav } from "@/components/ai-communications/CommsSubnav";
import { getPlatformPageContext } from "@/lib/org-apps";

function providerLabel(value: string) {
  switch (value) {
    case "resend":
      return { label: "Resend", tone: "text-emerald-400" };
    case "elevenlabs":
      return { label: "ElevenLabs (voice provider)", tone: "text-emerald-400" };
    case "stub_queue":
      return { label: "Stub queue (dev)", tone: "text-amber-400" };
    case "not_configured":
      return { label: "Not configured", tone: "text-slate-500" };
    default:
      return { label: value, tone: "text-slate-400" };
  }
}

export default async function CommsSettingsPage() {
  const { session } = await getPlatformPageContext();

  const health = session ? await communicationsHealthCheck(session.organisationId) : null;
  const voice = session ? await getVoiceProviderStatus() : null;
  const overview = session ? await getCommunicationsOverview(session.organisationId) : null;

  const channels = health
    ? [
        { id: "email", label: "Email", provider: health.providers.email },
        { id: "sms", label: "SMS", provider: health.providers.sms },
        { id: "voice", label: "Voice", provider: health.providers.voice },
      ]
    : [];

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Communications settings</h1>
        <p className="text-sm text-slate-400">
          {session?.organisationName ?? "DigitalGate"} · provider status, defaults, and usage
        </p>
        <CommsSubnav active="/apps/ai-communications/settings" />
      </header>
      <main className="dg-page-main space-y-6">
        {!session ? (
          <div className="dg-card">
            <p className="text-sm text-slate-400">Sign in to view communications settings.</p>
          </div>
        ) : (
          <>
            <div className="dg-card">
              <h2 className="font-semibold text-white">Voice provider</h2>
              <p className="mt-1 text-sm text-slate-400">
                Connection uses a server-side API key. It is never stored on the organisation
                record or sent to the browser.
              </p>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Provider</dt>
                  <dd className="text-white">{voice?.provider ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">API key</dt>
                  <dd className={voice?.configured ? "text-emerald-400" : "text-amber-400"}>
                    {voice?.configured ? "Configured" : "Missing ELEVENLABS_API_KEY"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Connection</dt>
                  <dd className={voice?.connected ? "text-emerald-400" : "text-slate-400"}>
                    {voice?.connected ? "Reachable" : "Not connected"}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="dg-card">
              <h2 className="font-semibold text-white">Channel matrix</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-left text-slate-500">
                      <th className="pb-2 pr-4 font-medium">Channel</th>
                      <th className="pb-2 font-medium">Provider</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channels.map((ch) => {
                      const { label, tone } = providerLabel(ch.provider);
                      return (
                        <tr key={ch.id} className="border-b border-slate-800/60">
                          <td className="py-3 pr-4 text-white">{ch.label}</td>
                          <td className={`py-3 ${tone}`}>{label}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="dg-card">
              <h2 className="font-semibold text-white">Usage</h2>
              <p className="mt-2 text-sm text-slate-400">
                Provider cost is stored per session. DigitalGate fees and markup are configured
                separately later — this is not hard-coded to ElevenLabs pricing.
              </p>
              <p className="mt-3 text-sm text-white">
                Estimated provider cost: $
                {(((overview?.estimatedCostCents ?? 0) as number) / 100).toFixed(2)} ·{" "}
                {overview?.conversations ?? 0} conversations
              </p>
            </div>

            <div className="dg-card">
              <h2 className="font-semibold text-white">Compliance defaults</h2>
              <p className="mt-2 text-sm text-slate-400">
                Recording disclosure, Australian privacy handling, and human fallback are set per
                agent in Agent Builder. Webhook URL for post-call events:{" "}
                <code className="text-slate-300">/api/webhooks/elevenlabs</code>
              </p>
              <Link
                href="/apps/ai-communications/agents"
                className="mt-3 inline-block text-sm text-sky-400 hover:underline"
              >
                Open Agent Builder →
              </Link>
            </div>
          </>
        )}
      </main>
    </>
  );
}
