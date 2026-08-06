"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

import { MobileHeader } from "@/components/MobileHeader";
import { OrgBrandProvider, orgBrandStyle } from "@/components/brand/OrgBrandProvider";
import { Sidebar } from "@/components/Sidebar";
import type { OrgBrandTheme, UserOrganisationSummary } from "@dg/platform-core";
import { DEFAULT_ORG_BRAND_THEME, orgBrandCssVariables } from "@/lib/brand-client";

type MobileNavContextValue = {
  close: () => void;
};

const MobileNavContext = createContext<MobileNavContextValue>({
  close: () => {},
});

export function useMobileNav() {
  return useContext(MobileNavContext);
}

export function AppShellLayout({
  children,
  activeOrganisationId,
  activeOrganisationName,
  organisations = [],
  brandTheme = DEFAULT_ORG_BRAND_THEME,
}: {
  children: ReactNode;
  activeOrganisationId?: string;
  activeOrganisationName?: string;
  organisations?: UserOrganisationSummary[];
  brandTheme?: OrgBrandTheme;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const vars = orgBrandCssVariables(brandTheme);
    const previousBackground = document.body.style.background;
    const previousColor = document.body.style.color;
    document.body.style.background = vars["--org-shell-gradient"] ?? vars["--org-bg-base"] ?? "";
    document.body.style.color = "#f1f5f9";
    return () => {
      document.body.style.background = previousBackground;
      document.body.style.color = previousColor;
    };
  }, [brandTheme]);

  function close() {
    setOpen(false);
  }

  const sidebarProps = {
    activeOrganisationId,
    activeOrganisationName,
    organisations,
  };

  return (
    <OrgBrandProvider theme={brandTheme}>
      <MobileNavContext.Provider value={{ close }}>
        <div className="dg-branded-shell flex min-h-[100dvh]" style={orgBrandStyle(brandTheme)}>
        <div className="hidden shrink-0 md:flex">
          <Sidebar {...sidebarProps} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <MobileHeader onMenuClick={() => setOpen(true)} />

          <div
            className={`fixed inset-0 z-50 md:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`}
            aria-hidden={!open}
          >
            <button
              type="button"
              className={`absolute inset-0 dg-branded-overlay backdrop-blur-sm transition-opacity duration-200 ${
                open ? "opacity-100" : "opacity-0"
              }`}
              aria-label="Close menu"
              tabIndex={open ? 0 : -1}
              onClick={close}
            />
            <aside
              className={`dg-branded-sidebar absolute inset-y-0 left-0 flex w-[min(18rem,88vw)] flex-col border-r px-4 py-5 shadow-2xl transition-transform duration-200 ease-out ${
                open ? "translate-x-0" : "-translate-x-full"
              }`}
              style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}
            >
              <Sidebar variant="drawer" onNavigate={close} onClose={close} {...sidebarProps} />
            </aside>
          </div>

          {children}
        </div>
        </div>
      </MobileNavContext.Provider>
    </OrgBrandProvider>
  );
}
