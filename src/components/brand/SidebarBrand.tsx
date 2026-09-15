import { OrgBrandMark } from "@/components/brand/OrgBrandMark";

/**
 * Sidebar header — org/account logo (falls back to DigitalGate when no custom brand).
 * Keep the product mark deliberately compact so the shell chrome does not dominate navigation.
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
        logoWidth={148}
        align={align}
        className={`max-w-full ${align === "center" ? "mx-auto max-w-[9.5rem]" : ""}`}
      />
    </div>
  );
}
