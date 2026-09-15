import { OrgBrandMark } from "@/components/brand/OrgBrandMark";

/** Compact sidebar product mark; custom organisation branding remains authoritative. */
export function SidebarBrand({ className = "", align = "left" }: { className?: string; align?: "left" | "center" }) {
  return (
    <div className={`mb-5 px-3 ${className}`}>
      <OrgBrandMark variant="logo" href="/dashboard" logoWidth={148} align={align} className={`max-w-full ${align === "center" ? "mx-auto max-w-[9.5rem]" : ""}`} />
    </div>
  );
}
