"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [
  { href: "/apps/ai-visibility", label: "Overview" },
  { href: "/apps/ai-visibility/presence", label: "AI Presence" },
  { href: "/apps/ai-visibility/prompts", label: "Prompts" },
  { href: "/apps/ai-visibility/competitors", label: "Competitors" },
  { href: "/apps/ai-visibility/citations", label: "Citations" },
  { href: "/apps/ai-visibility/opportunities", label: "Opportunities" },
  { href: "/apps/ai-visibility/technical", label: "Technical" },
];

export function AiVisibilitySectionNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="AI Visibility sections"
      className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40 px-2 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div className="flex min-w-max gap-1">
        {sections.map((section) => {
          const active =
            section.href === "/apps/ai-visibility"
              ? pathname === section.href
              : pathname === section.href || pathname.startsWith(`${section.href}/`);
          return (
            <Link
              key={section.href}
              href={section.href}
              className={`rounded-lg px-3 py-2 text-sm transition ${
                active
                  ? "bg-violet-500/15 font-medium text-violet-200"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
              }`}
            >
              {section.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
