"use client";

import { useEffect } from "react";

/**
 * DigitalGate marketing motion — card reveals, journey highlight, and (on home)
 * causal stage activation, and a subtle fade of the fixed hero environment as content surfaces rise over it.
 * CSS owns layout/fallback; this island only enhances behaviour.
 */
export function DgMarketingMotion() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const desktop = window.matchMedia("(min-width: 960px)").matches;

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


    // Causal homepage stages — illuminate architecture as each stage enters.
    const stageEls = Array.from(document.querySelectorAll<HTMLElement>("[data-dg-hp-stage]"));
    if (stageEls.length > 0) {
      if (reduce) {
        for (const el of stageEls) el.classList.add("is-on");
      } else {
        const stageObserver = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              const el = entry.target as HTMLElement;
              if (!(entry.isIntersecting && entry.intersectionRatio >= 0.28)) continue;
              el.classList.add("is-on");
              const stage = el.dataset.dgHpStage;
              if (stage === "intelligence" || stage === "twin") {
                const root = el.closest("section") ?? document;
                window.setTimeout(() => {
                  root
                    .querySelectorAll<HTMLElement>('[data-dg-hp-stage="twin"]')
                    .forEach((n) => n.classList.add("is-on"));
                }, 120);
                window.setTimeout(() => {
                  root
                    .querySelectorAll<HTMLElement>('[data-dg-hp-stage="brain"]')
                    .forEach((n) => n.classList.add("is-on"));
                }, 320);
                window.setTimeout(() => {
                  root
                    .querySelectorAll<HTMLElement>('[data-dg-hp-stage="advisor"]')
                    .forEach((n) => n.classList.add("is-on"));
                }, 520);
                window.setTimeout(() => {
                  root
                    .querySelectorAll<HTMLElement>('[data-dg-hp-stage="action"]')
                    .forEach((n) => n.classList.add("is-on"));
                }, 720);
              }
              stageObserver.unobserve(el);
            }
          },
          { root: null, rootMargin: "0px 0px -12% 0px", threshold: [0.28, 0.5] },
        );
        for (const el of stageEls) stageObserver.observe(el);
        cleanups.push(() => stageObserver.disconnect());
      }
    }

    // Layered home: hero → environment → platform (fade fixed atmosphere).
    const hero = document.querySelector<HTMLElement>(".hero-home");
    if (hero && !reduce && desktop) {
      let raf = 0;
      const updateEnvFade = () => {
        raf = 0;
        const vh = Math.max(window.innerHeight, 1);
        // Hold through first viewport, then ease out over ~1.4 viewports.
        const progress = Math.min(1, Math.max(0, (window.scrollY - vh * 0.35) / (vh * 1.4)));
        const fade = 1 - progress;
        hero.style.setProperty("--env-fade", fade.toFixed(3));
      };
      const onScroll = () => {
        if (!raf) raf = requestAnimationFrame(updateEnvFade);
      };
      updateEnvFade();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll, { passive: true });
      cleanups.push(() => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
        if (raf) cancelAnimationFrame(raf);
        hero.style.removeProperty("--env-fade");
      });
    }

    return () => {
      revealObserver?.disconnect();
      for (const fn of cleanups) fn();
    };
  }, []);

  return null;
}
