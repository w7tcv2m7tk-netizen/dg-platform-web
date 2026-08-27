"use client";

import { useState } from "react";
import Link from "next/link";

import { CommandHonestyBanner } from "./CommandHonestyBanner";

/**
 * Collapsible beta / staff constraints — available without dominating the cockpit.
 * @see docs/COMMAND-CENTRE-BETA.md
 */
export function CommandBetaStatus() {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-xl border border-slate-700/80 bg-slate-950/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          System status / Beta information
        </span>
        <span className="text-xs text-slate-500">{open ? "▾" : "▸"}</span>
      </button>
      {open ? (
        <div className="space-y-3 border-t border-slate-800 px-4 py-4">
          <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 px-3 py-2.5 text-sm text-sky-50">
            <span className="font-medium text-white">Staff closed beta.</span> Core loop lives in{" "}
            <Link href="/command/growth-engine" className="text-sky-300 hover:underline">
              Growth Engine
            </Link>{" "}
            (send → follow-ups → convert). Playbook:{" "}
            <code className="text-sky-200">docs/COMMAND-CENTRE-BETA.md</code>.
          </div>
          <CommandHonestyBanner compact />
          <p className="text-xs text-slate-500">
            Deferred Command modules (redirect only):{" "}
            <code className="text-slate-400">/command/support</code> →{" "}
            <Link href="/support" className="text-sky-400 hover:underline">
              /support
            </Link>
            {" · "}
            <code className="text-slate-400">/command/audit</code> →{" "}
            <Link href="/dashboard/settings/audit" className="text-sky-400 hover:underline">
              tenant audit settings
            </Link>
            .
          </p>
        </div>
      ) : null}
    </section>
  );
}
