"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useEnabledApps } from "@/components/platform/EnabledAppsProvider";
import { ShellNavLink } from "@/components/ShellNavLink";
import { SidebarIcon } from "@/components/SidebarIcon";
import { itemHasActiveRoute, routeIsActive } from "@/lib/nav-route-match";
import type { AppRoute, NavIaSection } from "@dg/platform-core";

function linkClass(active: boolean, pending = false) {
  return `flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
    active
      ? "bg-[color-mix(in_srgb,var(--org-primary)_14%,transparent)] text-white ring-1 ring-[color-mix(in_srgb,var(--org-primary)_35%,transparent)]"
      : pending
        ? "bg-[var(--org-bg-surface-hover)] text-white"
        : "text-slate-300 hover:bg-[var(--org-bg-surface-hover)] hover:text-white"
  }`;
}

function childLinkClass(active: boolean, pending = false) {
  return `block min-h-10 rounded-md py-2 pl-9 pr-2 text-sm transition ${
    active
      ? "border-l-2 border-[var(--org-primary)] text-white"
      : pending
        ? "border-l-2 border-slate-600 text-slate-200"
        : "text-slate-400 hover:text-slate-200"
  }`;
}

function nestedChildLinkClass(active: boolean, pending = false) {
  return `block min-h-9 rounded-md py-1.5 pl-12 pr-2 text-[13px] transition ${
    active
      ? "border-l-2 border-[var(--org-primary)] text-white"
      : pending
        ? "border-l-2 border-slate-600 text-slate-200"
        : "text-slate-500 hover:text-slate-300"
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
        const rowClass = (pending: boolean) =>
          `flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition ${
            itemActive
              ? "bg-[color-mix(in_srgb,var(--org-primary)_14%,transparent)] text-white ring-1 ring-[color-mix(in_srgb,var(--org-primary)_35%,transparent)]"
              : pending
                ? "bg-[var(--org-bg-surface-hover)] text-white"
                : "text-slate-300 hover:bg-[var(--org-bg-surface-hover)] hover:text-white"
          }`;

        return (
          <div key={item.id}>
            <div className="flex min-h-11 w-full items-stretch gap-0">
              <div className="min-w-0 flex-1">
                <ShellNavLink
                  href={item.primaryHref}
                  onClick={onNavigate}
                  className={(pending) => rowClass(pending)}
                >
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <SidebarIcon glyph={item.icon} />
                    <span className="truncate">{item.name}</span>
                    {item.badge != null && item.badge > 0 ? (
                      <span className="rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-amber-200">
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    ) : null}
                  </span>
                </ShellNavLink>
              </div>
              <button
                type="button"
                aria-label={isOpen ? `Collapse ${item.name}` : `Expand ${item.name}`}
                onClick={() => onToggle(item.id)}
                className="shrink-0 rounded-lg px-2 text-xs text-slate-500 hover:bg-[var(--org-bg-surface-hover)] hover:text-slate-300"
              >
                <span aria-hidden>{isOpen ? "▾" : "▸"}</span>
              </button>
            </div>
            {isOpen ? (
              <ul className="mb-1 mt-0.5 space-y-0.5">
                {item.routes.map((route) => {
                  if (route.children?.length) {
                    const nestKey = `${item.id}::${route.path}`;
                    const nestActive = itemHasActiveRoute(pathname, route.children);
                    const nestOpen = expanded[nestKey] ?? nestActive;
                    return (
                      <li key={`${item.id}-${route.path}-${route.label}`}>
                        <div className="flex items-stretch">
                          <div className="min-w-0 flex-1">
                            <ShellNavLink
                              href={route.path}
                              onClick={onNavigate}
                              className={(pending) =>
                                childLinkClass(
                                  nestActive || pathname === route.path,
                                  pending,
                                )
                              }
                            >
                              {route.label}
                            </ShellNavLink>
                          </div>
                          <button
                            type="button"
                            aria-label={
                              nestOpen ? `Collapse ${route.label}` : `Expand ${route.label}`
                            }
                            onClick={() => onToggle(nestKey)}
                            className="shrink-0 px-2 text-[10px] text-slate-500 hover:text-slate-300"
                          >
                            <span aria-hidden>{nestOpen ? "▾" : "▸"}</span>
                          </button>
                        </div>
                        {nestOpen ? (
                          <ul className="mt-0.5 space-y-0.5">
                            {route.children.map((child) => {
                              const active = routeIsActive(
                                pathname,
                                child.path,
                                route.children!,
                              );
                              return (
                                <li key={`${item.id}-${child.path}-${child.label}`}>
                                  <ShellNavLink
                                    href={child.path}
                                    onClick={onNavigate}
                                    className={(pending) =>
                                      nestedChildLinkClass(active, pending)
                                    }
                                  >
                                    {child.label}
                                  </ShellNavLink>
                                </li>
                              );
                            })}
                          </ul>
                        ) : null}
                      </li>
                    );
                  }

                  const active = routeIsActive(pathname, route.path, item.routes);
                  return (
                    <li key={`${item.id}-${route.path}-${route.label}`}>
                      <ShellNavLink
                        href={route.path}
                        onClick={onNavigate}
                        className={(pending) => childLinkClass(active, pending)}
                      >
                        {route.label}
                      </ShellNavLink>
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
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/dashboard/settings") {
    return pathname === "/dashboard/settings";
  }
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
  const trailing = section.trailingLinks ?? [];
  if (section.links.length === 0 && section.apps.length === 0 && trailing.length === 0) {
    return null;
  }

  function renderShellLinks(links: NavIaSection["links"]) {
    return links.map((link) => {
      const active = shellLinkActive(pathname, link.href, link.routes);
      return (
        <ShellNavLink
          key={`${section.id}-${link.href}-${link.label}`}
          href={link.href}
          onClick={onNavigate}
          className={(pending) => `${linkClass(active, pending)} min-h-11 py-2.5`}
        >
          <SidebarIcon glyph={link.icon ?? "◈"} />
          {link.label}
        </ShellNavLink>
      );
    });
  }

  return (
    <div className={className ?? "mt-4"}>
      <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
        {section.label}
      </p>
      {section.sublabel ? (
        <p className="mb-2 px-3 text-[10px] tracking-wide text-slate-500">{section.sublabel}</p>
      ) : null}
      {renderShellLinks(section.links)}
      {section.apps.length > 0 ? (
        <CollapsibleNavSection
          items={section.apps}
          expanded={expanded}
          onToggle={onToggle}
          pathname={pathname}
          onNavigate={onNavigate}
        />
      ) : null}
      {renderShellLinks(trailing)}
    </div>
  );
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { nav } = useEnabledApps();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [ccBadge, setCcBadge] = useState<number | null>(null);

  const ia = nav.ia;

  // Keep the active app open; do not collapse other sections the user opened.
  useEffect(() => {
    let activeId: string | null = null;
    for (const section of [
      ia.digitalgate,
      ia.core,
      ia.infrastructure,
      ia.industry,
      ia.grow,
      ia.intelligence,
      ia.partners,
      ia.partner,
      ia.platformAdmin,
    ]) {
      for (const app of section.apps) {
        if (itemHasActiveRoute(pathname, app.routes)) {
          activeId = app.id;
          break;
        }
      }
      if (activeId) break;
    }
    if (!activeId) return;
    setExpanded((prev) => (prev[activeId!] ? prev : { ...prev, [activeId!]: true }));
  }, [
    pathname,
    ia.digitalgate,
    ia.core,
    ia.infrastructure,
    ia.industry,
    ia.grow,
    ia.intelligence,
    ia.partners,
    ia.partner,
    ia.platformAdmin,
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
    setExpanded((prev) => ({ ...prev, [id]: !(prev[id] ?? false) }));
  }

  const intelligenceAppsForRender = ia.intelligence.apps.map((app) => ({
    ...app,
    badge: undefined,
  }));

  const digitalgateAppsForRender = ia.digitalgate.apps.map((app) => ({
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
            <ShellNavLink
              key={`intelligence-${link.href}-${link.label}`}
              href={link.href}
              onClick={onNavigate}
              className={(pending) => `${linkClass(active, pending)} min-h-11 py-2.5`}
            >
              <SidebarIcon glyph={link.icon ?? "◈"} />
              {link.label}
            </ShellNavLink>
          );
        })}
      </div>
    ) : null;

  return (
    <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain">
      {ia.digitalgate.apps.length > 0 ? (
        <IaSectionBlock
          section={{ ...ia.digitalgate, apps: digitalgateAppsForRender }}
          pathname={pathname}
          expanded={expanded}
          onToggle={toggleItem}
          onNavigate={onNavigate}
          className="mt-0"
        />
      ) : null}

      <IaSectionBlock
        section={ia.core}
        pathname={pathname}
        expanded={expanded}
        onToggle={toggleItem}
        onNavigate={onNavigate}
        className={ia.digitalgate.apps.length > 0 ? undefined : "mt-0"}
      />

      <IaSectionBlock
        section={ia.infrastructure}
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

      <IaSectionBlock
        section={ia.grow}
        pathname={pathname}
        expanded={expanded}
        onToggle={toggleItem}
        onNavigate={onNavigate}
      />

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

      <IaSectionBlock
        section={ia.platformAdmin}
        pathname={pathname}
        expanded={expanded}
        onToggle={toggleItem}
        onNavigate={onNavigate}
      />
    </nav>
  );
}
