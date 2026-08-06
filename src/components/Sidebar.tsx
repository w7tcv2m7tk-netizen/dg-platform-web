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
          ? "flex h-full w-56 shrink-0 flex-col border-r border-slate-800 bg-slate-950 px-4 py-6"
          : "flex h-full min-h-0 flex-col"
      }
    >
      {variant === "drawer" ? (
        <div className="mb-4 flex items-center justify-between gap-2">
          <SidebarBrand className="mb-0 min-w-0 flex-1" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 transition hover:bg-slate-800 hover:text-white"
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

      <SidebarNav onNavigate={onNavigate} />
      <SidebarUser />
    </aside>
  );
}
