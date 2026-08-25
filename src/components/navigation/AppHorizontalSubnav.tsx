"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ShellNavLink } from "@/components/ShellNavLink";
import { routeIsActive } from "@/lib/nav-route-match";
import type { AppRoute } from "@dg/platform-core";

const DEFAULT_MAX_VISIBLE = 8;

function navLinkClass(active: boolean, pending: boolean) {
  return `shrink-0 rounded-lg px-3 py-1.5 text-sm transition ${
    active
      ? "bg-[color-mix(in_srgb,var(--org-primary)_18%,transparent)] font-medium text-white ring-1 ring-[color-mix(in_srgb,var(--org-primary)_35%,transparent)]"
      : pending
        ? "bg-[var(--org-bg-surface-hover)] text-white"
        : "text-slate-400 hover:bg-[var(--org-bg-surface-hover)] hover:text-slate-200"
  }`;
}

export function AppHorizontalSubnav({
  routes,
  maxVisible = DEFAULT_MAX_VISIBLE,
  ariaLabel,
}: {
  routes: AppRoute[];
  maxVisible?: number;
  ariaLabel: string;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!moreRef.current?.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [moreOpen]);

  if (routes.length <= 1) return null;

  const visible = routes.slice(0, maxVisible);
  const overflow = routes.slice(maxVisible);
  const overflowActive = overflow.some((route) => routeIsActive(pathname, route.path, routes));

  return (
    <nav
      className="flex min-w-0 flex-wrap items-center gap-1.5"
      aria-label={ariaLabel}
    >
      {visible.map((route) => {
        const active = routeIsActive(pathname, route.path, routes);
        return (
          <ShellNavLink
            key={`${route.path}-${route.label}`}
            href={route.path}
            className={(pending) => navLinkClass(active, pending)}
          >
            {route.label}
          </ShellNavLink>
        );
      })}

      {overflow.length > 0 ? (
        <div ref={moreRef} className="relative shrink-0">
          <button
            type="button"
            aria-expanded={moreOpen}
            aria-haspopup="true"
            onClick={() => setMoreOpen((open) => !open)}
            className={navLinkClass(overflowActive, false)}
          >
            More <span aria-hidden>▾</span>
          </button>
          {moreOpen ? (
            <div className="absolute left-0 top-full z-20 mt-1 min-w-[10rem] rounded-lg border border-slate-800 bg-slate-950 py-1 shadow-xl">
              {overflow.map((route) => {
                const active = routeIsActive(pathname, route.path, routes);
                return (
                  <Link
                    key={`${route.path}-${route.label}`}
                    href={route.path}
                    className={`block px-3 py-2 text-sm ${
                      active
                        ? "bg-[color-mix(in_srgb,var(--org-primary)_14%,transparent)] text-white"
                        : "text-slate-300 hover:bg-[var(--org-bg-surface-hover)] hover:text-white"
                    }`}
                    onClick={() => setMoreOpen(false)}
                  >
                    {route.label}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </nav>
  );
}
