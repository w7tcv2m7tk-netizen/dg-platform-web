"use client";

import Link from "next/link";
import { useState } from "react";

import { CommandHonestyBanner } from "./CommandHonestyBanner";

/** Collapsible operator constraints without dominating the cockpit. */
export function CommandBetaStatus() {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-xl border border-slate-700/80 bg-slate-950/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          System status / operator notes
        </span>
        <span className="text-xs text-slate-500">{open ? "▾" : "▸"}</span>
      </button>
      {open ? (
        <div className="space-y-3 border-t border-slate-800 px-4 py-4">
          <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 px-3 py-2.5 text-sm text-sky-50">
            <span className="font-medium text-white">Operator beta.</span> The active sales loop lives in{" "}
            <Link
              href="/command/growth-engine"
              className="inline-flex min-h-11 items-center text-sky-300 hover:underline"
            >
              Growth Engine
            </Link>
            . Platform operating references are available in{" "}
            <Link
              href="/command/docs"
              className="inline-flex min-h-11 items-center text-sky-300 hover:underline"
            >
              Platform docs
            </Link>
            .
          </div>
          <CommandHonestyBanner compact />
          <p className="text-xs text-slate-500">
            Support and audit remain owned by their dedicated operational surfaces:{" "}
            <Link
              href="/support"
              className="inline-flex min-h-11 items-center text-sky-400 hover:underline"
            >
              Support
            </Link>
            {" · "}
            <Link
              href="/dashboard/settings/audit"
              className="inline-flex min-h-11 items-center text-sky-400 hover:underline"
            >
              Audit log
            </Link>
            .
          </p>
        </div>
      ) : null}
    </section>
  );
}
