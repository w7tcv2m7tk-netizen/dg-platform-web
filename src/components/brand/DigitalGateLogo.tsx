import Image from "next/image";
import Link from "next/link";

import { brandAssetsForTheme, type BrandTheme } from "@/lib/brand";

type DigitalGateLogoProps = {
  /** icon = mark only, logo = wordmark, lockup = icon + wordmark */
  variant?: "icon" | "logo" | "lockup";
  /** on-dark = light marks (default). on-light = navy marks for white backgrounds */
  theme?: BrandTheme;
  href?: string;
  className?: string;
  iconSize?: number;
  logoHeight?: number;
};

export function DigitalGateLogo({
  variant = "lockup",
  theme = "on-dark",
  href = "/dashboard",
  className = "",
  iconSize = 32,
  logoHeight = 28,
}: DigitalGateLogoProps) {
  const brand = brandAssetsForTheme(theme);

  const content =
    variant === "icon" ? (
      <Image
        src={brand.icon}
        alt="DigitalGate"
        width={iconSize}
        height={iconSize}
        className="shrink-0"
        priority
      />
    ) : variant === "logo" ? (
      <Image
        src={brand.logo}
        alt="DigitalGate"
        width={1200}
        height={112}
        className="h-auto w-auto max-w-[220px] sm:max-w-[280px]"
        style={{ height: logoHeight, width: "auto" }}
        priority
      />
    ) : (
      <div className="flex items-center gap-2.5">
        <Image
          src={brand.icon}
          alt=""
          width={iconSize}
          height={iconSize}
          className="shrink-0"
          aria-hidden
          priority
        />
        <Image
          src={brand.logo}
          alt="DigitalGate"
          width={1200}
          height={112}
          className="h-auto w-auto max-w-[140px] sm:max-w-[160px]"
          style={{ height: Math.max(logoHeight - 4, 20), width: "auto" }}
          priority
        />
      </div>
    );

  if (!href) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Link href={href} className={`inline-flex items-center ${className}`}>
      {content}
    </Link>
  );
}
