"use client";

import { useEffect, useRef, useState } from "react";

export function ServiceWorkerRegistration() {
  const [online, setOnline] = useState(true);
  const [showReconnected, setShowReconnected] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const waitingWorker = useRef<ServiceWorker | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    let refreshing = false;
    let pollId = 0;

    function onControllerChange() {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    }

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    void navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        registrationRef.current = reg;

        if (reg.waiting) {
          waitingWorker.current = reg.waiting;
          setUpdateReady(true);
        }

        reg.addEventListener("updatefound", () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              waitingWorker.current = reg.waiting;
              setUpdateReady(true);
            }
          });
        });

        pollId = window.setInterval(() => {
          void reg.update().catch(() => null);
        }, 60 * 60 * 1000);
      })
      .catch(() => null);

    function handleOnline() {
      setOnline(true);
      setShowReconnected(true);
      window.setTimeout(() => setShowReconnected(false), 5000);
      void registrationRef.current?.update().catch(() => null);
    }

    function handleOffline() {
      setOnline(false);
      setShowReconnected(false);
    }

    setOnline(navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      if (pollId) window.clearInterval(pollId);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  function applyUpdate() {
    const worker = waitingWorker.current;
    if (!worker) {
      window.location.reload();
      return;
    }
    worker.postMessage({ type: "SKIP_WAITING" });
  }

  if (updateReady) {
    return (
      <div
        className="fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-3 rounded-lg border border-sky-500/40 bg-slate-950/95 px-4 py-2.5 text-sm text-sky-100 shadow-lg backdrop-blur"
        style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
        role="status"
        aria-live="polite"
      >
        Update available
        <button
          type="button"
          onClick={applyUpdate}
          className="rounded-md bg-sky-400 px-2.5 py-0.5 text-xs font-semibold text-slate-950 hover:bg-sky-300"
        >
          Refresh
        </button>
      </div>
    );
  }

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
