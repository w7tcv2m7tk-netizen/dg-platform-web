import Image from "next/image";
import Link from "next/link";

import { brandAssetsForTheme, type BrandTheme } from "@/lib/brand";

/** Wordmark source dimensions — keeps aspect ratio (no squashing) */
const LOGO_WIDTH = 1024;
const LOGO_HEIGHT = 95;

type DigitalGateLogoProps = {
  /** icon = mark only, logo = wordmark, lockup = icon + wordmark + tagline */
  variant?: "icon" | "logo" | "lockup";
  theme?: BrandTheme;
  href?: string;
  className?: string;
  iconSize?: number;
  /** Wordmark width in px — height follows aspect ratio */
  logoWidth?: number;
  showTagline?: boolean;
};

function iconClassName(theme: BrandTheme) {
  /* Light PNGs are black-on-white — invert + lighten hides the white box on dark UI */
  return theme === "on-dark" ? "invert mix-blend-lighten" : "";
}

function wordmarkClassName(theme: BrandTheme) {
  /* White-on-black wordmark — lighten drops the black box on dark UI */
  return theme === "on-dark" ? "mix-blend-lighten" : "";
}

export function DigitalGateLogo({
  variant = "lockup",
  theme = "on-dark",
  href = "/dashboard",
  className = "",
  iconSize = 22,
  logoWidth = 128,
  showTagline = true,
}: DigitalGateLogoProps) {
  const brand = brandAssetsForTheme(theme);

  const icon = (
    <Image
      src={brand.icon}
      alt=""
      width={LOGO_WIDTH}
      height={LOGO_WIDTH}
      className={`shrink-0 object-contain ${iconClassName(theme)}`}
      style={{ width: iconSize, height: iconSize }}
      aria-hidden={variant === "lockup"}
      priority
    />
  );

  const wordmark = (
    <Image
      src={brand.logo}
      alt="DigitalGate"
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      className={`block h-auto max-w-full object-contain object-left ${wordmarkClassName(theme)}`}
      style={{ width: logoWidth }}
      priority
    />
  );

  const tagline = showTagline ? (
    <p className="text-[11px] font-medium tracking-wide text-slate-400">Business Platform</p>
  ) : null;

  const content =
    variant === "icon" ? (
      <Image
        src={brand.icon}
        alt="DigitalGate"
        width={LOGO_WIDTH}
        height={LOGO_WIDTH}
        className={`shrink-0 object-contain ${iconClassName(theme)}`}
        style={{ width: iconSize, height: iconSize }}
        priority
      />
    ) : variant === "logo" ? (
      <div className="flex flex-col items-start gap-1">
        {wordmark}
        {tagline}
      </div>
    ) : (
      <div className="flex flex-col items-start gap-1.5">
        {icon}
        {wordmark}
        {tagline}
      </div>
    );

  if (!href) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Link href={href} className={`inline-flex ${className}`}>
      {content}
    </Link>
  );
}
