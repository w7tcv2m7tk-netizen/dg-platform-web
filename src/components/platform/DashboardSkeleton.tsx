export function DashboardSkeleton() {
  return (
    <>
      <header className="border-b border-slate-800 px-8 py-6">
        <div className="h-5 w-48 animate-pulse rounded bg-slate-800" />
        <div className="mt-3 h-8 w-72 animate-pulse rounded bg-slate-800" />
        <div className="mt-4 flex gap-4">
          <div className="h-10 w-40 animate-pulse rounded bg-slate-800" />
          <div className="h-4 w-24 animate-pulse rounded bg-slate-800/60" />
        </div>
      </header>
      <main className="flex-1 space-y-6 p-8">
        <div className="h-28 animate-pulse rounded-xl border border-slate-800 bg-slate-900/50" />
        <div className="h-48 animate-pulse rounded-xl border border-slate-800 bg-slate-900/50" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border border-slate-800 bg-slate-900/50"
            />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-40 animate-pulse rounded-xl border border-slate-800 bg-slate-900/50" />
          <div className="h-40 animate-pulse rounded-xl border border-slate-800 bg-slate-900/50" />
        </div>
      </main>
    </>
  );
}

export function PageSkeleton({ titleWidth = "w-48" }: { titleWidth?: string }) {
  return (
    <>
      <header className="border-b border-slate-800 px-8 py-5">
        <div className={`h-8 ${titleWidth} animate-pulse rounded bg-slate-800`} />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-slate-800/60" />
      </header>
      <main className="flex-1 p-8">
        <div className="h-64 animate-pulse rounded-xl border border-slate-800 bg-slate-900/50" />
      </main>
    </>
  );
}
