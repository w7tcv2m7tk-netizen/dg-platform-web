"use client";

import { useEffect } from "react";

/** Swap document favicon when the active org provides an icon URL. */
export function OrgBrandHead({ iconUrl }: { iconUrl?: string }) {
  useEffect(() => {
    if (!iconUrl) return;

    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }

    const previousHref = link.href;
    link.href = iconUrl;

    return () => {
      if (link) link.href = previousHref;
    };
  }, [iconUrl]);

  return null;
}
