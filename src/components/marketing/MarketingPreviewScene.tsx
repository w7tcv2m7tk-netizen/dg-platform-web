"use client";

import { buildBusinessOverview } from "@dg/platform-core";

import { BusinessOverviewDashboard } from "@/components/overview/BusinessOverviewDashboard";
import { MarketingPlatformChrome } from "@/components/marketing/MarketingPlatformChrome";
import { ChatWidgetProvider } from "@/components/platform/ChatWidgetProvider";
import { marketingOverviewInput } from "@/lib/marketing-screenshot-data";

function ScorePill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function TableRow({ cells }: { cells: string[] }) {
  return (
    <tr className="border-b border-slate-800/80">
      {cells.map((cell) => (
        <td key={cell} className="px-4 py-3 text-sm text-slate-200">
          {cell}
        </td>
      ))}
    </tr>
  );
}

export function MarketingPreviewScene({ scene }: { scene: string }) {
  if (scene === "overview") {
    const overview = buildBusinessOverview(marketingOverviewInput);
    return (
      <ChatWidgetProvider showFloatingChat={false}>
        <MarketingPlatformChrome
          activeNav="overview"
          title="Welcome back to Roe Realty"
          subtitle="Business Platform Overview"
        >
          <BusinessOverviewDashboard overview={overview} />
        </MarketingPlatformChrome>
      </ChatWidgetProvider>
    );
  }

  if (scene === "crm") {
    return (
      <MarketingPlatformChrome
        activeNav="crm"
        title="Contacts"
        subtitle="Roe Realty · 248 contacts in Platform"
      >
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="dg-card overflow-hidden p-0">
            <table className="w-full text-left">
              <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Stage</th>
                </tr>
              </thead>
              <tbody>
                <TableRow cells={["Sarah Mitchell", "sarah@example.com", "Vendor lead"]} />
                <TableRow cells={["James Chen", "j.chen@example.com", "Buyer enquiry"]} />
                <TableRow cells={["Emma Walsh", "emma@walshgroup.com.au", "Appraisal booked"]} />
                <TableRow cells={["Tom Bradley", "tom.b@example.com", "Listing live"]} />
              </tbody>
            </table>
          </div>
          <div className="dg-card">
            <h2 className="font-semibold text-white">Universal timeline</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              <li>Yesterday · Contact created — Sarah Mitchell</li>
              <li>Mon · Vendor appraisal booked — 42 Ocean Drive</li>
              <li>Sun · Email sent — buyer follow-up sequence</li>
              <li>Fri · Quote accepted — marketing package</li>
            </ul>
          </div>
        </div>
      </MarketingPlatformChrome>
    );
  }

  if (scene === "ai-studio") {
    return (
      <MarketingPlatformChrome activeNav="overview" title="AI Studio" subtitle="Ask DigitalGate AI">
        <div className="grid gap-4 md:grid-cols-2">
          {[
            "Summarise my pipeline",
            "Write a newsletter",
            "Analyse this suburb",
            "Create a landing page",
          ].map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-4 text-left text-sm font-medium text-slate-100"
            >
              {prompt}
            </button>
          ))}
        </div>
        <div className="dg-card mt-6">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-400">AI Business Advisor</p>
          <p className="mt-3 text-sm leading-relaxed text-slate-200">
            Good morning Ben. Your Business Health has improved to 82/100 this week. I recommend
            publishing this week&apos;s content update, requesting reviews from recent clients, and
            reviewing automation rules for follow-up gaps.
          </p>
        </div>
      </MarketingPlatformChrome>
    );
  }

  if (scene === "vendor-pipeline") {
    return (
      <MarketingPlatformChrome
        activeNav="vendor-pipeline"
        title="Vendor leads"
        subtitle="Roe Realty · Live from WordPress"
      >
        <div className="dg-card overflow-hidden p-0">
          <table className="w-full text-left">
            <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Property</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Value</th>
              </tr>
            </thead>
            <tbody>
              <TableRow cells={["42 Ocean Drive, Palm Beach", "Sarah Mitchell", "Appraisal booked", "$2.1M"]} />
              <TableRow cells={["18 Hedges Ave, Mermaid Beach", "David Park", "Listing prep", "$3.8M"]} />
              <TableRow cells={["7 Albatross Ave, Mermaid Waters", "Emma Walsh", "Under offer", "$1.65M"]} />
              <TableRow cells={["901 Pacific Pde, Currumbin", "Tom Bradley", "New lead", "$1.2M"]} />
            </tbody>
          </table>
        </div>
      </MarketingPlatformChrome>
    );
  }

  if (scene === "website-health") {
    return (
      <MarketingPlatformChrome
        activeNav="website-health"
        title="Website Health Centre"
        subtitle="roerealty.com.au · read-only"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ScorePill label="Performance" value={89} />
          <ScorePill label="SEO" value={82} />
          <ScorePill label="Schema" value={94} />
          <ScorePill label="Accessibility" value={86} />
        </div>
        <div className="dg-card mt-6">
          <h2 className="font-semibold text-white">Latest audit highlights</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            <li>Core Web Vitals within Google thresholds on mobile</li>
            <li>LocalBusiness schema detected on homepage</li>
            <li>3 image assets recommended for next-gen formats</li>
          </ul>
        </div>
      </MarketingPlatformChrome>
    );
  }

  if (scene === "ai-visibility") {
    return (
      <MarketingPlatformChrome
        activeNav="ai-visibility"
        title="AI Visibility Score™"
        subtitle="Recommendation readiness across AI search"
      >
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-950/40 to-slate-900 p-6 text-center">
            <p className="text-sm text-blue-200">Overall score</p>
            <p className="mt-2 text-5xl font-bold text-white">81</p>
            <p className="mt-2 text-xs text-slate-400">↑ +6 this month</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <ScorePill label="Brand mentions" value={78} />
            <ScorePill label="Structured data" value={86} />
            <ScorePill label="Content freshness" value={74} />
            <ScorePill label="Authority signals" value={83} />
          </div>
        </div>
      </MarketingPlatformChrome>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
      Unknown preview scene
    </div>
  );
}
