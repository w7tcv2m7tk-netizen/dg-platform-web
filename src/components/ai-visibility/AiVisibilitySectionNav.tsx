"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [
  { href: "/apps/ai-visibility", label: "Overview" },
  { href: "/apps/ai-visibility/presence", label: "AI Presence" },
  { href: "/apps/ai-visibility/prompts", label: "Prompts" },
  { href: "/apps/ai-visibility/competitors", label: "Competitors" },
  { href: "/apps/ai-visibility/citations", label: "Authority & Citations" },
  { href: "/apps/ai-visibility/opportunities", label: "Opportunities" },
  { href: "/apps/ai-visibility/technical", label: "Technical" },
];

export function AiVisibilitySectionNav() {
  const pathname = usePathname();
  const citationGuidance = pathname === "/apps/ai-visibility/citations";

  return (
    <>
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

      {citationGuidance ? (
        <section className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-200/80">Authority & citation next step</p>
          <h2 className="mt-2 font-semibold text-white">Verified source capture is not available from the current model-API runner</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
            DigitalGate will keep Authority and Citation Strength unavailable until a monitoring source genuinely captures citations and confirms completeness. It will not infer sources from an answer. You can still improve the entity, content and authority foundations that future observations depend on.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/apps/seo" className="rounded-lg bg-violet-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-violet-500">
              Improve authority foundations →
            </Link>
            <Link href="/dashboard/advisor?context=AI%20Visibility%20authority%20and%20citations" className="rounded-lg border border-slate-700 px-3.5 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800/60">
              Ask Aida what to improve →
            </Link>
          </div>
        </section>
      ) : null}
    </>
  );
}
