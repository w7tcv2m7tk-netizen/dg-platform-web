"use client";

import { useEffect } from "react";

export const DG_SHELL_HEIGHT_VAR = "--dg-shell-height";

/** Largest measured viewport so the shell can include the iOS home-indicator band. */
export function measureShellViewportHeight(): number {
  const visual = window.visualViewport;
  const visualHeight = visual ? Math.round(visual.height + visual.offsetTop) : 0;
  return Math.max(
    window.innerHeight,
    document.documentElement.clientHeight,
    visualHeight,
  );
}

/**
 * Publish `--dg-shell-height` so the authenticated shell is not locked to the
 * iOS layout viewport (`inset: 0` / `100dvh`), which leaves a dead band that
 * content cannot scroll into.
 */
export function useShellViewportHeight() {
  useEffect(() => {
    const root = document.documentElement;

    const apply = () => {
      root.style.setProperty(
        DG_SHELL_HEIGHT_VAR,
        `${measureShellViewportHeight()}px`,
      );
    };

    apply();
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);
    const visual = window.visualViewport;
    visual?.addEventListener("resize", apply);
    visual?.addEventListener("scroll", apply);
    return () => {
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
      visual?.removeEventListener("resize", apply);
      visual?.removeEventListener("scroll", apply);
      root.style.removeProperty(DG_SHELL_HEIGHT_VAR);
    };
  }, []);
}
