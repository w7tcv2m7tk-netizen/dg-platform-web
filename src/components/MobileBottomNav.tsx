"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/dashboard", label: "Home", glyph: "⌂" },
  { href: "/command", label: "Command", glyph: "⌘" },
  { href: "/dashboard/advisor", label: "Aida", glyph: "✦" },
  { href: "/dashboard/apps", label: "Apps", glyph: "◫" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNav({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary mobile navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--org-border-subtle,rgb(30_41_59))] bg-[color-mix(in_srgb,var(--org-bg-elevated,rgb(2_6_23))_92%,transparent)] px-2 pt-1.5 backdrop-blur-xl md:hidden print:hidden" style={{ paddingBottom: "max(0.4rem, env(safe-area-inset-bottom))" }}>
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
        {ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`dg-touch-target flex min-w-0 flex-col items-center justify-center rounded-xl px-1 py-1 text-[10px] font-medium transition ${active ? "bg-[color-mix(in_srgb,var(--org-primary)_14%,transparent)] text-white" : "text-slate-400 active:bg-[var(--org-bg-surface-hover)] active:text-white"}`}><span aria-hidden className="text-lg leading-none">{item.glyph}</span><span className="mt-1 truncate">{item.label}</span></Link>;
        })}
        <button type="button" onClick={onMenuClick} aria-label="Open all navigation" className="dg-touch-target flex min-w-0 flex-col items-center justify-center rounded-xl px-1 py-1 text-[10px] font-medium text-slate-400 transition active:bg-[var(--org-bg-surface-hover)] active:text-white"><span aria-hidden className="text-lg leading-none">☰</span><span className="mt-1">More</span></button>
      </div>
    </nav>
  );
}
