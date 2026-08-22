import Link from "next/link";

export function AnalyticsPageIntro({
  organisationName,
  active,
}: {
  organisationName: string;
  active: "/apps/analytics" | "/apps/analytics/dashboard" | "/apps/analytics/reports" | "/apps/analytics/connectors";
}) {
  const titles: Record<typeof active, string> = {
    "/apps/analytics": "Analytics",
    "/apps/analytics/dashboard": "Dashboard",
    "/apps/analytics/reports": "Reports",
    "/apps/analytics/connectors": "Data sources",
  };

  const subtitles: Record<typeof active, string> = {
    "/apps/analytics":
      "Understand the numbers behind your business. Explore performance across customers, revenue, pipeline, marketing, digital presence and operations using live data from your connected systems.",
    "/apps/analytics/dashboard":
      "Customisable visual dashboards. Start with predefined views for executive, sales, marketing and operations teams.",
    "/apps/analytics/reports":
      "Generated and scheduled reports — formal, reportable views of business performance with AI commentary where data supports it.",
    "/apps/analytics/connectors":
      "Where the numbers come from. Connect business systems to deepen Analytics and your Digital Twin.",
  };

  return (
    <>
      <Link href="/dashboard" className="text-sm text-sky-400 hover:underline">
        ← Command Centre
      </Link>
      <p className="mt-3 text-xs font-medium uppercase tracking-widest text-blue-400/90">
        Growth · Analytics
      </p>
      <h1 className="mt-2 text-2xl font-bold text-white">{titles[active]}</h1>
      <p className="mt-2 max-w-3xl text-sm text-slate-400">{subtitles[active]}</p>
      <p className="mt-1 text-xs text-slate-500">{organisationName}</p>
    </>
  );
}

export function AnalyticsHealthReference({ score }: { score: number | null }) {
  if (score == null) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3">
      <div>
        <p className="text-xs text-slate-500">Business Health</p>
        <p className="mt-0.5 text-lg font-semibold text-emerald-300">{score}/100</p>
      </div>
      <Link href="/dashboard/health" className="text-sm text-sky-400 hover:underline">
        View health →
      </Link>
    </div>
  );
}

export function AnalyticsPhilosophyNote() {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/30 px-4 py-3 text-sm text-slate-400">
      Analytics shows the evidence. Intelligence interprets it. AI Advisor explains what it means.
      Command Centre turns it into action.
    </div>
  );
}
