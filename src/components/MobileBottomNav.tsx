"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEnabledApps } from "@/components/platform/EnabledAppsProvider";

const CORE_ITEMS = [
  { href: "/dashboard", label: "Home", glyph: "⌂" },
  { href: "/dashboard/advisor", label: "Aida", glyph: "✦" },
  { href: "/dashboard/apps", label: "Apps", glyph: "◫" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNav({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const { nav } = useEnabledApps();
  const canAccessCommand = nav.some((section) => section.items.some((item) => item.href === "/command" || item.href.startsWith("/command/")));
  const items = canAccessCommand
    ? [CORE_ITEMS[0], { href: "/command", label: "Command", glyph: "⌘" } as const, ...CORE_ITEMS.slice(1)]
    : CORE_ITEMS;
  const columns = items.length + 1;

  return (
    <nav aria-label="Primary mobile navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--org-border-subtle,rgb(30_41_59))] bg-[color-mix(in_srgb,var(--org-bg-elevated,rgb(2_6_23))_92%,transparent)] px-2 pt-1.5 backdrop-blur-xl md:hidden print:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="mx-auto grid max-w-lg gap-1" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`dg-touch-target flex min-w-0 flex-col items-center justify-end rounded-xl px-1 pb-0.5 pt-1 text-[10px] font-medium transition ${active ? "bg-[color-mix(in_srgb,var(--org-primary)_14%,transparent)] text-white" : "text-slate-400 active:bg-[var(--org-bg-surface-hover)] active:text-white"}`}><span aria-hidden className="text-lg leading-none">{item.glyph}</span><span className="mt-0.5 truncate leading-none">{item.label}</span></Link>;
        })}
        <button type="button" onClick={onMenuClick} aria-label="Open all navigation" className="dg-touch-target flex min-w-0 flex-col items-center justify-end rounded-xl px-1 pb-0.5 pt-1 text-[10px] font-medium text-slate-400 transition active:bg-[var(--org-bg-surface-hover)] active:text-white"><span aria-hidden className="text-lg leading-none">☰</span><span className="mt-0.5 leading-none">More</span></button>
      </div>
    </nav>
  );
}
