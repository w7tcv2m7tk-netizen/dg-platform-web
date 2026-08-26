"use client";

import { useEffect } from "react";

/**
 * DigitalGate marketing motion — card reveals + horizontal journey progress.
 * CSS handles layout/fallback; this island enhances reveals and journey highlighting.
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
      const viewport = journey.querySelector<HTMLElement>(".dg-journey-viewport");
      const panels = Array.from(journey.querySelectorAll<HTMLElement>(".dg-journey-panel"));
      const progress = journey.querySelector<HTMLElement>(".dg-journey-progress span");
      if (!viewport || panels.length === 0) continue;

      if (reduce || window.matchMedia("(max-width: 767px)").matches) {
        panels.forEach((p) => p.classList.add("is-active"));
        continue;
      }

      const syncJourney = () => {
        const maxScroll = Math.max(1, viewport.scrollWidth - viewport.clientWidth);
        const raw = viewport.scrollLeft / maxScroll;
        if (progress) progress.style.transform = `scaleX(${raw})`;

        const center = viewport.scrollLeft + viewport.clientWidth * 0.42;
        let bestIdx = 0;
        let bestDist = Infinity;
        panels.forEach((panel, i) => {
          const mid = panel.offsetLeft + panel.offsetWidth / 2;
          const dist = Math.abs(mid - center);
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = i;
          }
        });
        panels.forEach((panel, i) => {
          panel.classList.toggle("is-active", i === bestIdx);
        });
      };

      syncJourney();
      viewport.addEventListener("scroll", syncJourney, { passive: true });
      window.addEventListener("resize", syncJourney, { passive: true });
      cleanups.push(() => {
        viewport.removeEventListener("scroll", syncJourney);
        window.removeEventListener("resize", syncJourney);
      });
    }

    return () => {
      revealObserver?.disconnect();
      for (const fn of cleanups) fn();
    };
  }, []);

  return null;
}
