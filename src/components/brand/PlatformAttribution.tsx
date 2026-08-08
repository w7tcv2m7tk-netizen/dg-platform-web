"use client";

import { DigitalGateLogo } from "@/components/brand/DigitalGateLogo";

/** Footer — always DigitalGate (platform attribution), aligned with nav `px-3`. */
export function PlatformAttribution({ className = "" }: { className?: string }) {
  return (
    <div className={`border-t border-slate-800 pt-3 ${className}`}>
      <DigitalGateLogo
        variant="lockup"
        href="https://digitalgate.com.au"
        iconSize={24}
        logoWidth={120}
        showTagline
        className="w-full rounded-lg px-3 py-2 transition hover:bg-[var(--org-bg-surface-hover)]"
      />
    </div>
  );
}
