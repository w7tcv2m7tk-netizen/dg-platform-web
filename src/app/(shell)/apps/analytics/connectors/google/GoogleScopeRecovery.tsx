import Link from "next/link";

export function GoogleScopeRecovery() {
  return <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950/30 p-3 text-xs text-slate-300">
    <p>If Google keeps returning the old permissions, remove DigitalGate from your Google Account connections first, then re-authorise here. This does not delete your Google Analytics, Search Console or Business Profile data.</p>
    <div className="mt-2 flex flex-wrap gap-3">
      <Link href="/api/connectors/google/analytics/revoke-help" target="_blank" className="text-sky-400 hover:underline">Open Google connections ↗</Link>
      <Link href="/api/connectors/google/connect?returnTo=/apps/analytics/connectors/google" className="text-sky-400 hover:underline">Re-authorise DigitalGate →</Link>
    </div>
  </div>;
}
