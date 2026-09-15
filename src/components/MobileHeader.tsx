"use client";

import { UserButton } from "@clerk/nextjs";
import { OrgBrandMark } from "@/components/brand/OrgBrandMark";
import { useOrgBrand } from "@/components/brand/OrgBrandProvider";
import { NotificationBell } from "@/components/platform/NotificationBell";
import { clerkAppearanceForBrand } from "@/lib/clerk-brand-appearance";

export function MobileHeader({ onMenuClick: _onMenuClick }: { onMenuClick: () => void }) {
  const brand = useOrgBrand();
  return (
    <header className="sticky top-0 z-40 grid min-h-[3.75rem] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b dg-branded-header px-3 pb-2 pt-2 backdrop-blur md:hidden" style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}>
      <div className="flex min-w-0 items-center justify-start"><OrgBrandMark variant="lockup" href="/dashboard" iconSize={26} logoWidth={142} align="left" className="max-w-full" /></div>
      <div className="flex shrink-0 items-center justify-end gap-2"><NotificationBell /><UserButton appearance={clerkAppearanceForBrand(brand)} /></div>
    </header>
  );
}
