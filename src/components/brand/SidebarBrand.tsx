import { OrgBrandMark } from "@/components/brand/OrgBrandMark";

/**
 * Sidebar header — org/account logo (falls back to DigitalGate when no custom brand).
 * Aligned with nav `px-3`. Drawer uses centered mark for mobile portal feel.
 */
export function SidebarBrand({
  className = "",
  align = "left",
}: {
  className?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={`mb-5 px-3 ${className}`}>
      <OrgBrandMark
        variant="logo"
        href="/dashboard"
        logoWidth={172}
        align={align}
        className={`w-full max-w-full ${align === "center" ? "mx-auto max-w-[11rem]" : ""}`}
      />
    </div>
  );
}
