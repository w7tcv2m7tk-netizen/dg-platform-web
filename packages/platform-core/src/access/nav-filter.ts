/**
 * Filter side-panel sections by AccessContext.
 */

import type { CategorizedPlatformNavigation, PlatformShellNavItem } from "../apps/navigation";
import { hasPermission, type PermissionCheck } from "./evaluate";
import type { AccessContext } from "./roles";

function canView(ctx: AccessContext, module: PermissionCheck["module"]): boolean {
  return hasPermission(ctx, { module, action: "view", scope: "own" }) ||
    hasPermission(ctx, { module, action: "view", scope: "assigned" }) ||
    hasPermission(ctx, { module, action: "view", scope: "organisation" });
}

function filterSettingsRoutes(
  routes: PlatformShellNavItem["routes"],
  ctx: AccessContext,
): NonNullable<PlatformShellNavItem["routes"]> {
  const list = routes ?? [];
  return list.filter((route) => {
    const path = route.path;
    if (path.includes("/billing")) {
      return hasPermission(ctx, { module: "billing", action: "view", scope: "organisation" });
    }
    if (path.includes("/team")) {
      return canView(ctx, "team");
    }
    if (path.includes("/api") || path.includes("api-keys")) {
      return hasPermission(ctx, { module: "settings", action: "manage", scope: "organisation" }) ||
        hasPermission(ctx, { module: "platform_admin", action: "view", scope: "organisation" });
    }
    if (path.includes("/audit")) {
      return hasPermission(ctx, { module: "settings", action: "manage", scope: "organisation" }) ||
        hasPermission(ctx, { module: "settings", action: "view", scope: "organisation" });
    }
    if (path.includes("/connectors")) {
      return hasPermission(ctx, { module: "settings", action: "edit", scope: "organisation" }) ||
        hasPermission(ctx, { module: "settings", action: "manage", scope: "organisation" });
    }
    return canView(ctx, "settings");
  });
}

/**
 * Apply role/permission filters to categorized navigation.
 * Apps already filtered by enabledIds; this gates Business/Settings/Partners by role.
 */
export function filterNavigationByAccess(
  nav: CategorizedPlatformNavigation,
  ctx: AccessContext,
): CategorizedPlatformNavigation {
  const canBilling = hasPermission(ctx, {
    module: "billing",
    action: "view",
    scope: "organisation",
  });
  const canTeamManage = hasPermission(ctx, {
    module: "team",
    action: "manage",
    scope: "organisation",
  });
  const canPartners = canView(ctx, "partners") || Boolean(ctx.platformUserType);
  const canIntelligence = canView(ctx, "intelligence");
  const canOperate = canView(ctx, "crm") || canView(ctx, "commerce") || canView(ctx, "websites");
  const canIndustry = canView(ctx, "industry");
  const canGrowth = canView(ctx, "growth");

  const businessLinks = nav.ia.business.links.filter((link) => {
    if (link.href.includes("/settings/team")) {
      return canView(ctx, "team");
    }
    return true;
  });

  const settingsRoutes = filterSettingsRoutes(nav.platform.routes, ctx);

  const ecosystemLinks = nav.ia.ecosystem.links.filter((link) => {
    if (link.href.includes("/apps")) {
      // Apps catalogue — owners/admins manage; members can view activated only via sidebar apps
      return canTeamManage || canBilling || canView(ctx, "settings");
    }
    return true;
  });

  return {
    ...nav,
    platform: {
      ...nav.platform,
      routes: settingsRoutes,
    },
    ia: {
      ...nav.ia,
      business: {
        ...nav.ia.business,
        links: businessLinks,
      },
      operate: {
        ...nav.ia.operate,
        apps: canOperate ? nav.ia.operate.apps : [],
        links: canOperate ? nav.ia.operate.links : [],
      },
      industry: {
        ...nav.ia.industry,
        apps: canIndustry ? nav.ia.industry.apps : [],
        links: canIndustry ? nav.ia.industry.links : [],
      },
      grow: {
        ...nav.ia.grow,
        apps: canGrowth ? nav.ia.grow.apps : [],
        links: canGrowth ? nav.ia.grow.links : [],
      },
      intelligence: {
        ...nav.ia.intelligence,
        apps: canIntelligence ? nav.ia.intelligence.apps : [],
        links: canIntelligence ? nav.ia.intelligence.links : [],
      },
      partners: {
        ...nav.ia.partners,
        apps: canPartners ? nav.ia.partners.apps : [],
        links: canPartners ? nav.ia.partners.links : [],
      },
      ecosystem: {
        ...nav.ia.ecosystem,
        links: ecosystemLinks,
      },
    },
  };
}
