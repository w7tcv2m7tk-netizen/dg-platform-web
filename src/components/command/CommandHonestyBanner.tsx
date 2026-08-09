import Link from "next/link";

/**
 * Shared staff note for Command Centre beta honesty constraints.
 * @see docs/COMMAND-CENTRE-BETA.md
 */
export function CommandHonestyBanner({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-3 text-xs text-slate-400">
        Honest beta: Growth MRR won $0 · Expansion = catalogue list prices · Call today ≠ AI SDR ·
        Support/Audit redirect · Success Score matures with data.{" "}
        <Link href="/command/growth-engine" className="text-sky-400 hover:underline">
          Growth Engine
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-4 text-sm text-amber-50">
      <p className="font-medium text-white">Honest beta constraints</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-100/85">
        <li>
          <strong className="font-medium text-white">Growth MRR won / forecast</strong> stay $0
          until Stripe attribution (Commerce MRR on Revenue is separate).
        </li>
        <li>
          <strong className="font-medium text-white">Expansion</strong> uses a static app catalogue
          of list prices — not Stripe revenue.
        </li>
        <li>
          <strong className="font-medium text-white">Sales Assistant</strong> = ranked Call today
          list — not an autonomous AI SDR.
        </li>
        <li>
          <strong className="font-medium text-white">Support / Audit</strong> Command modules are
          deferred — routes redirect only.
        </li>
        <li>
          <strong className="font-medium text-white">Success Score™ / Twin</strong> improve as
          tenant data lands — don’t invent gaps.
        </li>
      </ul>
    </div>
  );
}
