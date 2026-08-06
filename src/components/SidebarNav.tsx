"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useEnabledApps } from "@/components/platform/EnabledAppsProvider";
import { SidebarIcon } from "@/components/SidebarIcon";
import { itemHasActiveRoute, routeIsActive } from "@/lib/nav-route-match";
import {
  BUSINESS_WORKSPACE_SECTION_LABEL,
  type AppRoute,
} from "@dg/platform-core";

function linkClass(active: boolean) {
  return `flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
    active
      ? "bg-[color-mix(in_srgb,var(--org-primary)_14%,transparent)] text-white ring-1 ring-[color-mix(in_srgb,var(--org-primary)_35%,transparent)]"
      : "text-slate-300 hover:bg-[var(--org-bg-surface-hover)] hover:text-white"
  }`;
}

function childLinkClass(active: boolean) {
  return `block min-h-10 rounded-md py-2 pl-9 pr-2 text-sm transition ${
    active
      ? "border-l-2 border-[var(--org-primary)] text-white"
      : "text-slate-400 hover:text-slate-200"
  }`;
}

type CollapsibleItem = {
  id: string;
  name: string;
  icon: string;
  routes: AppRoute[];
  primaryHref: string;
};

function CollapsibleNavSection({
  items,
  expanded,
  onToggle,
  pathname,
  onNavigate,
}: {
  items: CollapsibleItem[];
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {items.map((item) => {
        const isOpen = expanded[item.id] ?? false;
        const itemActive = itemHasActiveRoute(pathname, item.routes);

        return (
          <div key={item.id}>
            <button
              type="button"
              onClick={() => onToggle(item.id)}
              className={`flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                itemActive
                  ? "bg-[color-mix(in_srgb,var(--org-primary)_14%,transparent)] text-white ring-1 ring-[color-mix(in_srgb,var(--org-primary)_35%,transparent)]"
                  : "text-slate-300 hover:bg-[var(--org-bg-surface-hover)] hover:text-white"
              }`}
            >
              <SidebarIcon glyph={item.icon} />
              <span className="flex-1 truncate">{item.name}</span>
              <span className="text-xs text-slate-500" aria-hidden>
                {isOpen ? "▾" : "▸"}
              </span>
            </button>
            {isOpen ? (
              <ul className="mb-1 mt-0.5 space-y-0.5">
                {item.routes.map((route) => {
                  const active = routeIsActive(pathname, route.path, item.routes);
                  return (
                    <li key={route.path}>
                      <Link
                        href={route.path}
                        prefetch
                        onClick={onNavigate}
                        className={childLinkClass(active)}
                      >
                        {route.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { nav } = useEnabledApps();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const group of nav.tiers) {
      for (const app of group.apps) {
        if (itemHasActiveRoute(pathname, app.routes)) next[app.id] = true;
      }
    }
    setExpanded(next);
  }, [pathname, nav.tiers]);

  function toggleItem(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function shellLinkActive(href: string, label: string): boolean {
    if (pathname === href) return true;
    if (href === "/dashboard") return false;
    if (label === "Team") {
      return pathname.startsWith("/dashboard/settings/team");
    }
    if (label === "Settings") {
      return (
        pathname.startsWith("/dashboard/settings") &&
        !pathname.startsWith("/dashboard/settings/team")
      );
    }
    return pathname.startsWith(`${href}/`);
  }

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
      <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
        {BUSINESS_WORKSPACE_SECTION_LABEL}
      </p>
      {nav.shell.map((link) => {
        const active = shellLinkActive(link.href, link.label);
        return (
          <Link
            key={link.href}
            href={link.href}
            prefetch
            onClick={onNavigate}
            className={`${linkClass(active)} min-h-11 py-2.5`}
          >
            <SidebarIcon glyph={link.icon ?? "◈"} />
            {link.label}
          </Link>
        );
      })}

      {nav.tiers.map((group) => (
        <div key={group.tier} className="mt-4">
          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
            {group.label}
          </p>
          <CollapsibleNavSection
            items={group.apps}
            expanded={expanded}
            onToggle={toggleItem}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        </div>
      ))}

      <div className="mt-4">
        <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
          {nav.tools.label}
        </p>
        {nav.tools.tools.flatMap((tool) =>
          tool.routes.map((route) => {
            const active = routeIsActive(pathname, route.path, tool.routes);
            return (
              <Link
                key={route.path}
                href={route.path}
                prefetch
                onClick={onNavigate}
                className={`${linkClass(active)} min-h-11 py-2.5`}
              >
                {route.label}
              </Link>
            );
          }),
        )}
      </div>
    </nav>
  );
}
