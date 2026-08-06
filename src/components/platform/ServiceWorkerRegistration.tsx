"use client";

import { useEffect, useState } from "react";

export function ServiceWorkerRegistration() {
  const [online, setOnline] = useState(true);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => null);

    function handleOnline() {
      setOnline(true);
      setShowReconnected(true);
      window.setTimeout(() => setShowReconnected(false), 5000);
    }

    function handleOffline() {
      setOnline(false);
      setShowReconnected(false);
    }

    setOnline(navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (online && !showReconnected) return null;

  const tone = online
    ? "border-emerald-500/40 bg-emerald-950/95 text-emerald-200"
    : "border-amber-500/40 bg-amber-950/95 text-amber-200";

  return (
    <div
      className={`fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-3 rounded-lg border px-4 py-2.5 text-sm shadow-lg backdrop-blur ${tone}`}
      style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
      role="status"
      aria-live="polite"
    >
      {!online ? (
        <>You&rsquo;re offline — some features are unavailable</>
      ) : (
        <>
          Back online
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md bg-emerald-500 px-2 py-0.5 text-xs font-semibold text-emerald-950 hover:bg-emerald-400"
          >
            Refresh
          </button>
        </>
      )}
    </div>
  );
}
