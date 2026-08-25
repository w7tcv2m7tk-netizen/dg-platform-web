"use client";

import { useEnabledApps } from "@/components/platform/EnabledAppsProvider";
import { flattenAppRoutes } from "@dg/platform-core";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

/** High-traffic shell destinations — always warm these. */
const BASE_ROUTES = [
  "/dashboard",
  "/dashboard/apps",
  "/dashboard/settings",
  "/apps/crm/contacts",
  "/apps/commerce",
  "/apps/communications",
  "/apps/communications/inbox",
] as const;

/**
 * Prefetch critical authenticated routes + installed app hubs once the shell is mounted.
 * Does not block paint; runs after idle / short delay.
 */
export function PrefetchCriticalRoutes() {
  const router = useRouter();
  const { nav } = useEnabledApps();

  const hrefs = useMemo(() => {
    const set = new Set<string>(BASE_ROUTES);
    const sections = [
      nav.ia.digitalgate,
      nav.ia.core,
      nav.ia.infrastructure,
      nav.ia.industry,
      nav.ia.grow,
      nav.ia.intelligence,
    ];
    for (const section of sections) {
      for (const link of section.links) {
        if (link.href) set.add(link.href);
      }
      for (const app of section.apps) {
        if (app.primaryHref) set.add(app.primaryHref);
        for (const route of flattenAppRoutes(app.routes).slice(0, 8)) {
          if (route.path) set.add(route.path);
        }
      }
    }
    return [...set].slice(0, 32);
  }, [nav.ia]);

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      for (const href of hrefs) {
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
  }, [router, hrefs]);

  return null;
}
