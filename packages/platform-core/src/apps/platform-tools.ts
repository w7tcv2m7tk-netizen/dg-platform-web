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
 * Customer configuration routes. Connected Services is the canonical Integration Hub
 * surface; advanced connector diagnostics remain available by direct route for operators.
 */
export const SETTINGS_NAV_ROUTES: AppRoute[] = [
  { path: "/dashboard/settings", label: "Overview" },
  {
    path: "/dashboard/settings/connected-services",
    label: "Connected Services",
  },
  { path: "/dashboard/settings/billing", label: "Billing" },
  { path: "/dashboard/settings/api", label: "API" },
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
