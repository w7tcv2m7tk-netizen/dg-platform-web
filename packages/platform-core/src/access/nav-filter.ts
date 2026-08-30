/**
 * Filter side-panel sections by AccessContext.
 *
 * Visibility chain:
 * Platform capability → Org config → Activated Apps → Industry/Templates
 * → User role → Permissions → Visible navigation
 *
 * @see docs/foundations/ROLES-PERMISSIONS-SIDEBAR.md
 * @see docs/foundations/OPERATOR-EXPERIENCE.md
 */

import type {
  AppNavTreeItem,
  CategorizedPlatformNavigation,
  NavIaSection,
  PlatformShellNavItem,
} from "../apps/navigation";
import { hasPermission, type PermissionCheck } from "./evaluate";
import type { AccessContext } from "./roles";

function canView(ctx: AccessContext, module: PermissionCheck["module"]): boolean {
  return (
    hasPermission(ctx, { module, action: "view", scope: "own" }) ||
    hasPermission(ctx, { module, action: "view", scope: "assigned" }) ||
    hasPermission(ctx, { module, action: "view", scope: "organisation" })
  );
}

function isPlatformStaff(ctx: AccessContext): boolean {
  return Boolean(ctx.platformUserType);
}

function isOrgMemberOnly(ctx: AccessContext): boolean {
  return (
    !isPlatformStaff(ctx) &&
    (ctx.organisationRole === "organisation_member" || !ctx.organisationRole)
  );
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
      return (
        hasPermission(ctx, { module: "settings", action: "manage", scope: "organisation" }) ||
        hasPermission(ctx, { module: "platform_admin", action: "view", scope: "organisation" })
      );
    }
    if (path.includes("/audit")) {
      // Customer members: hide audit. Org admins/owners and DG staff may see.
      if (isOrgMemberOnly(ctx)) return false;
      return (
        hasPermission(ctx, { module: "settings", action: "manage", scope: "organisation" }) ||
        hasPermission(ctx, { module: "settings", action: "view", scope: "organisation" }) ||
        isPlatformStaff(ctx)
      );
    }
    if (path.includes("/connectors")) {
      if (isOrgMemberOnly(ctx)) return false;
      return (
        hasPermission(ctx, { module: "settings", action: "edit", scope: "organisation" }) ||
        hasPermission(ctx, { module: "settings", action: "manage", scope: "organisation" })
      );
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
  const staff = isPlatformStaff(ctx);

  return links.filter((link) => {
    const href = link.href;
    if (href.includes("/command/docs") || href.includes("/roadmap")) {
      return staff;
    }
    if (href.includes("/apps") || href.includes("/marketplace") || href.includes("/network")) {
      // Members: hide catalog management; admins/owners and staff see it
      if (isOrgMemberOnly(ctx)) return false;
      return canTeamManage || canBilling || canSettings || staff;
    }
    if (href === "/support") {
      return true;
    }
    return canSettings || staff;
  });
}

/** Progressive disclosure — strip config-heavy routes for ordinary members. */
function filterAppRoutesForMember(app: AppNavTreeItem, ctx: AccessContext): AppNavTreeItem | null {
  if (!isOrgMemberOnly(ctx)) return app;

  if (app.id === "infrastructure") {
    // Members: no DNS/Cloudflare/admin infra unless explicitly granted manage
    if (!hasPermission(ctx, { module: "infrastructure", action: "manage", scope: "organisation" })) {
      return null;
    }
  }

  if (app.id === "automation") {
    const routes = app.routes.filter((r) => !r.path.endsWith("/apps/automation") || r.label !== "Builder");
    // Hide builder path specifically
    const filtered = app.routes.filter((r) => r.path !== "/apps/automation");
    if (!filtered.length) return null;
    return { ...app, routes: filtered.length ? filtered : routes, primaryHref: filtered[0]?.path ?? app.primaryHref };
  }

  if (app.id === "ai-communications") {
    const filtered = app.routes.filter(
      (r) => !r.path.includes("/agents") && !r.path.includes("/settings"),
    );
    if (!filtered.length) return null;
    return { ...app, routes: filtered, primaryHref: filtered[0]?.path ?? app.primaryHref };
  }

  if (app.id === "platform-settings") {
    const routes = filterSettingsRoutes(app.routes, ctx);
    if (!routes.length) return null;
    return { ...app, routes, primaryHref: routes[0]?.path ?? app.primaryHref };
  }

  if (app.id === "business") {
    const routes = app.routes.filter((r) => {
      if (r.path.includes("/settings/team")) return canView(ctx, "team");
      return true;
    });
    return { ...app, routes };
  }

  return app;
}

function filterSectionApps(apps: AppNavTreeItem[], ctx: AccessContext): AppNavTreeItem[] {
  return apps
    .map((app) => filterAppRoutesForMember(app, ctx))
    .filter((app): app is AppNavTreeItem => Boolean(app));
}

function canManagePlatformCatalog(ctx: AccessContext): boolean {
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
  const staff = isPlatformStaff(ctx);
  if (isOrgMemberOnly(ctx)) return false;
  return canTeamManage || canBilling || canSettings || staff;
}

function filterPlatformAdminApp(app: AppNavTreeItem, ctx: AccessContext): AppNavTreeItem | null {
  if (app.id === "platform-settings") {
    const routes = filterSettingsRoutes(app.routes, ctx);
    if (!routes.length) return null;
    return { ...app, routes, primaryHref: routes[0]?.path ?? app.primaryHref };
  }
  if (
    app.id === "platform-apps" ||
    app.id === "platform-marketplace" ||
    app.id === "platform-network"
  ) {
    if (!canManagePlatformCatalog(ctx)) return null;
  }
  return filterAppRoutesForMember(app, ctx);
}

function filterPlatformAdminSection(section: NavIaSection, ctx: AccessContext): NavIaSection {
  const links = filterPlatformAdminLinks(section.links, ctx);
  const trailingLinks = filterPlatformAdminLinks(section.trailingLinks ?? [], ctx);
  const apps = section.apps
    .map((app) => filterPlatformAdminApp(app, ctx))
    .filter((app): app is AppNavTreeItem => Boolean(app));

  // Members with no remaining platform admin surface: hide section
  if (isOrgMemberOnly(ctx) && links.length === 0 && apps.length === 0 && trailingLinks.length <= 1) {
    // Keep Support only if present
    const supportOnly = trailingLinks.filter((l) => l.href === "/support");
    return { ...section, links: [], apps: [], trailingLinks: supportOnly };
  }

  return { ...section, links, apps, trailingLinks };
}

/**
 * Apply role/permission filters to categorized navigation.
 * Apps already filtered by enabledIds; this gates Core/Platform Admin/Partners by role.
 */
export function filterNavigationByAccess(
  nav: CategorizedPlatformNavigation,
  ctx: AccessContext,
): CategorizedPlatformNavigation {
  const staff = isPlatformStaff(ctx);
  // Partners section is DigitalGate internal — not customer org partners portal
  const canPartners = staff;
  const canIntelligence = canView(ctx, "intelligence");
  // Intelligence operator surfaces live under Business (no separate "business" permission module).
  const canBusinessIntelligence = canIntelligence;

  const canCoreApps =
    canView(ctx, "crm") ||
    canView(ctx, "commerce") ||
    canView(ctx, "websites") ||
    canView(ctx, "documents") ||
    canView(ctx, "communications") ||
    canView(ctx, "team");
  const canInfrastructure =
    canView(ctx, "infrastructure") ||
    hasPermission(ctx, { module: "infrastructure", action: "manage", scope: "organisation" }) ||
    (!isOrgMemberOnly(ctx) && (canView(ctx, "websites") || canCoreApps));
  const canIndustry = canView(ctx, "industry");
  const canGrowth = canView(ctx, "growth");
  const canCoreSection = canCoreApps || canIntelligence || canInfrastructure;

  const settingsRoutes = filterSettingsRoutes(nav.platform.routes, ctx);
  const platformAdminSection = filterPlatformAdminSection(nav.ia.platformAdmin, ctx);

  const coreApps = (canCoreSection ? filterSectionApps(nav.ia.core.apps, ctx) : []).filter(
    (app) => {
      if (app.id === "infrastructure") return canInfrastructure;
      // Business owns operator intelligence surfaces (Health · Insights · Advisor · Reports).
      if (app.id === "business") {
        return canCoreApps || canBusinessIntelligence || canInfrastructure;
      }
      return canCoreApps;
    },
  );
  const coreSection: NavIaSection = {
    ...nav.ia.core,
    links: [],
    apps: coreApps,
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
      /** Empty pillar — Infrastructure apps live under CORE */
      infrastructure: {
        ...nav.ia.infrastructure,
        apps: [],
        links: [],
      },
      industry: {
        ...nav.ia.industry,
        apps: canIndustry ? filterSectionApps(nav.ia.industry.apps, ctx) : [],
        links: canIndustry ? nav.ia.industry.links : [],
      },
      grow: {
        ...nav.ia.grow,
        apps: canGrowth ? filterSectionApps(nav.ia.grow.apps, ctx) : [],
        links: canGrowth ? nav.ia.grow.links : [],
      },
      intelligence: {
        ...nav.ia.intelligence,
        apps: canIntelligence ? nav.ia.intelligence.apps : [],
        links: canIntelligence
          ? nav.ia.intelligence.links.filter((link) => {
              if (isOrgMemberOnly(ctx) && link.href === "/apps/analytics") return false;
              if (isOrgMemberOnly(ctx) && link.href === "/dashboard/benchmarks") return false;
              return true;
            })
          : [],
      },
      digitalgate: {
        ...nav.ia.digitalgate,
        apps: staff ? nav.ia.digitalgate.apps : [],
        links: staff ? nav.ia.digitalgate.links : [],
        trailingLinks: staff ? (nav.ia.digitalgate.trailingLinks ?? []) : [],
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
