"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type CalendarItem = {
  id: string;
  kind: "task" | "consultation";
  startsAt: string;
  title: string;
  detail: string;
  href: string;
  overdue: boolean;
};

type View = "month" | "week" | "day" | "agenda";

function dayKey(date: Date | string, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(typeof date === "string" ? new Date(date) : date);
}

function dayHeading(iso: string, timeZone: string, long = true) {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone,
    weekday: long ? "long" : "short",
    day: "numeric",
    month: long ? "long" : "short",
    ...(long ? { year: "numeric" as const } : {}),
  }).format(new Date(iso));
}

function timeLabel(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

function startOfWeek(date: Date) {
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const mondayOffset = (next.getUTCDay() + 6) % 7;
  next.setUTCDate(next.getUTCDate() - mondayOffset);
  return next;
}

function itemCard(item: CalendarItem, timeZone: string, compact = false) {
  return (
    <Link
      key={item.id}
      href={item.href}
      className="block rounded-lg border border-slate-800 bg-slate-950/50 p-2 transition hover:border-slate-700 hover:bg-slate-900/80"
    >
      <div className="flex items-start gap-2">
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.kind === "task" ? "bg-sky-400" : "bg-violet-400"}`} />
        <div className="min-w-0">
          <p className={`${compact ? "text-xs" : "text-sm"} truncate font-medium text-white`}>
            {timeLabel(item.startsAt, timeZone)} · {item.title}
          </p>
          {!compact ? <p className="mt-0.5 truncate text-xs capitalize text-slate-500">{item.detail}</p> : null}
          {item.overdue ? <span className="mt-1 inline-block text-[10px] uppercase tracking-wide text-amber-300">Overdue</span> : null}
        </div>
      </div>
    </Link>
  );
}

export function CrmCalendar({ items, timeZone }: { items: CalendarItem[]; timeZone: string }) {
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const todayKey = dayKey(new Date(), timeZone);
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      const key = dayKey(item.startsAt, timeZone);
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return map;
  }, [items, timeZone]);

  const move = (direction: number) => {
    if (view === "day") setCursor((value) => addDays(value, direction));
    else if (view === "week") setCursor((value) => addDays(value, direction * 7));
    else if (view === "month") setCursor((value) => new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + direction, 1)));
  };

  const monthStart = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 1));
  const monthGridStart = startOfWeek(monthStart);
  const monthDays = Array.from({ length: 42 }, (_, index) => addDays(monthGridStart, index));
  const weekStart = startOfWeek(cursor);
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const cursorKey = dayKey(cursor, timeZone);
  const agendaGroups = Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {view !== "agenda" ? (
            <>
              <button type="button" onClick={() => move(-1)} className="dg-btn">←</button>
              <button type="button" onClick={() => setCursor(new Date())} className="dg-btn">Today</button>
              <button type="button" onClick={() => move(1)} className="dg-btn">→</button>
            </>
          ) : null}
        </div>
        <div className="flex rounded-lg border border-slate-800 bg-slate-950 p-1">
          {(["month", "week", "day", "agenda"] as View[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setView(option)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${view === option ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"}`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-sky-400" />Tasks</span>
        <span><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-violet-400" />Appointments / consultations</span>
        <span className="ml-auto">Times shown in {timeZone}</span>
      </div>

      {view === "month" ? (
        <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/30">
          <div className="border-b border-slate-800 px-4 py-3">
            <h2 className="font-semibold text-white">{new Intl.DateTimeFormat("en-AU", { month: "long", year: "numeric", timeZone: "UTC" }).format(monthStart)}</h2>
          </div>
          <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-950/70 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {weekDays.map((day) => <div key={day.toISOString()} className="px-1 py-2">{new Intl.DateTimeFormat("en-AU", { weekday: "short", timeZone: "UTC" }).format(day)}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {monthDays.map((day) => {
              const key = dayKey(day, "UTC");
              const dayItems = byDay.get(key) ?? [];
              const inMonth = day.getUTCMonth() === cursor.getUTCMonth();
              return (
                <button key={key} type="button" onClick={() => { setCursor(day); setView("day"); }} className={`min-h-28 border-b border-r border-slate-800 p-2 text-left align-top transition hover:bg-slate-900/60 ${inMonth ? "" : "bg-slate-950/40 opacity-50"}`}>
                  <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs ${key === todayKey ? "bg-sky-500 font-semibold text-white" : "text-slate-400"}`}>{day.getUTCDate()}</span>
                  <div className="mt-1 space-y-1">
                    {dayItems.slice(0, 3).map((item) => <div key={item.id} className="truncate text-[11px] text-slate-300"><span className={item.kind === "task" ? "text-sky-400" : "text-violet-400"}>●</span> {timeLabel(item.startsAt, timeZone)} {item.title}</div>)}
                    {dayItems.length > 3 ? <div className="text-[10px] text-slate-500">+{dayItems.length - 3} more</div> : null}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {view === "week" ? (
        <section className="grid gap-3 md:grid-cols-7">
          {weekDays.map((day) => {
            const key = dayKey(day, "UTC");
            const dayItems = byDay.get(key) ?? [];
            return <div key={key} className={`min-h-44 rounded-xl border p-3 ${key === todayKey ? "border-sky-500/50 bg-sky-500/5" : "border-slate-800 bg-slate-950/30"}`}><button type="button" onClick={() => { setCursor(day); setView("day"); }} className="mb-3 text-left text-xs font-semibold text-slate-300">{new Intl.DateTimeFormat("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(day)}</button><div className="space-y-2">{dayItems.length ? dayItems.map((item) => itemCard(item, timeZone, true)) : <p className="text-xs text-slate-600">No events</p>}</div></div>;
          })}
        </section>
      ) : null}

      {view === "day" ? (
        <section className="dg-card">
          <h2 className="font-semibold text-white">{new Intl.DateTimeFormat("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(cursor)}</h2>
          <div className="mt-4 space-y-2">{(byDay.get(cursorKey) ?? []).length ? (byDay.get(cursorKey) ?? []).map((item) => itemCard(item, timeZone)) : <p className="text-sm text-slate-500">Nothing scheduled for this day.</p>}</div>
        </section>
      ) : null}

      {view === "agenda" ? (
        <div className="space-y-4">
          {agendaGroups.length ? agendaGroups.map(([key, dayItems]) => <section key={key} className="dg-card"><h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">{dayHeading(dayItems[0].startsAt, timeZone)}</h2><div className="mt-3 space-y-2">{dayItems.map((item) => itemCard(item, timeZone))}</div></section>) : <div className="dg-card"><p className="text-sm text-slate-500">Nothing scheduled yet.</p></div>}
        </div>
      ) : null}
    </div>
  );
}
