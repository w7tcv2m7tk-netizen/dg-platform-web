"use client";

import { useState } from "react";
import Link from "next/link";
import { resolveLetterheadBrandAsset } from "@dg/platform-core";

type DocumentBrandMarkProps = {
  logoUrl?: string;
  iconUrl?: string;
  businessName: string;
};

/**
 * Letterhead brand lockup for AU invoices / quotes (light paper).
 * Remaps dark-UI wordmarks, plates white marks, and surfaces a clear empty state.
 */
export function DocumentBrandMark({
  logoUrl,
  iconUrl,
  businessName,
}: DocumentBrandMarkProps) {
  const logo = resolveLetterheadBrandAsset(logoUrl);
  const icon = resolveLetterheadBrandAsset(iconUrl);
  const [logoFailed, setLogoFailed] = useState(false);
  const [iconFailed, setIconFailed] = useState(false);

  const logoSrc = logo.src && !logoFailed ? logo.src : undefined;
  const iconSrc = icon.src && !iconFailed ? icon.src : undefined;
  const wordmarkSrc = logoSrc ?? iconSrc;
  const showIconBesideLogo = Boolean(
    logoSrc && iconSrc && logoSrc !== iconSrc,
  );
  const showSoloIcon = Boolean(!logoSrc && iconSrc);

  if (!wordmarkSrc) {
    return (
      <div className="au-document__brand-fallback">
        <p className="au-document__brand-name">{businessName}</p>
        <p className="au-document__brand-hint">
          No logo configured.{" "}
          <Link href="/dashboard/business" className="au-document__brand-hint-link">
            Add logo in Business Profile
          </Link>
        </p>
      </div>
    );
  }

  const usePlate = Boolean(
    (logoSrc && logo.needsContrastPlate) ||
      (showIconBesideLogo && icon.needsContrastPlate) ||
      (showSoloIcon && icon.needsContrastPlate) ||
      (!logoSrc && iconSrc && logo.needsContrastPlate),
  );

  return (
    <div
      className={
        usePlate
          ? "au-document__brand-lockup au-document__brand-lockup--contrast"
          : "au-document__brand-lockup"
      }
    >
      {showIconBesideLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={iconSrc!}
          alt=""
          className="au-document__icon"
          width={56}
          height={56}
          onError={() => setIconFailed(true)}
        />
      ) : null}
      {logoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoSrc}
          alt={businessName}
          className="au-document__logo"
          onError={() => setLogoFailed(true)}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={iconSrc!}
          alt={businessName}
          className="au-document__icon au-document__icon--solo"
          width={72}
          height={72}
          onError={() => setIconFailed(true)}
        />
      )}
    </div>
  );
}
