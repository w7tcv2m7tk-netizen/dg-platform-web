"use client";

import { UserButton } from "@clerk/nextjs";

import { OrgBrandMark } from "@/components/brand/OrgBrandMark";
import { useOrgBrand } from "@/components/brand/OrgBrandProvider";
import { NotificationBell } from "@/components/platform/NotificationBell";
import { clerkAppearanceForBrand } from "@/lib/clerk-brand-appearance";

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="h-5 w-5"
      aria-hidden
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function MobileHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const brand = useOrgBrand();

  return (
    <header
      className="sticky top-0 z-40 flex items-center gap-3 border-b dg-branded-header px-4 py-3 backdrop-blur md:hidden"
      style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
    >
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open menu"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border dg-branded-surface text-slate-200 transition hover:text-white"
      >
        <MenuIcon />
      </button>

      <OrgBrandMark
        variant="lockup"
        href="/dashboard"
        iconSize={22}
        logoWidth={96}
        className="min-w-0 flex-1"
      />

      <NotificationBell />

      <UserButton appearance={clerkAppearanceForBrand(brand)} />
    </header>
  );
}
