"use client";

import { useState } from "react";
import Link from "next/link";
import { resolveLetterheadBrandAsset } from "@dg/platform-core";

type DocumentBrandMarkProps = {
  logoUrl?: string;
  businessName: string;
  /** Letterhead band colour — drives on-dark vs on-light logo remapping */
  headerBackground?: string;
  /** Contrasting ink for empty-state name on the band */
  inkColor?: string;
};

/**
 * Letterhead wordmark for AU invoices / quotes.
 * Logo only (no icon lockup). Remaps known light/dark assets from header luminance.
 */
export function DocumentBrandMark({
  logoUrl,
  businessName,
  headerBackground,
  inkColor,
}: DocumentBrandMarkProps) {
  const logo = resolveLetterheadBrandAsset(logoUrl, { headerBackground });
  const [logoFailed, setLogoFailed] = useState(false);

  const logoSrc = logo.src && !logoFailed ? logo.src : undefined;

  if (!logoSrc) {
    return (
      <div className="au-document__brand-fallback">
        <p className="au-document__brand-name" style={inkColor ? { color: inkColor } : undefined}>
          {businessName}
        </p>
        <p className="au-document__brand-hint">
          No logo configured.{" "}
          <Link href="/dashboard/business" className="au-document__brand-hint-link">
            Add logo in Business Profile
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div
      className={
        logo.needsContrastPlate
          ? "au-document__brand-lockup au-document__brand-lockup--contrast"
          : "au-document__brand-lockup"
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoSrc}
        alt={businessName}
        className="au-document__logo"
        onError={() => setLogoFailed(true)}
      />
    </div>
  );
}
