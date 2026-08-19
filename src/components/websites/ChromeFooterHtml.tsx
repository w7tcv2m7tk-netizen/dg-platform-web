"use client";

import { useEffect, useState } from "react";

/**
 * Below-fold chrome: keep a short placeholder on first paint, then hydrate
 * the full footer after idle so LCP is not competing with footer CSS/markup.
 */
export function ChromeFooterHtml({ html }: { html: string }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const show = () => setReady(true);
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(show, { timeout: 1500 });
      return () => window.cancelIdleCallback(id);
    }
    const t = window.setTimeout(show, 50);
    return () => window.clearTimeout(t);
  }, []);

  if (!ready) {
    return (
      <section
        className="wb-site-chrome-footer wb-site-chrome-footer-slot"
        aria-hidden="true"
      />
    );
  }

  return (
    <section
      className="wb-section wb-html-block wb-site-chrome wb-site-chrome-footer"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
