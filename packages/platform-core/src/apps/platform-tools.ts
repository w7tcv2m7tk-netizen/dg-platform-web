import type { AppRoute } from "./manifest";

/** Platform-wide settings and utilities — not licensed Apps. */
export interface PlatformToolGroup {
  id: string;
  label: string;
  icon: string;
  routes: AppRoute[];
  primaryHref: string;
}

export const PLATFORM_TOOL_GROUPS: PlatformToolGroup[] = [
  {
    id: "platform-settings",
    label: "Platform settings",
    icon: "⚙",
    primaryHref: "/dashboard/settings",
    routes: [
      { path: "/dashboard/settings", label: "General" },
      { path: "/dashboard/settings/connectors", label: "Connectors" },
      { path: "/dashboard/settings/team", label: "Team & access" },
    ],
  },
  {
    id: "platform-tools",
    label: "Tools",
    icon: "⛭",
    primaryHref: "/dashboard/settings/roadmap",
    routes: [
      { path: "/dashboard/settings/roadmap", label: "Platform roadmap" },
      { path: "/support", label: "Support" },
    ],
  },
];

export const PLATFORM_TOOLS_SECTION_LABEL = "Settings & tools";
