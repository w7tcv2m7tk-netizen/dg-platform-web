"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useEnabledApps } from "@/components/platform/EnabledAppsProvider";
import { SidebarIcon } from "@/components/SidebarIcon";
import { itemHasActiveRoute, routeIsActive } from "@/lib/nav-route-match";
import {
  PLATFORM_NAV_SECTION_LABEL,
  type AppRoute,
  type NavIaSection,
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
  badge?: number;
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
              {item.badge != null && item.badge > 0 ? (
                <span className="rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-amber-200">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              ) : null}
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

function shellLinkActive(pathname: string, href: string, routes?: AppRoute[]): boolean {
  if (routes?.length) return itemHasActiveRoute(pathname, routes);
  if (pathname === href) return true;
  // Overview / Business Health share /dashboard — only exact match
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(`${href}/`);
}

function IaSectionBlock({
  section,
  pathname,
  expanded,
  onToggle,
  onNavigate,
  className,
}: {
  section: NavIaSection;
  pathname: string;
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
  onNavigate?: () => void;
  className?: string;
}) {
  if (section.links.length === 0 && section.apps.length === 0) return null;

  return (
    <div className={className ?? "mt-4"}>
      <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
        {section.label}
      </p>
      {section.apps.length > 0 ? (
        <CollapsibleNavSection
          items={section.apps}
          expanded={expanded}
          onToggle={onToggle}
          pathname={pathname}
          onNavigate={onNavigate}
        />
      ) : null}
      {section.links.map((link) => {
        const active = shellLinkActive(pathname, link.href, link.routes);
        return (
          <Link
            key={`${section.id}-${link.href}-${link.label}`}
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
    </div>
  );
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { nav } = useEnabledApps();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [ccBadge, setCcBadge] = useState<number | null>(null);

  const ia = nav.ia;
  const staffChannelFirst =
    Boolean(nav.commandCentre) || ia.partners.links.length > 0 || ia.partner.links.length > 0;

  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const section of [
      ia.operate,
      ia.industry,
      ia.grow,
      ia.intelligence,
      ia.partners,
      ia.partner,
      ia.ecosystem,
    ]) {
      for (const app of section.apps) {
        if (itemHasActiveRoute(pathname, app.routes)) next[app.id] = true;
      }
    }
    if (nav.platform.routes?.length && itemHasActiveRoute(pathname, nav.platform.routes)) {
      next[`shell-${nav.platform.href}`] = true;
    }
    setExpanded(next);
  }, [
    pathname,
    ia.operate,
    ia.industry,
    ia.grow,
    ia.intelligence,
    ia.partners,
    ia.partner,
    ia.ecosystem,
    nav.platform,
  ]);

  useEffect(() => {
    if (!nav.commandCentre) {
      setCcBadge(null);
      return;
    }
    let cancelled = false;
    fetch("/api/v1/command/opportunities/summary")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { attentionCount?: number } | null) => {
        if (!cancelled && typeof data?.attentionCount === "number") {
          setCcBadge(data.attentionCount);
        }
      })
      .catch(() => {
        /* badge is optional */
      });
    return () => {
      cancelled = true;
    };
  }, [nav.commandCentre]);

  function toggleItem(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const intelligenceAppsForRender = ia.intelligence.apps.map((app) => ({
    ...app,
    badge: app.id === "command-centre" ? (ccBadge ?? undefined) : undefined,
  }));

  const intelligenceSection =
    intelligenceAppsForRender.length > 0 || ia.intelligence.links.length > 0 ? (
      <div className="mt-4">
        <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
          {ia.intelligence.label}
        </p>
        {intelligenceAppsForRender.length > 0 ? (
          <CollapsibleNavSection
            items={intelligenceAppsForRender}
            expanded={expanded}
            onToggle={toggleItem}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        ) : null}
        {ia.intelligence.links.map((link) => {
          const active = shellLinkActive(pathname, link.href, link.routes);
          return (
            <Link
              key={`intelligence-${link.href}-${link.label}`}
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
      </div>
    ) : null;

  return (
    <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain">
      <IaSectionBlock
        section={ia.business}
        pathname={pathname}
        expanded={expanded}
        onToggle={toggleItem}
        onNavigate={onNavigate}
        className="mt-0"
      />

      <IaSectionBlock
        section={ia.operate}
        pathname={pathname}
        expanded={expanded}
        onToggle={toggleItem}
        onNavigate={onNavigate}
      />

      <IaSectionBlock
        section={ia.industry}
        pathname={pathname}
        expanded={expanded}
        onToggle={toggleItem}
        onNavigate={onNavigate}
      />

      {staffChannelFirst ? (
        <>
          {intelligenceSection}
          <IaSectionBlock
            section={ia.partners}
            pathname={pathname}
            expanded={expanded}
            onToggle={toggleItem}
            onNavigate={onNavigate}
          />
          <IaSectionBlock
            section={ia.partner}
            pathname={pathname}
            expanded={expanded}
            onToggle={toggleItem}
            onNavigate={onNavigate}
          />
        </>
      ) : null}

      <IaSectionBlock
        section={ia.grow}
        pathname={pathname}
        expanded={expanded}
        onToggle={toggleItem}
        onNavigate={onNavigate}
      />

      {staffChannelFirst ? null : (
        <>
          {intelligenceSection}
          <IaSectionBlock
            section={ia.partners}
            pathname={pathname}
            expanded={expanded}
            onToggle={toggleItem}
            onNavigate={onNavigate}
          />
          <IaSectionBlock
            section={ia.partner}
            pathname={pathname}
            expanded={expanded}
            onToggle={toggleItem}
            onNavigate={onNavigate}
          />
        </>
      )}

      <IaSectionBlock
        section={ia.ecosystem}
        pathname={pathname}
        expanded={expanded}
        onToggle={toggleItem}
        onNavigate={onNavigate}
      />

      <div className="mt-4">
        <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
          {PLATFORM_NAV_SECTION_LABEL}
        </p>
        <CollapsibleNavSection
          items={[
            {
              id: `shell-${nav.platform.href}`,
              name: nav.platform.label,
              icon: nav.platform.icon ?? "⎔",
              routes: nav.platform.routes ?? [],
              primaryHref: nav.platform.href,
            },
          ]}
          expanded={expanded}
          onToggle={toggleItem}
          pathname={pathname}
          onNavigate={onNavigate}
        />
      </div>
    </nav>
  );
}
