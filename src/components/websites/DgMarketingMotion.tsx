"use client";

import { useEffect } from "react";

/**
 * DigitalGate marketing motion — card reveals + journey panel highlight.
 * CSS handles layout/fallback; this island enhances reveals and in-view highlighting.
 */
export function DgMarketingMotion() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const revealEls = Array.from(document.querySelectorAll<HTMLElement>(".dg-reveal"));
    let revealObserver: IntersectionObserver | null = null;

    if (!reduce && revealEls.length > 0) {
      for (const el of revealEls) el.classList.add("js-motion");
      revealObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const el = entry.target as HTMLElement;
            el.classList.add("is-in");
            revealObserver?.unobserve(el);
          }
        },
        { root: null, rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
      );
      for (const el of revealEls) revealObserver.observe(el);
    } else {
      for (const el of revealEls) el.classList.add("is-in");
    }

    const cleanups: Array<() => void> = [];
    const journeys = Array.from(document.querySelectorAll<HTMLElement>(".dg-journey"));

    for (const journey of journeys) {
      const panels = Array.from(journey.querySelectorAll<HTMLElement>(".dg-journey-panel"));
      if (panels.length === 0) continue;

      // Grid layout — highlight all panels, or the one in view.
      if (reduce) {
        panels.forEach((p) => p.classList.add("is-active"));
        continue;
      }

      panels.forEach((p) => p.classList.add("is-active"));

      const panelObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const panel = entry.target as HTMLElement;
            if (entry.isIntersecting && entry.intersectionRatio >= 0.45) {
              panel.classList.add("is-active");
            }
          }
        },
        { root: null, threshold: [0.45, 0.7] },
      );
      for (const panel of panels) panelObserver.observe(panel);
      cleanups.push(() => panelObserver.disconnect());
    }

    return () => {
      revealObserver?.disconnect();
      for (const fn of cleanups) fn();
    };
  }, []);

  return null;
}
