"use client";

import { UserButton } from "@clerk/nextjs";
import { OrgBrandMark } from "@/components/brand/OrgBrandMark";
import { useOrgBrand } from "@/components/brand/OrgBrandProvider";
import { NotificationBell } from "@/components/platform/NotificationBell";
import { clerkAppearanceForBrand } from "@/lib/clerk-brand-appearance";

export function MobileHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const brand = useOrgBrand();
  return (
    <header className="sticky top-0 z-40 grid min-h-[3.75rem] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b dg-branded-header px-3 pb-2 pt-2 backdrop-blur md:hidden" style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}>
      <button type="button" onClick={onMenuClick} aria-label="Open navigation" className="dg-touch-target inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--org-border-subtle,rgb(30_41_59))] bg-[var(--org-bg-surface)] text-xl text-slate-200 active:bg-[var(--org-bg-surface-hover)]">☰</button>
      <div className="flex min-w-0 items-center justify-start"><OrgBrandMark variant="logo" href="/dashboard" logoWidth={190} align="left" className="max-w-full" /></div>
      <div className="flex shrink-0 items-center justify-end gap-2"><NotificationBell /><UserButton appearance={clerkAppearanceForBrand(brand)} /></div>
    </header>
  );
}
