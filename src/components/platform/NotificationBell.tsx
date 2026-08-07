"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type NotificationItem = {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/notifications?limit=20");
      const json = await res.json().catch(() => null);
      if (res.ok && json?.data) {
        setItems(json.data.items ?? []);
        setUnreadCount(json.data.unreadCount ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function markAllRead() {
    await fetch("/api/v1/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_read", all: true }),
    });
    setUnreadCount(0);
    setItems((prev) =>
      prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })),
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void load();
        }}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg border dg-branded-surface text-slate-200 transition hover:text-white"
      >
        <BellIcon className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
            <p className="text-sm font-medium text-white">Notifications</p>
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-40"
              disabled={unreadCount === 0}
            >
              Mark all read
            </button>
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {loading && items.length === 0 ? (
              <li className="px-3 py-4 text-sm text-slate-500">Loading…</li>
            ) : items.length === 0 ? (
              <li className="px-3 py-4 text-sm text-slate-500">
                No notifications yet. CRM and referral events appear here.
              </li>
            ) : (
              items.map((n) => {
                const inner = (
                  <>
                    <p
                      className={
                        n.readAt
                          ? "text-sm text-slate-300"
                          : "text-sm font-medium text-white"
                      }
                    >
                      {n.title}
                    </p>
                    {n.body ? (
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {n.body}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[10px] text-slate-600">
                      {new Date(n.createdAt).toLocaleString("en-AU")}
                    </p>
                  </>
                );
                return (
                  <li
                    key={n.id}
                    className="border-b border-slate-900 last:border-0"
                  >
                    {n.href ? (
                      <Link
                        href={n.href}
                        onClick={() => setOpen(false)}
                        className="block px-3 py-2.5 hover:bg-slate-900"
                      >
                        {inner}
                      </Link>
                    ) : (
                      <div className="px-3 py-2.5">{inner}</div>
                    )}
                  </li>
                );
              })
            )}
          </ul>
          <div className="border-t border-slate-800 px-3 py-2">
            <Link
              href="/apps/crm/timeline"
              onClick={() => setOpen(false)}
              className="text-xs text-slate-400 hover:text-blue-400"
            >
              Open CRM timeline →
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
