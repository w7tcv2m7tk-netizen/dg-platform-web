"use client";

import { createContext, useContext, type CSSProperties, type ReactNode } from "react";

import type { OrgBrandTheme } from "@dg/platform-core";

import { orgBrandCssVariables } from "@/lib/brand-client";

const OrgBrandContext = createContext<OrgBrandTheme | null>(null);

export function useOrgBrand() {
  return useContext(OrgBrandContext);
}

export function orgBrandStyle(theme: OrgBrandTheme): CSSProperties {
  return orgBrandCssVariables(theme) as CSSProperties;
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
