"use client";

import { createContext, useContext, type CSSProperties, type ReactNode } from "react";

import type { OrgBrandTheme } from "@dg/platform-core";

const OrgBrandContext = createContext<OrgBrandTheme | null>(null);

export function useOrgBrand() {
  return useContext(OrgBrandContext);
}

export function orgBrandStyle(theme: OrgBrandTheme): CSSProperties {
  return {
    "--org-primary": theme.primaryColor,
    "--org-accent": theme.accentColor,
    "--dg-blue": theme.primaryColor,
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
