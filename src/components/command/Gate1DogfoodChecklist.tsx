"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "dg-gate-1-checklist-v1";

type Item = {
  id: string;
  label: string;
  hint?: string;
  href?: string;
};

type Section = {
  id: string;
  title: string;
  intro?: string;
  items: Item[];
};

const SECTIONS: Section[] = [
  {
    id: "journey-roe",
    title: "Dogfood — Roe Realty",
    intro: "Walk the path as a real estate founding customer would. If a step dumps, lies, or needs you as glue → punch list it.",
    items: [
      { id: "roe-signup", label: "Signup → create / switch business", href: "/onboarding" },
      { id: "roe-profile", label: "Business Profile complete", href: "/dashboard/business" },
      { id: "roe-setup", label: "Setup guide / onboarding hub", href: "/onboarding" },
      { id: "roe-connect", label: "Connect something (WP / Google / Stripe)", href: "/dashboard/settings/connectors" },
      { id: "roe-contact", label: "Contact → opportunity → task", href: "/apps/crm" },
      { id: "roe-auto", label: "Automation fires (lead / opp / payment)", href: "/apps/automations" },
      { id: "roe-ai", label: "AI assist on a real record (honest fallback OK)", href: "/apps/crm" },
      { id: "roe-command", label: "Command Centre usable for this org", href: "/command" },
      { id: "roe-support", label: "Support / KB path (article + escalate)", href: "/support/help" },
      { id: "roe-billing", label: "Subscribe → billing portal (and cancel honesty)", href: "/dashboard/settings/billing" },
    ],
  },
  {
    id: "journey-cvh",
    title: "Dogfood — Currumbin Valley Hideaway",
    intro: "Acc ops path: units, availability, bookings, iCal. Don’t claim Airbnb Partner API.",
    items: [
      { id: "cvh-switch", label: "Switch to CVH org", href: "/dashboard" },
      { id: "cvh-units", label: "Units + iCal import/export URLs", href: "/apps/accommodation" },
      { id: "cvh-booking", label: "Create / delete a booking in Gen 2", href: "/apps/accommodation/bookings" },
      { id: "cvh-calendar", label: "Calendar + OTA sync without looped blocks", href: "/apps/accommodation/calendar" },
      { id: "cvh-billing", label: "Subscribe → portal on this org (if in scope)", href: "/dashboard/settings/billing" },
    ],
  },
  {
    id: "ops",
    title: "Ops smoke (production)",
    intro: "Code MVPs are shipped. These env/ops checks still block Gate 2.",
    items: [
      {
        id: "ops-stripe",
        label: "Stripe webhooks include subscription.updated + deleted",
        href: "/command/platform-health",
      },
      {
        id: "ops-sentry",
        label: "Sentry DSN on production",
        href: "/command/platform-health",
      },
      {
        id: "ops-resend",
        label: "Resend sending from DigitalGate domain",
      },
      {
        id: "ops-domain-sandbox",
        label: "DOMAIN_API_PATH_PREFIX=/sandbox on Vercel (honest vs Production)",
      },
      {
        id: "ops-wp",
        label: "WP plugin on Roe + CVH dogfood sites (capture / dual-write)",
      },
    ],
  },
  {
    id: "close",
    title: "Close Gate 1",
    intro: "Founding 10 outreach stays closed until P0/P1 are gone. Audience/content can run in parallel.",
    items: [
      { id: "close-punch", label: "Punch list written (P0–P3) from Roe + CVH passes" },
      { id: "close-p0p1", label: "Only P0 / P1 shipped — P2/P3 parked" },
      {
        id: "close-scope",
        label: "Founding offer IN/OUT card (no live REA publish / Domain Production as promise)",
        href: "/command/docs/commercially-ready-v1",
      },
      {
        id: "close-site",
        label: "Founding page live: /founding-customers/ (Oxygen paste)",
      },
    ],
  },
];

function loadChecked(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function Gate1DogfoodChecklist({ compact = false }: { compact?: boolean }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setChecked(loadChecked());
    setReady(true);
  }, []);

  const allIds = useMemo(() => SECTIONS.flatMap((s) => s.items.map((i) => i.id)), []);
  const doneCount = allIds.filter((id) => checked[id]).length;
  const total = allIds.length;
  const allDone = ready && doneCount === total;

  function toggle(id: string) {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore quota */
      }
      return next;
    });
  }

  const sections = compact ? SECTIONS.slice(0, 2) : SECTIONS;

  return (
    <section className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-5 py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-300/90">
            Internal Alpha
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">Gate 1 dogfood</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Close this before active Founding 10 selling. Ticks stay in this browser.
            {ready ? ` ${doneCount} of ${total} done.` : ""}
          </p>
        </div>
        <span
          className={`rounded-md px-2.5 py-1 text-xs font-medium ${
            allDone
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-amber-500/15 text-amber-200"
          }`}
        >
          {allDone ? "Gate 1 closeable" : "Not Gate 2 yet"}
        </span>
      </div>

      <div className={compact ? "mt-4 space-y-5" : "mt-6 space-y-8"}>
        {sections.map((section) => (
          <div key={section.id}>
            <h3 className="text-sm font-semibold text-white">{section.title}</h3>
            {section.intro && !compact ? (
              <p className="mt-1 text-xs text-slate-500">{section.intro}</p>
            ) : null}
            <ul className="mt-3 space-y-2">
              {section.items.map((item) => {
                const done = Boolean(checked[item.id]);
                const body = (
                  <>
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                        done ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-500"
                      }`}
                      aria-hidden
                    >
                      {done ? "✓" : "·"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-sm font-medium ${
                          done ? "text-slate-400 line-through" : "text-white"
                        }`}
                      >
                        {item.label}
                      </span>
                      {item.hint && !done ? (
                        <span className="mt-0.5 block text-xs text-slate-500">{item.hint}</span>
                      ) : null}
                    </span>
                  </>
                );
                return (
                  <li key={item.id} className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => toggle(item.id)}
                      className="flex min-w-0 flex-1 items-start gap-3 rounded-lg border border-slate-800/80 bg-slate-950/40 px-3 py-2.5 text-left transition hover:border-slate-600"
                    >
                      {body}
                    </button>
                    {item.href ? (
                      <Link
                        href={item.href}
                        className="shrink-0 self-center text-xs text-sky-400 hover:underline"
                      >
                        Open →
                      </Link>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {compact ? (
        <p className="mt-4 text-sm">
          <Link href="/command/gate-1" className="text-sky-300 hover:underline">
            Full Gate 1 checklist (ops smoke + close) →
          </Link>
        </p>
      ) : (
        <p className="mt-6 text-xs text-slate-500">
          Do not block Founding 10 on live REA publish or Domain Production. Audience / LinkedIn
          can run now. Active selling waits until P0/P1 are gone.{" "}
          <Link href="/command/docs/gate-1-dogfood" className="text-sky-400 hover:underline">
            Platform docs
          </Link>{" "}
          ·{" "}
          <Link href="/command/docs/commercially-ready-v1" className="text-sky-400 hover:underline">
            Commercially Ready v1
          </Link>
        </p>
      )}
    </section>
  );
}
