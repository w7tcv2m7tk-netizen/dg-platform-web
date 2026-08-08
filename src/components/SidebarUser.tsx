"use client";

import { UserButton } from "@clerk/nextjs";

import { useOrgBrand } from "@/components/brand/OrgBrandProvider";
import { NotificationBell } from "@/components/platform/NotificationBell";
import { clerkAppearanceForBrand } from "@/lib/clerk-brand-appearance";

export function SidebarUser() {
  const brand = useOrgBrand();

  return (
    <div className="shrink-0 border-t border-slate-800 pt-4">
      <div className="flex items-center gap-3 px-2">
        <UserButton appearance={clerkAppearanceForBrand(brand)} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-slate-300">Account</p>
          <p className="text-[10px] text-slate-500">Manage profile & sign out</p>
        </div>
        <NotificationBell />
      </div>
    </div>
  );
}
