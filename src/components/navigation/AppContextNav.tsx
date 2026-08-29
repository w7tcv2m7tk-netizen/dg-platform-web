"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";

import { useEnabledApps } from "@/components/platform/EnabledAppsProvider";
import { IndustryTemplateSwitcher } from "@/components/industry/IndustryTemplateSwitcher";
import { AppHorizontalSubnav } from "@/components/navigation/AppHorizontalSubnav";
import { industryIdFromPathname, resolveActiveAppNavigation } from "@dg/platform-core";

const SKIP_PREFIXES = ["/onboarding", "/signup", "/login"];

/**
 * Global second-level nav — breadcrumb stays Core / App / Active tab.
 * Overview pages may use cards; they must not mount a second nav hierarchy.
 */
export function AppContextNav() {
  const pathname = usePathname();
  const { nav } = useEnabledApps();

  const active = useMemo(
    () => resolveActiveAppNavigation(pathname, nav.ia),
    [pathname, nav.ia],
  );

  const industryId = useMemo(() => {
    if (active?.sectionId === "industry" && active.itemId.startsWith("industry--")) {
      return active.itemId.slice("industry--".length);
    }
    return industryIdFromPathname(pathname);
  }, [active, pathname]);

  const routes = useMemo(() => {
    if (!active) return [];
    // Industry sidebar unions all active Template routes — show only the
    // current Template mount's tabs under the switcher.
    if (active.sectionId === "industry") {
      const mount = pathname.match(/^(\/apps\/[^/]+)/)?.[1];
      if (mount) {
        const scoped = active.routes.filter(
          (r) => r.path === mount || r.path.startsWith(`${mount}/`),
        );
        if (scoped.length) return scoped;
      }
    }
    return active.routes;
  }, [active, pathname]);

  const pageTitle = useMemo(() => {
    if (!active) return "";
    const activeInScoped =
      routes.find((r) => r.path === pathname) ??
      routes.find((r) => pathname === r.path || pathname.startsWith(`${r.path}/`));
    return activeInScoped?.label ?? active.activeRoute?.label ?? active.itemName;
  }, [active, pathname, routes]);

  if (!active || SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  const showSubnav = routes.length > 1;
  const showIndustrySwitcher =
    (active.sectionId === "industry" || Boolean(industryIdFromPathname(pathname))) &&
    Boolean(industryId);
  const showRouteCrumb = Boolean(pageTitle) && pageTitle !== active.itemName;

  return (
    <div className="dg-context-nav shrink-0 border-b border-[var(--org-border-subtle,rgb(30_41_59))] bg-[color-mix(in_srgb,var(--org-bg-elevated,rgb(2_6_23))_55%,transparent)] px-4 py-3 sm:px-6 md:px-8">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
          <span className="font-semibold uppercase tracking-wider">{active.sectionLabel}</span>
          <span aria-hidden className="text-slate-600">
            /
          </span>
          <span className="truncate text-slate-300">{active.itemName}</span>
          {showRouteCrumb ? (
            <>
              <span aria-hidden className="text-slate-600">
                /
              </span>
              <span className="truncate text-slate-400">{pageTitle}</span>
            </>
          ) : null}
        </div>

        {showIndustrySwitcher && industryId ? (
          <IndustryTemplateSwitcher industryId={industryId} />
        ) : null}

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
