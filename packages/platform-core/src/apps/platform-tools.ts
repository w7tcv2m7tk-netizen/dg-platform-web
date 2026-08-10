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

export const SETTINGS_NAV_ROUTES: AppRoute[] = [
  { path: "/dashboard/settings", label: "Overview" },
  { path: "/dashboard/settings/billing", label: "Billing" },
  { path: "/dashboard/settings/connectors", label: "Connectors" },
  { path: "/dashboard/settings/api", label: "API" },
  { path: "/dashboard/settings/team", label: "Team" },
  { path: "/dashboard/settings/audit", label: "Audit log" },
  { path: "/dashboard/settings/referrals", label: "Refer & Earn" },
  { path: "/dashboard/settings/roadmap", label: "Roadmap" },
  { path: "/support", label: "Support" },
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
