import Link from "next/link";
import { communicationsHealthCheck } from "@dg/platform-core";

import { CommsSubnav } from "@/components/ai-communications/CommsSubnav";
import { getPlatformPageContext } from "@/lib/org-apps";

function providerLabel(value: string) {
  switch (value) {
    case "resend":
      return { label: "Resend", tone: "text-emerald-400" };
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

  const health = session
    ? await communicationsHealthCheck(session.organisationId)
    : null;

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
          {session?.organisationName ?? "DigitalGate"} · provider status and channel readiness
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
              <h2 className="font-semibold text-white">Provider matrix</h2>
              <p className="mt-1 text-sm text-slate-400">
                Honest status — email sends via Resend when{" "}
                <code className="text-slate-300">RESEND_API_KEY</code> is set; otherwise messages
                queue in stub mode without delivery.
              </p>
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
              <p className="mt-4 text-xs text-slate-500">
                SMS and voice are not wired — no Twilio or telephony integration in this build.
              </p>
            </div>

            <div className="dg-card">
              <h2 className="font-semibold text-white">Send via API</h2>
              <p className="mt-2 text-sm text-slate-400">
                Outbound messages are queued through the Platform API. Use your organisation API key
                with the communications endpoints when they ship.
              </p>
              <Link
                href="/dashboard/settings/api"
                className="mt-3 inline-block text-sm text-blue-400 hover:underline"
              >
                API keys & docs →
              </Link>
            </div>
          </>
        )}
      </main>
    </>
  );
}
