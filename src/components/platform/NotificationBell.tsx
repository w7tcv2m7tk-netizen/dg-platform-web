"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

type NotificationItem = {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

type PanelPos = {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
};

const PANEL_WIDTH = 320;
const PANEL_GAP = 8;
const VIEWPORT_PAD = 8;

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

function positionPanel(anchor: DOMRect): PanelPos {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(PANEL_WIDTH, vw - VIEWPORT_PAD * 2);

  let left = anchor.right - width;
  left = Math.max(VIEWPORT_PAD, Math.min(left, vw - width - VIEWPORT_PAD));

  const spaceBelow = vh - anchor.bottom - PANEL_GAP - VIEWPORT_PAD;
  const spaceAbove = anchor.top - PANEL_GAP - VIEWPORT_PAD;
  const openAbove = spaceBelow < 240 && spaceAbove > spaceBelow;

  if (openAbove) {
    return {
      bottom: vh - anchor.top + PANEL_GAP,
      left,
      width,
      maxHeight: Math.max(160, spaceAbove),
    };
  }

  return {
    top: anchor.bottom + PANEL_GAP,
    left,
    width,
    maxHeight: Math.max(160, spaceBelow),
  };
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [panelPos, setPanelPos] = useState<PanelPos | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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

  const updatePosition = useCallback(() => {
    const el = buttonRef.current;
    if (!el) return;
    setPanelPos(positionPanel(el.getBoundingClientRect()));
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  useLayoutEffect(() => {
    if (!open) {
      setPanelPos(null);
      return;
    }
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
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
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
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

      {open && panelPos ? (
        <div
          role="dialog"
          aria-label="Notifications"
          className="fixed z-[100] overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-xl"
          style={{
            top: panelPos.top,
            bottom: panelPos.bottom,
            left: panelPos.left,
            width: panelPos.width,
            maxHeight: panelPos.maxHeight,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-3 py-2">
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
          <ul className="min-h-0 flex-1 overflow-y-auto">
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
          <div className="shrink-0 border-t border-slate-800 px-3 py-2">
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
