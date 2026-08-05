"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useEnabledApps } from "@/components/platform/EnabledAppsProvider";

function linkClass(active: boolean) {
  return `flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
    active
      ? "bg-slate-900 text-white"
      : "text-slate-300 hover:bg-slate-900 hover:text-white"
  }`;
}

function childLinkClass(active: boolean) {
  return `block rounded-md py-1.5 pl-9 pr-2 text-sm transition ${
    active ? "text-white" : "text-slate-400 hover:text-slate-200"
  }`;
}

export function SidebarNav() {
  const pathname = usePathname();
  const { nav } = useEnabledApps();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const group of nav.tiers) {
      for (const app of group.apps) {
        const isActive =
          pathname === app.primaryHref ||
          app.routes.some((r) => pathname === r.path || pathname.startsWith(`${r.path}/`));
        if (isActive) next[app.id] = true;
      }
    }
    setExpanded((prev) => ({ ...prev, ...next }));
  }, [pathname, nav.tiers]);

  function toggleApp(appId: string) {
    setExpanded((prev) => ({ ...prev, [appId]: !prev[appId] }));
  }

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
      {nav.shell.map((link) => {
        const active =
          pathname === link.href ||
          (link.href !== "/dashboard" && pathname.startsWith(link.href));
        return (
          <Link key={link.href} href={link.href} className={linkClass(active)}>
            <span className="text-blue-500">{link.icon ?? "•"}</span>
            {link.label}
          </Link>
        );
      })}

      {nav.tiers.map((group) => (
        <div key={group.tier} className="mt-4">
          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
            {group.label}
          </p>
          <div className="flex flex-col gap-0.5">
            {group.apps.map((app) => {
              const isOpen = expanded[app.id] ?? false;
              const appActive = app.routes.some(
                (r) => pathname === r.path || pathname.startsWith(`${r.path}/`),
              );

              return (
                <div key={app.id}>
                  <button
                    type="button"
                    onClick={() => toggleApp(app.id)}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                      appActive
                        ? "bg-slate-900/80 text-white"
                        : "text-slate-300 hover:bg-slate-900 hover:text-white"
                    }`}
                  >
                    <span className="text-blue-500">{app.icon}</span>
                    <span className="flex-1 truncate">{app.name}</span>
                    <span className="text-xs text-slate-500" aria-hidden>
                      {isOpen ? "▾" : "▸"}
                    </span>
                  </button>
                  {isOpen ? (
                    <ul className="mb-1 mt-0.5 space-y-0.5">
                      {app.routes.map((route) => {
                        const active =
                          pathname === route.path || pathname.startsWith(`${route.path}/`);
                        return (
                          <li key={route.path}>
                            <Link href={route.path} className={childLinkClass(active)}>
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
        </div>
      ))}
    </nav>
  );
}
