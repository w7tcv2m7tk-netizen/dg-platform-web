/** Keep this page's settings writes in order: both endpoints update one row. */
export function createOnboardingSaveQueue(request: typeof fetch = fetch) {
  let tail: Promise<unknown> = Promise.resolve();
  function run<T>(operation: () => Promise<T>): Promise<T> {
    const result = tail.then(operation);
    tail = result.catch(() => undefined);
    return result;
  }
  function saveDraft(
    profile: Record<string, unknown>,
    state: Record<string, unknown>,
    headers: Record<string, string>,
    isCurrent: () => boolean,
  ): Promise<boolean> {
    return run(async () => {
      if (!isCurrent()) return true;
      const options = { method: "PATCH", headers: { "Content-Type": "application/json", ...headers } };
      const profileResult = await request("/api/v1/onboarding/gen2", { ...options, body: JSON.stringify({ profile }) });
      if (!profileResult.ok) return false;
      // A navigation or newer render supersedes an older queued snapshot.
      if (!isCurrent()) return true;
      const stateResult = await request("/api/v1/onboarding/gen2/state", { ...options, body: JSON.stringify(state) });
      return stateResult.ok;
    });
  }
  return { run, saveDraft };
}
