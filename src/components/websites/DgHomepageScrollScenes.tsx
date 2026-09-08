"use client";

import { useEffect } from "react";

type SceneEl = HTMLElement & {
  dataset: DOMStringMap & {
    dgScene?: string;
    dgSceneMobile?: string;
  };
};

/**
 * DigitalGate homepage signature scroll scenes.
 *
 * Progressive enhancement only: discovers `[data-dg-scene]` tracks in
 * server-rendered HTML, maps local scroll progress → `--dg-scene-p` (0–1)
 * and discrete `data-phase` for causal choreography.
 *
 * Does not scroll-jack. Reduced motion → final settled states.
 * Ordinary `.dg-reveal` entrances remain in DgMarketingMotion.
 */
export function DgHomepageScrollScenes() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scenes = Array.from(document.querySelectorAll<SceneEl>("[data-dg-scene]"));
    if (scenes.length === 0) return;

    const phaseFor = (id: string, p: number): string => {
      if (id === "gateway-formation") {
        if (p < 0.15) return "frag";
        if (p < 0.3) return "converge";
        if (p < 0.45) return "cross";
        if (p < 0.6) return "context";
        if (p < 0.72) return "twin";
        if (p < 0.84) return "brain";
        if (p < 0.94) return "advisor";
        return "settle";
      }
      if (id === "governed-action") {
        if (p < 0.2) return "context";
        if (p < 0.35) return "reason";
        if (p < 0.48) return "recommend";
        if (p < 0.65) return "authority";
        if (p < 0.78) return "permit";
        if (p < 0.88) return "act";
        if (p < 0.96) return "outcome";
        return "learn";
      }
      if (id === "architecture-product") {
        if (p < 0.25) return "abstract";
        if (p < 0.5) return "align";
        if (p < 0.75) return "resolve";
        return "product";
      }
      return "active";
    };

    const apply = (el: SceneEl, p: number) => {
      const clamped = Math.min(1, Math.max(0, p));
      el.style.setProperty("--dg-scene-p", clamped.toFixed(4));
      const id = el.dataset.dgScene ?? "";
      const phase = phaseFor(id, clamped);
      if (el.dataset.phase !== phase) el.dataset.phase = phase;
      el.classList.toggle("is-scene-active", clamped > 0 && clamped < 1);
      el.classList.toggle("is-scene-complete", clamped >= 1);
    };

    if (reduce) {
      for (const el of scenes) {
        apply(el, 1);
        el.dataset.phase = phaseFor(el.dataset.dgScene ?? "", 1);
      }
      return;
    }

    const isCompact = () => window.matchMedia("(max-width: 900px)").matches;

    let raf = 0;
    const measure = () => {
      raf = 0;
      const vh = Math.max(window.innerHeight, 1);
      const compact = isCompact();

      for (const el of scenes) {
        const rect = el.getBoundingClientRect();
        const trackH = Math.max(el.offsetHeight, 1);
        const scrollable = Math.max(trackH - vh, 1);
        let p: number;
        if (compact && el.dataset.dgSceneMobile === "step") {
          const visible = Math.min(rect.bottom, vh) - Math.max(rect.top, 0);
          p = Math.min(1, Math.max(0, visible / Math.min(trackH, vh)));
          p = Math.min(1, p * 1.15);
        } else {
          p = Math.min(1, Math.max(0, -rect.top / scrollable));
        }
        apply(el, p);
      }
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) onScroll();
        }
      },
      { root: null, rootMargin: "20% 0px", threshold: [0, 0.01, 0.1] },
    );
    for (const el of scenes) io.observe(el);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, []);

  return null;
}
