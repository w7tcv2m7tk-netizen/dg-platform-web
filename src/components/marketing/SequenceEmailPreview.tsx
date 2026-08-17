"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { SequenceEmailPreviewItem } from "@dg/platform-core";

function kindLabel(kind: SequenceEmailPreviewItem["kind"]) {
  return kind === "marketing" ? "Marketing" : "Transactional";
}

export function SequenceEmailPreview({
  items,
  initialId,
}: {
  items: SequenceEmailPreviewItem[];
  initialId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requested = initialId || searchParams.get("id") || items[0]?.id;
  const [selectedId, setSelectedId] = useState(
    items.some((i) => i.id === requested) ? requested : items[0]?.id,
  );

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? items[0],
    [items, selectedId],
  );

  const groups = useMemo(() => {
    const order: SequenceEmailPreviewItem["group"][] = [
      "hideaway_circle",
      "guest_journey",
    ];
    return order.map((group) => ({
      group,
      label: items.find((i) => i.group === group)?.groupLabel ?? group,
      items: items.filter((i) => i.group === group),
    }));
  }, [items]);

  function select(id: string) {
    setSelectedId(id);
    const params = new URLSearchParams(searchParams.toString());
    params.set("id", id);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  if (!selected) {
    return <p className="p-8 text-slate-400">No sequence emails to preview.</p>;
  }

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-200">
      <header className="border-b border-white/10 px-4 py-4 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#B9A48A]">
          Currumbin Valley Hideaway
        </p>
        <h1 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
          Sequenced email review
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
          Sample guest <span className="text-slate-200">Alex</span>, Sanctuary Dome,
          18–21 Sep 2026. Circle emails are live. Guest stay journey is template
          preview only — it is not sending yet.
        </p>
      </header>

      <div className="grid lg:grid-cols-[minmax(16rem,22rem)_1fr]">
        <nav className="max-h-[calc(100vh-7.5rem)] overflow-y-auto border-b border-white/10 lg:border-b-0 lg:border-r">
          {groups.map((g) => (
            <div key={g.group} className="px-3 py-4">
              <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {g.label}
              </p>
              <ul className="mt-2 space-y-1">
                {g.items.map((item, index) => {
                  const active = item.id === selected.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => select(item.id)}
                        className={`w-full rounded-lg px-2.5 py-2 text-left text-sm transition ${
                          active
                            ? "bg-white/10 text-white"
                            : "text-slate-300 hover:bg-white/5"
                        }`}
                      >
                        <span className="flex items-start justify-between gap-2">
                          <span className="font-medium">
                            {index + 1}. {item.stepLabel}
                          </span>
                          {!item.live ? (
                            <span className="shrink-0 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-200">
                              Draft
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {item.when}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <main className="min-w-0 px-4 py-5 sm:px-6">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`rounded-full px-2 py-0.5 ${
                selected.kind === "marketing"
                  ? "bg-sky-500/15 text-sky-300"
                  : "bg-emerald-500/15 text-emerald-300"
              }`}
            >
              {kindLabel(selected.kind)}
            </span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-slate-300">
              {selected.live ? "Live sequence" : "Template only"}
            </span>
            <span className="text-slate-500">{selected.when}</span>
          </div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Subject</p>
          <h2 className="mt-1 text-lg font-semibold text-white">{selected.subject}</h2>
          <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-[#03050A]">
            <iframe
              title={selected.subject}
              srcDoc={selected.html}
              className="h-[min(78vh,920px)] w-full bg-[#070B14]"
            />
          </div>
        </main>
      </div>
    </div>
  );
}
