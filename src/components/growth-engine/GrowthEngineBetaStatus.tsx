"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * Operator honesty constraints — collapsed by default so the hub sells the workflow.
 * @see docs/COMMAND-CENTRE-BETA.md
 */
export function GrowthEngineBetaStatus() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm text-slate-400 hover:text-slate-200"
        aria-expanded={open}
      >
        <span>Beta status &amp; limitations</span>
        <span className="text-xs text-slate-500">{open ? "Hide ↑" : "Show →"}</span>
      </button>
      {open ? (
        <div className="space-y-2 border-t border-slate-800 px-4 py-3 text-xs text-slate-400">
          <p>
            Growth MRR won stays $0 until Stripe attribution · Expansion uses catalogue list prices ·
            Call today ≠ autonomous AI SDR · Support/Audit Command modules redirect only · Success
            Score™ matures with data.
          </p>
          <p>
            Playbook:{" "}
            <code className="text-slate-300">docs/COMMAND-CENTRE-BETA.md</code>
            {" · "}
            <Link href="/command" className="text-sky-400 hover:underline">
              Command Centre
            </Link>
          </p>
        </div>
      ) : null}
    </div>
  );
}
