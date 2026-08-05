import { DigitalGateLogo } from "@/components/brand/DigitalGateLogo";

export function SidebarBrand() {
  return (
    <div className="mb-6 px-1">
      <DigitalGateLogo
        variant="lockup"
        href="/dashboard"
        iconSize={26}
        logoWidth={120}
      />
    </div>
  );
}
