"use client";

import { useEffect, useState } from "react";

/** Matches Tailwind `md` — desktop shell width for the fixed sidebar. */
const DESKTOP_MQ = "(min-width: 768px)";

/**
 * Whether the viewport is desktop-width. Defaults to true to avoid a
 * missing-sidebar flash for the common operator desktop layout.
 */
export function useIsDesktopShell(): boolean {
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isDesktop;
}
