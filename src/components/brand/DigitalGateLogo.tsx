import Image from "next/image";
import Link from "next/link";

import { brandAssetsForTheme, type BrandTheme } from "@/lib/brand";

/** Wordmark source dimensions — keeps aspect ratio (no squashing) */
const LOGO_WIDTH = 1024;
const LOGO_HEIGHT = 95;

type DigitalGateLogoProps = {
  /** icon = mark only, logo = wordmark, lockup = icon beside wordmark, stacked = icon above wordmark */
  variant?: "icon" | "logo" | "lockup" | "stacked";
  theme?: BrandTheme;
  href?: string;
  className?: string;
  iconSize?: number;
  /** Wordmark width in px — height follows aspect ratio */
  logoWidth?: number;
  showTagline?: boolean;
  align?: "left" | "center";
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
  align = "left",
}: DigitalGateLogoProps) {
  const brand = brandAssetsForTheme(theme);
  const objectAlign = align === "center" ? "object-center" : "object-left";

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
      className={`block h-auto max-w-full object-contain ${objectAlign}`}
      style={{ width: logoWidth }}
      priority
    />
  );

  const tagline = showTagline ? (
    <p
      className={`text-[11px] font-medium leading-tight tracking-wide text-white/90 ${
        align === "center" ? "text-center" : ""
      }`}
    >
      Business Platform
    </p>
  ) : null;

  const textBlock = (
    <div
      className={`flex min-w-0 flex-col justify-center gap-0.5 ${
        align === "center" ? "items-center" : ""
      }`}
    >
      {wordmark}
      {tagline}
    </div>
  );

  const content =
    variant === "icon" ? (
      <BrandIcon src={brand.icon} size={iconSize} alt="DigitalGate" />
    ) : variant === "logo" ? (
      textBlock
    ) : variant === "stacked" ? (
      <div className="flex flex-col items-center gap-3">
        <BrandIcon src={brand.icon} size={iconSize} alt="" ariaHidden />
        <div className="flex flex-col items-center gap-0.5">{wordmark}{tagline}</div>
      </div>
    ) : (
      <div
        className={`flex items-center gap-2.5 ${align === "center" ? "justify-center" : ""}`}
      >
        {icon}
        {textBlock}
      </div>
    );

  const linkClass = `inline-flex ${
    variant === "stacked" || align === "center" ? "flex-col items-center" : ""
  } ${align === "center" && variant !== "stacked" ? "!flex-row justify-center" : ""} ${className}`;

  if (!href) {
    return <div className={className}>{content}</div>;
  }

  const external = /^https?:\/\//i.test(href);
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={linkClass}>
      {content}
    </Link>
  );
}
