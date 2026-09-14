"use client";

import type { ReactNode } from "react";
import { useState } from "react";

type SetupPage = "setup" | "operating" | "preparation";

const pages: Array<{ id: SetupPage; label: string; eyebrow: string }> = [
  { id: "setup", label: "Setup", eyebrow: "Core setup" },
  { id: "operating", label: "Operating profile", eyebrow: "Business fit" },
  { id: "preparation", label: "Platform preparation", eyebrow: "Final preparation" },
];

export function VipOnboardingPager({
  setup,
  operatingProfile,
  platformPreparation,
}: {
  setup: ReactNode;
  operatingProfile: ReactNode;
  platformPreparation: ReactNode;
}) {
  const [page, setPage] = useState<SetupPage>("setup");
  const activeIndex = pages.findIndex((item) => item.id === page);

  return (
    <div className="w-full">
      <nav
        aria-label="DigitalGate setup pages"
        className="mx-auto mb-6 flex w-fit max-w-full items-center gap-1 rounded-full border border-violet-300/15 bg-white/[0.035] p-1 shadow-lg shadow-black/10 backdrop-blur-xl"
      >
        {pages.map((item, index) => {
          const active = item.id === page;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setPage(item.id)}
              aria-current={active ? "step" : undefined}
              className={`min-h-10 rounded-full px-3.5 py-2 text-left transition sm:px-4 ${
                active
                  ? "bg-violet-600 text-white shadow-md shadow-violet-950/30"
                  : "text-white/50 hover:bg-white/[0.05] hover:text-white/75"
              }`}
            >
              <span className="mr-2 text-[10px] font-semibold opacity-60">{index + 1}</span>
              <span className="text-xs font-semibold sm:text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="min-w-0">
        {page === "setup" ? (
          <div className="[&_.dg-page-header]:mx-4 [&_.dg-page-header]:rounded-2xl [&_.dg-page-header]:border [&_.dg-page-header]:border-violet-300/15 [&_.dg-page-header]:bg-white/[0.035] [&_.dg-page-header]:shadow-lg [&_.dg-page-header]:shadow-black/10 sm:[&_.dg-page-header]:mx-6">
            {setup}
          </div>
        ) : null}
        {page === "operating" ? operatingProfile : null}
        {page === "preparation" ? (
          <div className="[&>section>div:first-child>div:first-child>p:first-child]:text-[0px] [&>section>div:first-child>div:first-child>p:first-child]:after:text-xs [&>section>div:first-child>div:first-child>p:first-child]:after:font-semibold [&>section>div:first-child>div:first-child>p:first-child]:after:uppercase [&>section>div:first-child>div:first-child>p:first-child]:after:tracking-[0.18em] [&>section>div:first-child>div:first-child>p:first-child]:after:text-sky-300 [&>section>div:first-child>div:first-child>p:first-child]:after:content-['Platform_preparation']">
            {platformPreparation}
          </div>
        ) : null}
      </div>

      <div className="mx-auto mt-5 flex max-w-4xl items-center justify-between gap-3 px-1">
        <button
          type="button"
          disabled={activeIndex === 0}
          onClick={() => setPage(pages[Math.max(0, activeIndex - 1)]!.id)}
          className="min-h-10 rounded-full border border-white/10 bg-white/[0.03] px-4 text-xs font-semibold text-white/60 transition hover:bg-white/[0.07] hover:text-white disabled:pointer-events-none disabled:opacity-0"
        >
          Back
        </button>
        <p className="hidden text-[11px] text-white/30 sm:block">{pages[activeIndex]?.eyebrow}</p>
        <button
          type="button"
          disabled={activeIndex === pages.length - 1}
          onClick={() => setPage(pages[Math.min(pages.length - 1, activeIndex + 1)]!.id)}
          className="min-h-10 rounded-full border border-violet-300/20 bg-violet-500/[0.08] px-4 text-xs font-semibold text-violet-100 transition hover:bg-violet-500/[0.14] disabled:pointer-events-none disabled:opacity-0"
        >
          Next setup page
        </button>
      </div>
    </div>
  );
}
