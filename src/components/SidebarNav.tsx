"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useEnabledApps } from "@/components/platform/EnabledAppsProvider";
import { SidebarIcon } from "@/components/SidebarIcon";
import { itemHasActiveRoute, routeIsActive } from "@/lib/nav-route-match";
import type { AppRoute } from "@dg/platform-core";

function linkClass(active: boolean) {
  return `flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
    active
      ? "bg-slate-900 text-white"
      : "text-slate-300 hover:bg-slate-900 hover:text-white"
  }`;
}

function childLinkClass(active: boolean) {
  return `block min-h-10 rounded-md py-2 pl-9 pr-2 text-sm transition ${
    active ? "text-white" : "text-slate-400 hover:text-slate-200"
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
                  ? "bg-slate-900/80 text-white"
                  : "text-slate-300 hover:bg-slate-900 hover:text-white"
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
    for (const tool of nav.tools.tools) {
      if (itemHasActiveRoute(pathname, tool.routes)) next[tool.id] = true;
    }
    setExpanded(next);
  }, [pathname, nav.tiers, nav.tools.tools]);

  function toggleItem(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
      {nav.shell.map((link) => {
        const active =
          pathname === link.href ||
          (link.href !== "/dashboard" && pathname.startsWith(link.href));
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
        <CollapsibleNavSection
          items={nav.tools.tools}
          expanded={expanded}
          onToggle={toggleItem}
          pathname={pathname}
          onNavigate={onNavigate}
        />
      </div>
    </nav>
  );
}
