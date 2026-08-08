"use client";

import { useCallback, useState, useTransition } from "react";

/**
 * Instant pending UI for saves / clicks — marks pending synchronously,
 * runs the async work, then clears. Use with startTransition for refreshes.
 */
export function usePendingAction() {
  const [pending, setPending] = useState(false);
  const [isRefreshing, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (action: () => Promise<void>) => {
    setPending(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      throw err;
    } finally {
      setPending(false);
    }
  }, []);

  return {
    pending: pending || isRefreshing,
    error,
    setError,
    run,
    startTransition,
  };
}
