import Link from "next/link";
import {
  GEN2_CHECKLIST_ITEMS,
  gen2ChecklistStats,
  getGen2OnboardingProgress,
} from "@dg/platform-core";

/** Persistent getting-started checklist until Gen 2 onboarding is complete. */
export async function Gen2OnboardingChecklistBanner({
  organisationId,
}: {
  organisationId: string;
}) {
  const progress = await getGen2OnboardingProgress(organisationId);
  if (progress.completedAt) return null;

  const stats = gen2ChecklistStats(progress);
  if (stats.done === 0 && progress.currentStep === "welcome") {
    return (
      <div className="mb-6 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-300">
          Continue your setup
        </p>
        <p className="mt-1 text-sm text-slate-200">
          Finish Gen 2 onboarding to activate your trial and configure DigitalGate.
        </p>
        <Link
          href="/onboarding"
          className="mt-3 inline-block rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          Continue setup
        </Link>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Getting started
          </p>
          <p className="mt-1 text-sm text-slate-300">
            {stats.done} / {stats.total} complete
          </p>
        </div>
        <Link href="/onboarding" className="text-sm text-sky-400 hover:underline">
          Continue setup →
        </Link>
      </div>
      <ul className="mt-3 grid gap-1 sm:grid-cols-2">
        {GEN2_CHECKLIST_ITEMS.slice(0, 8).map((item) => {
          const done =
            ("step" in item &&
              item.step &&
              progress.completedSteps.includes(item.step)) ||
            Boolean(progress.checklist?.[item.id]);
          return (
            <li key={item.id} className="flex items-center gap-2 text-xs text-slate-400">
              <span className={done ? "text-emerald-400" : "text-slate-600"}>
                {done ? "✓" : "○"}
              </span>
              {item.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
