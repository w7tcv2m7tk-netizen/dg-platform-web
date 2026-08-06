import { OrgBrandMark } from "@/components/brand/OrgBrandMark";

export function SidebarBrand({ className = "" }: { className?: string }) {
  return (
    <div className={`mb-6 px-1 ${className}`}>
      <OrgBrandMark
        variant="lockup"
        href="/dashboard"
        iconSize={26}
        logoWidth={120}
      />
    </div>
  );
}
