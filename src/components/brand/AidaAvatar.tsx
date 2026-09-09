import Image from "next/image";

import { AIDA } from "@/lib/aida";

/**
 * Small, consistent Aida avatar for in-app intelligence surfaces (Advisor,
 * Insights, priorities, Opportunity Engine output). Her transparent portrait
 * sits on a subtle brand gradient ring — her image is never altered.
 *
 * Use only where DigitalGate intelligence is actually involved.
 */
export function AidaAvatar({
  size = 40,
  ring = true,
  className = "",
}: {
  size?: number;
  ring?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`relative inline-flex shrink-0 overflow-hidden rounded-full ${
        ring ? "ring-1 ring-violet-400/40" : ""
      } ${className}`}
      style={{
        width: size,
        height: size,
        background:
          "linear-gradient(135deg, rgba(124,58,237,0.35), rgba(59,130,246,0.22))",
      }}
    >
      <Image
        src={AIDA.assets.avatar}
        alt={`${AIDA.name}, ${AIDA.role}`}
        width={Math.round(size * 2)}
        height={Math.round(size * 2)}
        sizes={`${size}px`}
        className="h-full w-full object-cover object-center"
      />
    </span>
  );
}

/**
 * Aida identity mark: avatar + name + role, matching the existing eyebrow style.
 * `subtitle` overrides the role line (e.g. a context-specific attribution).
 */
export function AidaMark({
  size = 36,
  subtitle = AIDA.role,
  className = "",
}: {
  size?: number;
  subtitle?: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <AidaAvatar size={size} />
      <span className="leading-tight">
        <span className="block text-sm font-semibold text-white">{AIDA.name}</span>
        <span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-violet-300/90">
          {subtitle}
        </span>
      </span>
    </span>
  );
}
