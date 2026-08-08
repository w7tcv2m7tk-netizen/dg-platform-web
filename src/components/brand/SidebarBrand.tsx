import { OrgBrandMark } from "@/components/brand/OrgBrandMark";

/** Sidebar header — wordmark only (no icon lockup). */
export function SidebarBrand({ className = "" }: { className?: string }) {
  return (
    <div className={`mb-6 px-1 ${className}`}>
      <OrgBrandMark
        variant="logo"
        href="/dashboard"
        logoWidth={120}
      />
    </div>
  );
}
