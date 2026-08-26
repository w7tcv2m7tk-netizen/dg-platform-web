"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";

import { useEnabledApps } from "@/components/platform/EnabledAppsProvider";
import { AppHorizontalSubnav } from "@/components/navigation/AppHorizontalSubnav";
import { progressiveIntelligenceRoutes } from "@/lib/intelligence-progressive-nav";
import { resolveActiveAppNavigation } from "@dg/platform-core";

const SKIP_PREFIXES = ["/onboarding", "/signup", "/login"];

/**
 * Global second-level nav — large title is the active route (or app name).
 * Only renders when the active app has more than one visible route.
 */
export function AppContextNav() {
  const pathname = usePathname();
  const { nav } = useEnabledApps();

  const active = useMemo(
    () => resolveActiveAppNavigation(pathname, nav.ia),
    [pathname, nav.ia],
  );

  const routes = useMemo(() => {
    if (!active) return [];
    if (active.itemId === "intelligence") {
      return progressiveIntelligenceRoutes(active.routes, pathname);
    }
    return active.routes;
  }, [active, pathname]);

  if (!active || SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  const pageTitle = active.activeRoute?.label ?? active.itemName;

  return (
    <div className="dg-context-nav shrink-0 border-b border-[var(--org-border-subtle,rgb(30_41_59))] bg-[color-mix(in_srgb,var(--org-bg-elevated,rgb(2_6_23))_55%,transparent)] px-4 py-3 sm:px-6 md:px-8">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
          <span className="font-semibold uppercase tracking-wider">{active.sectionLabel}</span>
          <span aria-hidden className="text-slate-600">
            /
          </span>
          <span className="truncate text-slate-300">{active.itemName}</span>
        </div>

        <div className="min-w-0">
          <p className="text-lg font-semibold tracking-tight text-white">{pageTitle}</p>
          <div className="mt-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <AppHorizontalSubnav routes={routes} ariaLabel={`${active.itemName} sections`} />
          </div>
        </div>
      </div>
    </div>
  );
}
