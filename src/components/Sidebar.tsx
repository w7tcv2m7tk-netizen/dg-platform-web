import { PlatformAttribution } from "@/components/brand/PlatformAttribution";
import { SidebarBrand } from "@/components/brand/SidebarBrand";
import { OrgSwitcher } from "@/components/platform/OrgSwitcher";
import { SidebarNav } from "@/components/SidebarNav";
import { SidebarUser } from "@/components/SidebarUser";
import type { UserOrganisationSummary } from "@dg/platform-core";

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="h-5 w-5"
      aria-hidden
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function Sidebar({
  variant = "fixed",
  onNavigate,
  onClose,
  activeOrganisationId,
  activeOrganisationName,
  organisations = [],
}: {
  variant?: "fixed" | "drawer";
  onNavigate?: () => void;
  onClose?: () => void;
  activeOrganisationId?: string;
  activeOrganisationName?: string;
  organisations?: UserOrganisationSummary[];
}) {
  return (
    <aside
      className={
        variant === "fixed"
          ? "dg-branded-sidebar flex h-full min-h-0 w-full flex-col overflow-hidden border-r border-slate-800 px-4 py-6"
          : "flex h-full min-h-0 flex-col overflow-hidden"
      }
    >
      <div className="shrink-0">
        {variant === "drawer" ? (
          <div className="relative mb-4 flex items-center justify-center gap-2 px-1">
            <SidebarBrand align="center" className="mb-0 min-w-0" />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="absolute right-0 top-1/2 flex h-10 w-10 shrink-0 -translate-y-1/2 items-center justify-center rounded-lg border dg-branded-surface text-slate-300 transition hover:text-white"
            >
              <CloseIcon />
            </button>
          </div>
        ) : (
          <SidebarBrand />
        )}

        {activeOrganisationId && activeOrganisationName ? (
          <OrgSwitcher
            activeOrganisationId={activeOrganisationId}
            activeOrganisationName={activeOrganisationName}
            organisations={organisations}
          />
        ) : null}
      </div>

      <SidebarNav onNavigate={onNavigate} />

      <div className="mt-auto shrink-0">
        <PlatformAttribution className="mt-4" />
        <SidebarUser />
      </div>
    </aside>
  );
}
