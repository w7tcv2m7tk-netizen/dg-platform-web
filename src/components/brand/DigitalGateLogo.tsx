import Image from "next/image";
import Link from "next/link";

import { brandAssetsForTheme, type BrandTheme } from "@/lib/brand";

/** Wordmark source dimensions — keeps aspect ratio (no squashing) */
const LOGO_WIDTH = 1024;
const LOGO_HEIGHT = 95;

type DigitalGateLogoProps = {
  /** icon = mark only, logo = wordmark, lockup = icon beside wordmark + tagline */
  variant?: "icon" | "logo" | "lockup";
  theme?: BrandTheme;
  href?: string;
  className?: string;
  iconSize?: number;
  /** Wordmark width in px — height follows aspect ratio */
  logoWidth?: number;
  showTagline?: boolean;
};

function BrandIcon({
  src,
  size,
  alt = "",
  ariaHidden,
}: {
  src: string;
  size: number;
  alt?: string;
  ariaHidden?: boolean;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={512}
      height={512}
      className="shrink-0 object-cover object-center"
      style={{ width: size, height: size }}
      aria-hidden={ariaHidden}
      priority
    />
  );
}

export function DigitalGateLogo({
  variant = "lockup",
  theme = "on-dark",
  href = "/dashboard",
  className = "",
  iconSize = 24,
  logoWidth = 128,
  showTagline = true,
}: DigitalGateLogoProps) {
  const brand = brandAssetsForTheme(theme);

  const icon = (
    <BrandIcon
      src={brand.icon}
      size={iconSize}
      ariaHidden={variant === "lockup"}
    />
  );

  const wordmark = (
    <Image
      src={brand.logo}
      alt="DigitalGate"
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      className="block h-auto max-w-full object-contain object-left"
      style={{ width: logoWidth }}
      priority
    />
  );

  const tagline = showTagline ? (
    <p className="text-[11px] font-medium leading-tight tracking-wide text-slate-400">
      Business Platform
    </p>
  ) : null;

  const textBlock = (
    <div className="flex min-w-0 flex-col justify-center gap-0.5">
      {wordmark}
      {tagline}
    </div>
  );

  const content =
    variant === "icon" ? (
      <BrandIcon src={brand.icon} size={iconSize} alt="DigitalGate" />
    ) : variant === "logo" ? (
      textBlock
    ) : (
      <div className="flex items-center gap-2.5">
        {icon}
        {textBlock}
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
