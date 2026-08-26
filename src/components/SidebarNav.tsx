"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useEnabledApps } from "@/components/platform/EnabledAppsProvider";
import { ShellNavLink } from "@/components/ShellNavLink";
import { SidebarIcon } from "@/components/SidebarIcon";
import { itemHasActiveRoute } from "@/lib/nav-route-match";
import type { AppRoute, NavIaSection } from "@dg/platform-core";

function linkClass(active: boolean, pending = false) {
  return `flex min-h-11 items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition ${
    active
      ? "bg-[color-mix(in_srgb,var(--org-primary)_14%,transparent)] text-white ring-1 ring-[color-mix(in_srgb,var(--org-primary)_35%,transparent)]"
      : pending
        ? "bg-[var(--org-bg-surface-hover)] text-white"
        : "text-slate-300 hover:bg-[var(--org-bg-surface-hover)] hover:text-white"
  }`;
}

type FlatNavItem = {
  id: string;
  name: string;
  icon: string;
  routes: AppRoute[];
  primaryHref: string;
  badge?: number;
};

function FlatAppLinks({
  items,
  pathname,
  onNavigate,
}: {
  items: FlatNavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      {items.map((item) => {
        const active = itemHasActiveRoute(pathname, item.routes);
        return (
          <ShellNavLink
            key={item.id}
            href={item.primaryHref}
            onClick={onNavigate}
            className={(pending) => linkClass(active, pending)}
          >
            <SidebarIcon glyph={item.icon} />
            <span className="truncate">{item.name}</span>
            {item.badge != null && item.badge > 0 ? (
              <span className="ml-auto rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-amber-200">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            ) : null}
          </ShellNavLink>
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
  onNavigate,
  className,
}: {
  section: NavIaSection;
  pathname: string;
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
          className={(pending) => linkClass(active, pending)}
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
        <FlatAppLinks items={section.apps} pathname={pathname} onNavigate={onNavigate} />
      ) : null}
      {renderShellLinks(trailing)}
    </div>
  );
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { nav } = useEnabledApps();
  const [ccBadge, setCcBadge] = useState<number | null>(null);

  const ia = nav.ia;

  useEffect(() => {
    if (!nav.commandCentre) {
      setCcBadge(null);
      return;
    }
    let cancelled = false;
    fetch("/api/v1/command/alerts/summary")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { alertCount?: number } | null) => {
        if (!cancelled && typeof data?.alertCount === "number") {
          setCcBadge(data.alertCount);
        }
      })
      .catch(() => {
        /* badge is optional */
      });
    return () => {
      cancelled = true;
    };
  }, [nav.commandCentre]);

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
          <FlatAppLinks
            items={intelligenceAppsForRender}
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
              className={(pending) => linkClass(active, pending)}
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
          onNavigate={onNavigate}
          className="mt-0"
        />
      ) : null}

      <IaSectionBlock
        section={ia.core}
        pathname={pathname}
        onNavigate={onNavigate}
        className={ia.digitalgate.apps.length > 0 ? undefined : "mt-0"}
      />

      <IaSectionBlock
        section={ia.infrastructure}
        pathname={pathname}
        onNavigate={onNavigate}
      />

      <IaSectionBlock
        section={ia.industry}
        pathname={pathname}
        onNavigate={onNavigate}
      />

      <IaSectionBlock section={ia.grow} pathname={pathname} onNavigate={onNavigate} />

      {intelligenceSection}

      <IaSectionBlock section={ia.partners} pathname={pathname} onNavigate={onNavigate} />

      <IaSectionBlock section={ia.partner} pathname={pathname} onNavigate={onNavigate} />

      <IaSectionBlock
        section={ia.platformAdmin}
        pathname={pathname}
        onNavigate={onNavigate}
      />
    </nav>
  );
}
