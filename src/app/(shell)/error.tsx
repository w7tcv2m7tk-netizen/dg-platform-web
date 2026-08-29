"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Shell-level error boundary — keeps sidebar mounted when a page crashes.
 * Prefer this over root global-error for recoverable app-route failures.
 */
export default function ShellError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="dg-page-main mx-auto flex min-h-[40vh] max-w-lg flex-col justify-center gap-4 px-6">
      <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
      <p className="text-sm text-slate-400">
        This page failed to load. You can try again, or go back to Business Overview.
      </p>
      {error.digest ? (
        <p className="font-mono text-xs text-slate-500">Digest: {error.digest}</p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          Try again
        </button>
        <a
          href="/dashboard"
          className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:border-sky-500"
        >
          Business Overview
        </a>
      </div>
    </main>
  );
}
