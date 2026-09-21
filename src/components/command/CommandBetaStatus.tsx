"use client";

import Link from "next/link";
import { useState } from "react";

import { CommandHonestyBanner } from "./CommandHonestyBanner";

/** Collapsible operator constraints without dominating the cockpit. */
export function CommandBetaStatus() {
  const [open, setOpen] = useState(false);

  return (
    <section className="border-t border-white/5 pt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 w-full items-center justify-between gap-3 py-2 text-left"
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
          System status / operator notes
        </span>
        <span className="text-xs text-slate-600">{open ? "▾" : "▸"}</span>
      </button>
      {open ? (
        <div className="space-y-3 pb-2 pt-2">
          <div className="text-sm leading-6 text-slate-400">
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
