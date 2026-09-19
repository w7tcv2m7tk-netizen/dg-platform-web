import Link from "next/link";
import {
  GEN2_CHECKLIST_ITEMS,
  gen2ChecklistStats,
  getGen2OnboardingProgress,
} from "@dg/platform-core";
import { FirstLoginAidaHandover } from "@/components/onboarding/FirstLoginAidaHandover";

function firstActions(primaryIndustry?: string) {
  const common = [
    { label: "Ask Aida", href: "/dashboard/advisor", detail: "Get an immediate recommendation from your Business Brain." },
    { label: "Review your Apps", href: "/dashboard/apps", detail: "See the workspace Aida configured and add another industry if needed." },
  ];
  const industry: Record<string, { label: string; href: string; detail: string }> = {
    property: { label: "Open your pipeline", href: "/apps/crm/opportunities", detail: "Start with leads, opportunities and the property workflows prepared for you." },
    finance: { label: "Open your pipeline", href: "/apps/crm/opportunities", detail: "Review prospects and move the next finance opportunity forward." },
    services: { label: "Open CRM", href: "/apps/crm", detail: "Start with customers, enquiries and follow-up." },
    "accommodation-hospitality": { label: "Review growth", href: "/apps/marketing", detail: "Start with demand, direct enquiries and guest growth activity." },
    automotive: { label: "Open opportunities", href: "/apps/crm/opportunities", detail: "Review active enquiries and the next sales opportunities." },
    "creator-media": { label: "Review growth", href: "/apps/marketing", detail: "Start with audience, campaigns and growth opportunities." },
  };
  return [industry[primaryIndustry ?? ""] ?? { label: "Open CRM", href: "/apps/crm", detail: "Start with the customer and opportunity workspace." }, ...common];
}

/** Persistent getting-started checklist until onboarding is complete, then a one-time Aida handover. */
export async function Gen2OnboardingChecklistBanner({ organisationId }: { organisationId: string }) {
  const progress = await getGen2OnboardingProgress(organisationId);

  if (progress.completedAt) {
    if (progress.vipSetup?.firstLoginHandoverCompletedAt) return null;
    const configuredAreas = [
      ...(progress.operatingProfile?.recommendedDashboard ?? []).slice(0, 3),
      ...(progress.operatingProfile?.recommendedGrowthApps ?? []).slice(0, 3).map((id) => id.replaceAll("-", " ")),
    ];
    return (
      <FirstLoginAidaHandover
        organisationName="your business"
        industryLabel={progress.operatingProfile?.primaryIndustry?.replaceAll("-", " ")}
        configuredAreas={[...new Set(configuredAreas)]}
        actions={firstActions(progress.operatingProfile?.primaryIndustry)}
      />
    );
  }

  const stats = gen2ChecklistStats(progress);
  const workspaceConfigured = ["business-identity", "business-profile", "operating-profile", "goals", "plan", "apps", "platform-preparation"].every((step) => progress.completedSteps.includes(step));
  if (workspaceConfigured) return null;

  if (stats.done === 0 && progress.currentStep === "welcome") {
    return (
      <div className="mb-6 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">Continue your setup</p>
        <p className="mt-1 text-sm text-slate-200">Finish setup to configure DigitalGate around your business.</p>
        <Link href="/onboarding" className="mt-3 inline-block rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500">Continue setup</Link>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-2xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Getting started</p>
          <p className="mt-1 text-sm text-slate-300">{stats.done} / {stats.total} complete</p>
        </div>
        <Link href="/onboarding" className="text-sm text-violet-400 hover:underline">Continue setup →</Link>
      </div>
      <ul className="mt-3 grid gap-1 sm:grid-cols-2">
        {GEN2_CHECKLIST_ITEMS.slice(0, 8).map((item) => {
          const done = ("step" in item && item.step && progress.completedSteps.includes(item.step)) || Boolean(progress.checklist?.[item.id]);
          return <li key={item.id} className="flex items-center gap-2 text-xs text-slate-400"><span className={done ? "text-emerald-400" : "text-slate-600"}>{done ? "✓" : "○"}</span>{item.label}</li>;
        })}
      </ul>
    </div>
  );
}
