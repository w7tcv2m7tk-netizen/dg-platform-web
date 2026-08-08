import { DigitalGateLogo } from "@/components/brand/DigitalGateLogo";

/**
 * Sidebar header — always DigitalGate wordmark (not org brand).
 * Aligned with nav `px-3`.
 */
export function SidebarBrand({ className = "" }: { className?: string }) {
  return (
    <div className={`mb-5 px-3 ${className}`}>
      <DigitalGateLogo
        variant="logo"
        href="/dashboard"
        logoWidth={172}
        showTagline
        className="w-full max-w-full"
      />
    </div>
  );
}
