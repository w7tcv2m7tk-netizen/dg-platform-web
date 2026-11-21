export type DailyThreeSummary = { target: number; prepared: number; remaining: number };

export function buildDailyThreeSummary(ready: number, target = 3): DailyThreeSummary {
  const safeTarget = Math.max(1, Math.floor(target));
  const safeReady = Number.isFinite(ready) ? Math.max(0, Math.floor(ready)) : 0;
  const prepared = Math.min(safeTarget, safeReady);
  return { target: safeTarget, prepared, remaining: Math.max(0, safeTarget - prepared) };
}

export function dedupeByKey<T>(rows: readonly T[], key: (row: T) => string | null | undefined): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    const id = key(row);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(row);
  }
  return out;
}
