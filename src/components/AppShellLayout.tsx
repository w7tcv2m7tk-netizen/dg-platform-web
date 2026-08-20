"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ViewTransition,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

import { DemoModeBanner } from "@/components/demo/DemoModeBanner";
import { MobileHeader } from "@/components/MobileHeader";
import { OrgBrandHead } from "@/components/brand/OrgBrandHead";
import { OrgBrandProvider, orgBrandStyle } from "@/components/brand/OrgBrandProvider";
import { ChatWidgetProvider } from "@/components/platform/ChatWidgetProvider";
import { PrefetchCriticalRoutes } from "@/components/platform/PrefetchCriticalRoutes";
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
  chatUserName,
  showFloatingChat = true,
  isDemo = false,
}: {
  children: ReactNode;
  activeOrganisationId?: string;
  activeOrganisationName?: string;
  organisations?: UserOrganisationSummary[];
  brandTheme?: OrgBrandTheme;
  chatUserName?: string;
  showFloatingChat?: boolean;
  isDemo?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock document scroll so sidebar + main are the only scroll containers.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyHeight: body.style.height,
      htmlClass: html.classList.contains("dg-shell-scroll-lock"),
    };
    html.classList.add("dg-shell-scroll-lock");
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.height = "100%";
    return () => {
      html.classList.remove("dg-shell-scroll-lock");
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      body.style.height = prev.bodyHeight;
    };
  }, []);

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
      <OrgBrandHead iconUrl={brandTheme.iconUrl} />
      <PrefetchCriticalRoutes />
      <MobileNavContext.Provider value={{ close }}>
        <div
          className="dg-branded-shell fixed inset-0 z-0 flex overflow-hidden print:static print:inset-auto print:h-auto print:min-h-0 print:overflow-visible"
          style={orgBrandStyle(brandTheme)}
        >
          {/* Chat mounts inside branded shell so --org-primary applies to the floating widget. */}
          <ChatWidgetProvider
            userName={chatUserName}
            showFloatingChat={showFloatingChat}
          >
            <div className="hidden h-full min-h-0 w-56 shrink-0 flex-col print:hidden md:flex">
              <Sidebar {...sidebarProps} />
            </div>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <div className="shrink-0 print:hidden">
                {isDemo ? <DemoModeBanner canReset /> : null}
                <MobileHeader onMenuClick={() => setOpen(true)} />
              </div>

              <div
                className={`fixed inset-0 z-50 md:hidden ${open ? "" : "pointer-events-none"}`}
                aria-hidden={!open}
              >
                <button
                  type="button"
                  className={`absolute inset-0 dg-branded-overlay backdrop-blur-sm transition-opacity duration-200 ${
                    open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
                  }`}
                  aria-label="Close menu"
                  tabIndex={open ? 0 : -1}
                  onClick={close}
                />
                <aside
                  className={`dg-branded-sidebar absolute inset-y-0 left-0 flex h-full w-[min(18rem,88vw)] flex-col overflow-hidden border-r border-slate-800 px-4 py-5 shadow-2xl transition-transform duration-200 ease-out ${
                    open
                      ? "pointer-events-auto translate-x-0"
                      : "pointer-events-none -translate-x-full"
                  }`}
                  style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}
                >
                  <Sidebar
                    variant="drawer"
                    onNavigate={close}
                    onClose={close}
                    {...sidebarProps}
                  />
                </aside>
              </div>

              <div className="min-h-0 flex-1 overflow-x-clip overflow-y-auto overscroll-y-contain">
                <ViewTransition
                  default="dg-nav-fade"
                  enter="dg-nav-fade"
                  exit="dg-nav-fade"
                >
                  <div className="flex min-h-full min-w-0 flex-col">{children}</div>
                </ViewTransition>
              </div>
            </div>
          </ChatWidgetProvider>
        </div>
      </MobileNavContext.Provider>
    </OrgBrandProvider>
  );
}
