"use client";

import { useEffect } from "react";

/**
 * DigitalGate marketing motion — reveal + scroll-scrub journey.
 * CSS provides a no-JS fallback (view timelines). When this island mounts,
 * it opts elements into the JS-enhanced path (.js-motion / .dg-journey--js).
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

    const journeys = Array.from(document.querySelectorAll<HTMLElement>(".dg-journey"));
    const cleanups: Array<() => void> = [];

    for (const journey of journeys) {
      const track = journey.querySelector<HTMLElement>(".dg-journey-track");
      const rail = journey.querySelector<HTMLElement>(".dg-journey-rail");
      const panels = Array.from(journey.querySelectorAll<HTMLElement>(".dg-journey-panel"));
      const progress = journey.querySelector<HTMLElement>(".dg-journey-progress span");
      if (!track || !rail || panels.length === 0) continue;

      if (reduce || window.matchMedia("(max-width: 767px)").matches) {
        journey.classList.add("dg-journey--static");
        panels.forEach((p) => p.classList.add("is-active"));
        continue;
      }

      journey.classList.add("dg-journey--js");
      let ticking = false;

      const sync = () => {
        ticking = false;
        const rect = track.getBoundingClientRect();
        const trackH = track.offsetHeight;
        const viewH = window.innerHeight;
        const scrollable = Math.max(1, trackH - viewH);
        const raw = Math.min(1, Math.max(0, -rect.top / scrollable));
        const parent = rail.parentElement;
        if (!parent) return;
        const maxX = Math.max(0, rail.scrollWidth - parent.clientWidth);
        rail.style.transform = `translate3d(${-raw * maxX}px, 0, 0)`;
        if (progress) progress.style.transform = `scaleX(${raw})`;

        const idx = Math.min(panels.length - 1, Math.floor(raw * (panels.length - 0.001)));
        panels.forEach((p, i) => {
          p.classList.toggle("is-active", i === idx);
          p.classList.toggle("is-passed", i < idx);
          p.classList.toggle("is-ahead", i > idx);
        });
      };

      const onScroll = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(sync);
      };

      sync();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll, { passive: true });
      cleanups.push(() => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
      });
    }

    return () => {
      revealObserver?.disconnect();
      for (const fn of cleanups) fn();
    };
  }, []);

  return null;
}
