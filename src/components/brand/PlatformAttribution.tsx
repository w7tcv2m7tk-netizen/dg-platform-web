"use client";

import Link from "next/link";

import { useOrgBrand } from "@/components/brand/OrgBrandProvider";

export function PlatformAttribution({ className = "" }: { className?: string }) {
  const brand = useOrgBrand();

  return (
    <div className={`border-t border-[var(--org-border-subtle)] pt-3 ${className}`}>
      {brand?.hasCustomBrand ? (
        <p className="px-1 text-[10px] leading-relaxed text-[var(--org-text-muted)]">
          <span className="font-medium text-slate-400">{brand.businessName}</span>
          <span className="mx-1.5 opacity-40" aria-hidden>
            ·
          </span>
          <Link
            href="https://digitalgate.com.au"
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:text-[var(--org-primary)]"
          >
            DigitalGate Business Platform
          </Link>
        </p>
      ) : (
        <p className="px-1 text-[10px] text-[var(--org-text-muted)]">
          DigitalGate Business Platform
        </p>
      )}
    </div>
  );
}
