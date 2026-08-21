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

function filterPlatformAdminLinks(
  links: PlatformShellNavItem[],
  ctx: AccessContext,
): PlatformShellNavItem[] {
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
  const canSettings = canView(ctx, "settings");
  const canManageSettings =
    hasPermission(ctx, { module: "settings", action: "manage", scope: "organisation" }) ||
    hasPermission(ctx, { module: "platform_admin", action: "view", scope: "organisation" });

  return links.filter((link) => {
    const href = link.href;
    if (href.includes("/apps") || href.includes("/marketplace") || href.includes("/network")) {
      return canTeamManage || canBilling || canSettings;
    }
    if (href.includes("/billing")) return canBilling;
    if (href.includes("/api")) return canManageSettings;
    if (href.includes("/audit")) {
      return canManageSettings || canSettings;
    }
    if (href.includes("/connectors")) {
      return (
        hasPermission(ctx, { module: "settings", action: "edit", scope: "organisation" }) ||
        hasPermission(ctx, { module: "settings", action: "manage", scope: "organisation" })
      );
    }
    if (href.includes("/command/docs")) {
      return Boolean(ctx.platformUserType);
    }
    return canSettings;
  });
}

/**
 * Apply role/permission filters to categorized navigation.
 * Apps already filtered by enabledIds; this gates Core/Platform Admin/Partners by role.
 */
export function filterNavigationByAccess(
  nav: CategorizedPlatformNavigation,
  ctx: AccessContext,
): CategorizedPlatformNavigation {
  const canPartners = canView(ctx, "partners") || Boolean(ctx.platformUserType);
  const canIntelligence = canView(ctx, "intelligence");
  const canCore = canView(ctx, "crm") || canView(ctx, "commerce") || canView(ctx, "websites");
  const canInfrastructure = canView(ctx, "websites") || canCore;
  const canIndustry = canView(ctx, "industry");
  const canGrowth = canView(ctx, "growth");

  const coreLinks = nav.ia.core.links.filter((link) => {
    if (link.href.includes("/settings/team")) {
      return canView(ctx, "team");
    }
    return true;
  });

  const settingsRoutes = filterSettingsRoutes(nav.platform.routes, ctx);
  const platformAdminLinks = filterPlatformAdminLinks(nav.ia.platformAdmin.links, ctx);

  const coreSection = {
    ...nav.ia.core,
    links: coreLinks,
    apps: canCore ? nav.ia.core.apps : [],
  };

  const platformAdminSection = {
    ...nav.ia.platformAdmin,
    links: platformAdminLinks,
  };

  return {
    ...nav,
    platform: {
      ...nav.platform,
      routes: settingsRoutes,
    },
    ia: {
      ...nav.ia,
      core: coreSection,
      business: coreSection,
      operate: {
        ...nav.ia.operate,
        apps: [],
        links: [],
      },
      infrastructure: {
        ...nav.ia.infrastructure,
        apps: canInfrastructure ? nav.ia.infrastructure.apps : [],
        links: canInfrastructure ? nav.ia.infrastructure.links : [],
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
      platformAdmin: platformAdminSection,
      ecosystem: platformAdminSection,
    },
  };
}
