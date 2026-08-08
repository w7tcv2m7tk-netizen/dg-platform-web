"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** High-traffic shell destinations — warm the RSC cache after first paint. */
const CRITICAL_ROUTES = [
  "/dashboard",
  "/dashboard/apps",
  "/dashboard/settings",
  "/apps/crm/contacts",
  "/apps/re",
  "/apps/accommodation",
  "/apps/commerce",
  "/apps/commerce/invoices",
] as const;

/**
 * Prefetch critical authenticated routes once the shell is mounted.
 * Does not block paint; runs after idle / short delay.
 */
export function PrefetchCriticalRoutes() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      for (const href of CRITICAL_ROUTES) {
        try {
          router.prefetch(href);
        } catch {
          // prefetch is best-effort
        }
      }
    };

    const ric = (
      window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
        cancelIdleCallback?: (id: number) => void;
      }
    ).requestIdleCallback;

    if (typeof ric === "function") {
      const id = ric(run, { timeout: 2500 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback?.(id);
      };
    }

    const t = window.setTimeout(run, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [router]);

  return null;
}
