"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";

import { useEnabledApps } from "@/components/platform/EnabledAppsProvider";
import { AppHorizontalSubnav } from "@/components/navigation/AppHorizontalSubnav";
import { resolveActiveAppNavigation } from "@dg/platform-core";

const SKIP_PREFIXES = ["/onboarding", "/signup", "/login"];

export function AppContextNav() {
  const pathname = usePathname();
  const { nav } = useEnabledApps();

  const active = useMemo(
    () => resolveActiveAppNavigation(pathname, nav.ia),
    [pathname, nav.ia],
  );

  if (!active || SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  const breadcrumbTail = active.activeRoute?.label;

  return (
    <div className="dg-context-nav shrink-0 border-b border-[var(--org-border-subtle,rgb(30_41_59))] bg-[color-mix(in_srgb,var(--org-bg-elevated,rgb(2_6_23))_55%,transparent)] px-4 py-3 sm:px-6 md:px-8">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
          <span className="font-semibold uppercase tracking-wider">{active.sectionLabel}</span>
          <span aria-hidden className="text-slate-600">
            /
          </span>
          <span className="truncate text-slate-300">{active.itemName}</span>
          {breadcrumbTail && breadcrumbTail !== active.itemName ? (
            <>
              <span aria-hidden className="text-slate-600">
                /
              </span>
              <span className="truncate text-slate-400">{breadcrumbTail}</span>
            </>
          ) : null}
        </div>

        <div className="min-w-0">
          <p className="text-lg font-semibold tracking-tight text-white">{active.itemName}</p>
          <div className="mt-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <AppHorizontalSubnav routes={active.routes} ariaLabel={`${active.itemName} sections`} />
          </div>
        </div>
      </div>
    </div>
  );
}
