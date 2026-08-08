import { OrgBrandMark } from "@/components/brand/OrgBrandMark";

/**
 * Sidebar header — org/account wordmark (falls back to DigitalGate).
 * Aligned with nav `px-3`.
 */
export function SidebarBrand({ className = "" }: { className?: string }) {
  return (
    <div className={`mb-5 px-3 ${className}`}>
      <OrgBrandMark
        variant="logo"
        href="/dashboard"
        logoWidth={172}
        className="w-full max-w-full"
      />
    </div>
  );
}
