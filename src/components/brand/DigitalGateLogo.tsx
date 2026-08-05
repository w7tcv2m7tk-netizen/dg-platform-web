import Image from "next/image";
import Link from "next/link";

const BRAND = {
  icon: "/brand/icon.png",
  logo: "/brand/logo.png",
} as const;

type DigitalGateLogoProps = {
  /** icon = mark only, logo = wordmark, lockup = icon + subtitle */
  variant?: "icon" | "logo" | "lockup";
  href?: string;
  className?: string;
  iconSize?: number;
  logoHeight?: number;
};

export function DigitalGateLogo({
  variant = "lockup",
  href = "/dashboard",
  className = "",
  iconSize = 32,
  logoHeight = 32,
}: DigitalGateLogoProps) {
  const content =
    variant === "icon" ? (
      <Image
        src={BRAND.icon}
        alt="DigitalGate"
        width={iconSize}
        height={iconSize}
        className="shrink-0"
        priority
      />
    ) : variant === "logo" ? (
      <Image
        src={BRAND.logo}
        alt="DigitalGate"
        width={3882}
        height={362}
        className="h-auto w-auto max-w-[220px] sm:max-w-[280px]"
        style={{ height: logoHeight }}
        priority
      />
    ) : (
      <div className="flex items-center gap-3">
        <Image
          src={BRAND.icon}
          alt=""
          width={iconSize}
          height={iconSize}
          className="shrink-0"
          aria-hidden
          priority
        />
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">
            DigitalGate
          </p>
          <p className="text-sm text-slate-400">Business Platform</p>
        </div>
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
