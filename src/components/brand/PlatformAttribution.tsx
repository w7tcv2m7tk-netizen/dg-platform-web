"use client";

import Link from "next/link";

import { BRAND_DEFAULT } from "@/lib/brand";

export function PlatformAttribution({ className = "" }: { className?: string }) {
  return (
    <div className={`border-t border-[var(--org-border-subtle)] pt-3 ${className}`}>
      <Link
        href="https://digitalgate.com.au"
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-2.5 rounded-lg px-1 py-1 transition hover:bg-[var(--org-bg-surface-hover)]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BRAND_DEFAULT.icon}
          alt=""
          width={22}
          height={22}
          className="shrink-0 rounded-md opacity-90 transition group-hover:opacity-100"
          aria-hidden
        />
        <span className="min-w-0 leading-tight">
          <span className="block text-xs font-semibold tracking-wide text-slate-200 transition group-hover:text-white">
            DigitalGate
          </span>
          <span className="block text-[11px] font-medium text-[var(--org-primary)] transition group-hover:brightness-110">
            Business Platform
          </span>
        </span>
      </Link>
    </div>
  );
}
