"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * App Router root error boundary — reports to Sentry when DSN is configured.
 */
export default function GlobalError({
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
    <html lang="en">
      <body className="bg-slate-950 text-slate-100">
        <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6">
          <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
          <p className="text-sm text-slate-400">
            The error was recorded when observability is configured. You can try again, or
            contact support on a business day.
          </p>
          {error.digest ? (
            <p className="font-mono text-xs text-slate-500">Digest: {error.digest}</p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            className="w-fit rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
