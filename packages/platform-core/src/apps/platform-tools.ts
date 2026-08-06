import type { AppRoute } from "./manifest";
import { getSidebarIcon } from "./sidebar-icons";

/** Platform utilities — sub-pages linked from Settings; not duplicated in workspace shell. */
export interface PlatformToolGroup {
  id: string;
  label: string;
  icon: string;
  routes: AppRoute[];
  primaryHref: string;
}

export const PLATFORM_TOOL_GROUPS: PlatformToolGroup[] = [
  {
    id: "platform-tools",
    label: "Tools",
    icon: getSidebarIcon("platform-tools"),
    primaryHref: "/dashboard/settings/roadmap",
    routes: [
      { path: "/dashboard/settings/roadmap", label: "Roadmap" },
      { path: "/dashboard/settings/audit", label: "Audit log" },
      { path: "/support", label: "Support" },
    ],
  },
];

export const PLATFORM_TOOLS_SECTION_LABEL = "Tools";
