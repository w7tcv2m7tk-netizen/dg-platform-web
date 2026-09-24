"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { useEnabledApps } from "@/components/platform/EnabledAppsProvider";
import { AppHorizontalSubnav } from "@/components/navigation/AppHorizontalSubnav";
import { resolveActiveAppNavigation, routeIsActive } from "@dg/platform-core";

const SKIP_PREFIXES = ["/onboarding", "/signup", "/login"];

/**
 * Global second-level nav — breadcrumb stays Core / App / Active tab.
 * Overview pages may use cards; they must not mount a second nav hierarchy.
 */
export function AppContextNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const location = query ? `${pathname}?${query}` : pathname;
  const { nav } = useEnabledApps();

  const active = useMemo(
    () => resolveActiveAppNavigation(location, nav.ia),
    [location, nav.ia],
  );

  const routes = useMemo(() => {
    if (!active) return [];

    // Command Centre is one operator cockpit. Customers, Partners, Support,
    // Delivery, Commercial, Platform and Intelligence are first-class sidebar
    // destinations with their own context navigation rather than Command tabs.
    if (active.itemId === "command-centre") {
      return [{ path: "/command", label: "Command Centre", exact: true }];
    }

    // Business Brain is a first-class Business surface. The canonical navigation
    // still groups supporting intelligence under Overview, so expose Brain here
    // explicitly and stop Overview from swallowing /dashboard/brain routes.
    if (active.itemId === "business") {
      const routePath = (value: string) => value.split("?")[0] ?? value;
      const withoutHiddenBrain = active.routes.map((route) =>
        routePath(route.path) === "/dashboard"
          ? {
              ...route,
              matchAlso: route.matchAlso?.filter(
                (match) => match !== "/dashboard/brain",
              ),
            }
          : route,
      );
      const hasBrain = withoutHiddenBrain.some(
        (route) => routePath(route.path) === "/dashboard/brain",
      );
      if (!hasBrain) {
        const overviewIndex = withoutHiddenBrain.findIndex(
          (route) => routePath(route.path) === "/dashboard",
        );
        const insertAt = overviewIndex >= 0 ? overviewIndex + 1 : 0;
        return [
          ...withoutHiddenBrain.slice(0, insertAt),
          {
            path: "/dashboard/brain",
            label: "Business Brain",
            matchAlso: [
              "/dashboard/brain/sources",
              "/dashboard/brain/knowledge",
            ],
          },
          ...withoutHiddenBrain.slice(insertAt),
        ];
      }
      return withoutHiddenBrain;
    }

    // Industry rows may union multiple active business-type routes. Scope the
    // horizontal navigation to the business type currently open. Business-type
    // discovery and activation belongs in Apps, not inside the Industry workspace.
    if (active.sectionId === "industry") {
      const mount = pathname.match(/^(\/apps\/[^/]+)/)?.[1];
      if (mount) {
        const scoped = active.routes.filter((r) => {
          const routePath = r.path.split("?")[0] ?? r.path;
          return routePath === mount || routePath.startsWith(`${mount}/`);
        });
        if (scoped.length) return scoped;
      }
    }
    return active.routes;
  }, [active, pathname]);

  const pageTitle = useMemo(() => {
    if (!active) return "";
    const activeInScoped = routes.find((route) =>
      routeIsActive(location, route.path, routes),
    );
    return activeInScoped?.label ?? active.activeRoute?.label ?? active.itemName;
  }, [active, location, routes]);

  if (!active || SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  const showSubnav = routes.length > 1;
  const showRouteCrumb = Boolean(pageTitle) && pageTitle !== active.itemName;

  return (
    <div className="dg-context-nav shrink-0 border-b border-[var(--org-border-subtle,rgb(30_41_59))] bg-[color-mix(in_srgb,var(--org-bg-elevated,rgb(2_6_23))_55%,transparent)] px-4 py-3 sm:px-6 md:px-8">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
          <span className="font-semibold uppercase tracking-wider">{active.sectionLabel}</span>
          <span aria-hidden className="text-slate-600">/</span>
          <span className="truncate text-slate-300">{active.itemName}</span>
          {showRouteCrumb ? (
            <>
              <span aria-hidden className="text-slate-600">/</span>
              <span className="truncate text-slate-400">{pageTitle}</span>
            </>
          ) : null}
        </div>

        <div className="min-w-0">
          <p className="text-lg font-semibold tracking-tight text-white">{pageTitle}</p>
          {showSubnav ? (
            <div className="mt-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <AppHorizontalSubnav
                routes={routes}
                ariaLabel={`${active.itemName} sections`}
                maxVisible={active.itemId === "dg-partners" ? 7 : undefined}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}