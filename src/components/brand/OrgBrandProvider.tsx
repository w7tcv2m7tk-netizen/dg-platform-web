"use client";

import { createContext, useContext, type CSSProperties, type ReactNode } from "react";

import type { OrgBrandTheme } from "@dg/platform-core";

import { orgBrandCssVariables } from "@/lib/brand-client";

const OrgBrandContext = createContext<OrgBrandTheme | null>(null);

const PLATFORM_SHELL_CHROME = {
  "--org-bg-base": "#0a0e17",
  "--org-bg-elevated": "#0f172a",
  "--org-bg-surface": "#111827",
  "--org-bg-surface-hover": "#1e293b",
  "--org-bg-inset": "#080c14",
  "--org-border": "#475569",
  "--org-border-subtle": "#1e293b",
  "--org-text-muted": "#94a3b8",
  "--org-shell-gradient":
    "radial-gradient(ellipse 120% 80% at 100% -20%, rgba(30, 64, 175, 0.12), transparent 55%), linear-gradient(180deg, #0a0e17 0%, #0b1220 100%)",
} as const;

export function useOrgBrand() {
  return useContext(OrgBrandContext);
}

export function orgBrandStyle(theme: OrgBrandTheme): CSSProperties {
  return {
    ...orgBrandCssVariables(theme),
    ...PLATFORM_SHELL_CHROME,
  } as CSSProperties;
}
export function OrgBrandProvider({
  theme,
  children,
}: {
  theme: OrgBrandTheme;
  children: ReactNode;
}) {
  return (
    <OrgBrandContext.Provider value={theme}>{children}</OrgBrandContext.Provider>
  );
}
