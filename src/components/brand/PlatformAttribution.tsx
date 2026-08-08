"use client";

import Link from "next/link";

import { BRAND_DEFAULT } from "@/lib/brand";

/** Footer mark — aligned with nav `px-3`, DigitalGate icon + white tagline. */
export function PlatformAttribution({ className = "" }: { className?: string }) {
  return (
    <div className={`border-t border-slate-800 pt-3 ${className}`}>
      <Link
        href="https://digitalgate.com.au"
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-2.5 rounded-lg px-3 py-2 transition hover:bg-[var(--org-bg-surface-hover)]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BRAND_DEFAULT.icon}
          alt=""
          width={24}
          height={24}
          className="shrink-0 rounded-md opacity-95 transition group-hover:opacity-100"
          aria-hidden
        />
        <span className="min-w-0 leading-tight">
          <span className="block text-xs font-semibold tracking-wide text-white">
            DigitalGate
          </span>
          <span className="block text-[11px] font-medium text-white/90">
            Business Platform
          </span>
        </span>
      </Link>
    </div>
  );
}
