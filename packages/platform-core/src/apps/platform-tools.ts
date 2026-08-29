import type { AppRoute } from "./manifest";
import { getSidebarIcon } from "./sidebar-icons";

/** Settings sub-pages — shown under Settings in the shell (includes former Tools). */
export interface PlatformToolGroup {
  id: string;
  label: string;
  icon: string;
  routes: AppRoute[];
  primaryHref: string;
}

/**
 * Settings sub-pages — Platform → Settings horizontal subnav.
 * Refer & Earn lives under Network. Roadmap lives under Product (staff).
 * Business Profile lives under Core → Business (`/dashboard/business`) only —
 * not a Settings “Organisation” tab.
 */
export const SETTINGS_NAV_ROUTES: AppRoute[] = [
  { path: "/dashboard/settings", label: "Overview" },
  { path: "/dashboard/settings/team", label: "Users & Permissions" },
  { path: "/dashboard/settings/billing", label: "Billing" },
  {
    path: "/dashboard/settings/connectors",
    label: "Connectors",
    matchAlso: ["/dashboard/settings/connected-services"],
  },
  { path: "/dashboard/settings/api", label: "API" },
  { path: "/dashboard/settings/security", label: "Security" },
  { path: "/dashboard/settings/notifications", label: "Notifications" },
  { path: "/dashboard/settings/audit", label: "Audit Log" },
];

/** @deprecated Tools section merged into Settings — kept for type compatibility. */
export const PLATFORM_TOOL_GROUPS: PlatformToolGroup[] = [
  {
    id: "settings",
    label: "Settings",
    icon: getSidebarIcon("settings"),
    primaryHref: "/dashboard/settings",
    routes: SETTINGS_NAV_ROUTES,
  },
];

/** @deprecated */
export const PLATFORM_TOOLS_SECTION_LABEL = "Settings";
