"use client";

import Link from "next/link";

import { DigitalGateLogo } from "@/components/brand/DigitalGateLogo";
import { useOrgBrand } from "@/components/brand/OrgBrandProvider";

type OrgBrandMarkProps = {
  /** icon = mark only; logo = wordmark only; lockup = icon beside wordmark */
  variant?: "icon" | "logo" | "lockup";
  href?: string;
  className?: string;
  iconSize?: number;
  logoWidth?: number;
  showBusinessName?: boolean;
};

function OrgIcon({
  src,
  alt,
  size,
}: {
  src: string;
  alt: string;
  size: number;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="shrink-0 rounded-md object-contain"
      style={{ width: size, height: size, maxHeight: size }}
    />
  );
}

function OrgWordmark({
  src,
  alt,
  width,
}: {
  src: string;
  alt: string;
  width: number;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="max-h-8 object-contain object-left"
      style={{ width, maxWidth: "100%" }}
    />
  );
}

export function OrgBrandMark({
  variant = "lockup",
  href = "/dashboard",
  className = "",
  iconSize = 26,
  logoWidth = 120,
  showBusinessName = false,
}: OrgBrandMarkProps) {
  const brand = useOrgBrand();

  if (!brand?.hasCustomBrand) {
    return (
      <DigitalGateLogo
        variant={variant === "icon" ? "icon" : variant === "logo" ? "logo" : "lockup"}
        href={href}
        iconSize={iconSize}
        logoWidth={logoWidth}
        className={className}
      />
    );
  }

  const iconSrc = brand.iconUrl ?? brand.logoUrl;
  const wordmarkSrc = brand.logoUrl ?? brand.iconUrl;

  const content =
    variant === "icon" && iconSrc ? (
      <OrgIcon src={iconSrc} alt={`${brand.businessName} icon`} size={iconSize} />
    ) : wordmarkSrc ? (
      <div className="flex min-w-0 items-center gap-2.5">
        {variant === "lockup" && iconSrc && iconSrc !== wordmarkSrc ? (
          <OrgIcon src={iconSrc} alt="" size={iconSize} />
        ) : null}
        <OrgWordmark
          src={wordmarkSrc}
          alt={`${brand.businessName} logo`}
          width={logoWidth}
        />
      </div>
    ) : (
      <div
        className="flex shrink-0 items-center justify-center rounded-lg font-semibold text-white"
        style={{
          width: iconSize,
          height: iconSize,
          backgroundColor: "var(--org-primary)",
          fontSize: Math.max(12, iconSize * 0.45),
        }}
        aria-hidden
      >
        {brand.businessName.charAt(0).toUpperCase()}
      </div>
    );

  const labelled =
    showBusinessName && !wordmarkSrc ? (
      <div className="flex min-w-0 items-center gap-2.5">
        {content}
        <span className="truncate text-sm font-semibold text-white">{brand.businessName}</span>
      </div>
    ) : (
      content
    );

  if (!href) {
    return <div className={className}>{labelled}</div>;
  }

  return (
    <Link href={href} className={`block min-w-0 ${className}`}>
      {labelled}
    </Link>
  );
}
