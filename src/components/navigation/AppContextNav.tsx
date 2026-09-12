"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";

import { useEnabledApps } from "@/components/platform/EnabledAppsProvider";
import { IndustryTemplateSwitcher } from "@/components/industry/IndustryTemplateSwitcher";
import { AppHorizontalSubnav } from "@/components/navigation/AppHorizontalSubnav";
import {
  industryIdFromPathname,
  resolveActiveAppNavigation,
  type AppRoute,
} from "@dg/platform-core";

const SKIP_PREFIXES = ["/onboarding", "/signup", "/login"];

const COMMAND_OPERATOR_ROUTES: AppRoute[] = [
  {
    path: "/command",
    label: "Command",
    exact: true,
    matchAlso: ["/command/advisor"],
  },
  {
    path: "/command/clients",
    label: "Customers",
    matchAlso: ["/command/customer-intelligence"],
  },
  { path: "/command/partners", label: "Partners" },
  { path: "/support", label: "Support" },
  { path: "/command/delivery", label: "Delivery" },
  {
    path: "/command/revenue",
    label: "Commercial",
    matchAlso: ["/command/commercial", "/command/commissions"],
  },
  {
    path: "/command/platform-health",
    label: "Platform",
    matchAlso: [
      "/command/platform-health/diagnostics",
      "/command/platform-intelligence/health",
      "/command/platform-intelligence/connectors",
      "/command/platform-intelligence/automation",
      "/command/platform-intelligence/service-status",
      "/command/platform-intelligence/diagnostics",
    ],
  },
  {
    path: "/command/intelligence",
    label: "Intelligence",
    matchAlso: [
      "/command/platform-intelligence/overview",
      "/command/platform-intelligence/ai-usage",
      "/command/platform-intelligence/activity",
      "/command/benchmarks",
      "/command/reports",
    ],
  },
];

function isCommandOperatorSurface(pathname: string): boolean {
  return pathname.startsWith("/command") || pathname.startsWith("/support");
}

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

    // DigitalGate operator surfaces share one Command IA. This is the live
    // AppContextNav source used by the signed-in shell, so the daily cockpit
    // and its specialist drill-downs remain one coherent navigation model.
    if (active.sectionId === "digitalgate" && isCommandOperatorSurface(pathname)) {
      return COMMAND_OPERATOR_ROUTES;
    }

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
      routes.find(
        (r) =>
          r.matchAlso?.some(
            (match) => pathname === match || pathname.startsWith(`${match}/`),
          ) ?? false,
      ) ??
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
