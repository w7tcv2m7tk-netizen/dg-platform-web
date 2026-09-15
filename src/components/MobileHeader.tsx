"use client";

import { UserButton } from "@clerk/nextjs";
import { OrgBrandMark } from "@/components/brand/OrgBrandMark";
import { useOrgBrand } from "@/components/brand/OrgBrandProvider";
import { NotificationBell } from "@/components/platform/NotificationBell";
import { clerkAppearanceForBrand } from "@/lib/clerk-brand-appearance";

function MenuIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5" aria-hidden><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
}

export function MobileHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const brand = useOrgBrand();
  return (
    <header className="sticky top-0 z-40 grid h-[3.5rem] grid-cols-[2.75rem_minmax(0,1fr)_auto] items-end gap-2 border-b dg-branded-header px-3 pb-1.5 backdrop-blur md:hidden" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <button type="button" onClick={onMenuClick} aria-label="Open menu" className="dg-touch-target flex shrink-0 items-center justify-center rounded-lg border dg-branded-surface text-slate-200 transition hover:text-white"><MenuIcon /></button>
      <div className="flex min-w-0 items-center justify-center px-1 pb-0.5"><OrgBrandMark variant="lockup" href="/dashboard" iconSize={20} logoWidth={100} align="center" className="max-w-full" /></div>
      <div className="flex shrink-0 items-center justify-end gap-2"><NotificationBell /><UserButton appearance={clerkAppearanceForBrand(brand)} /></div>
    </header>
  );
}
