"use client";

import { useMemo, useState } from "react";
import { INDUSTRY_TAXONOMY, type Gen2OnboardingProgress } from "@dg/platform-core";

export function VipIndustryProfileSetup({
  initial,
  recommendedTemplate,
}: {
  initial: Gen2OnboardingProgress;
  recommendedTemplate?: string | null;
}) {
  const initialTemplates = initial.industryTemplates?.length
    ? initial.industryTemplates
    : recommendedTemplate
      ? [recommendedTemplate]
      : [];
  const [selected, setSelected] = useState<string[]>(initialTemplates);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const relevantGroups = useMemo(() => {
    const enabled = new Set(initial.industryApps ?? []);
    const matches = INDUSTRY_TAXONOMY.filter(
      (group) => enabled.has(group.id) || group.appIds.some((appId) => enabled.has(appId)),
    );
    if (matches.length) return matches;
    if (recommendedTemplate) {
      const group = INDUSTRY_TAXONOMY.find((item) => item.subIndustries.some((sub) => sub.id === recommendedTemplate));
      if (group) return [group];
    }
    return INDUSTRY_TAXONOMY;
  }, [initial.industryApps, recommendedTemplate]);

  function select(id: string, industryId: string) {
    setSelected((current) => {
      // Onboarding chooses one included primary sub-industry for each purchased
      // parent Industry App. Additional sub-industry Apps are activated later.
      const group = INDUSTRY_TAXONOMY.find((item) => item.id === industryId);
      const siblings = new Set(group?.subIndustries.map((sub) => sub.id) ?? []);
      return [...current.filter((item) => !siblings.has(item)), id];
    });
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/onboarding/gen2", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress: { industryTemplates: selected } }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(json.error?.message || "Could not save business type");
        return;
      }
      setMessage("Business type saved. Aida will tailor the operating workspace around this profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mx-4 mb-8 rounded-2xl border border-white/10 bg-white/[0.035] p-5 sm:mx-6 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Aida · Operating profile</p>
      <h2 className="mt-2 text-xl font-semibold text-white">What kind of business are we building?</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
        This is more specific than your Industry App. It controls the terminology, workflows and operating experience you see after setup.
      </p>

      <div className="mt-5 space-y-5">
        {relevantGroups.map((group) => (
          <div key={group.id}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="font-medium text-white">{group.name}</h3>
              <span className="text-xs text-white/35">Choose your primary profile</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {group.subIndustries.map((sub) => {
                const on = selected.includes(sub.id);
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => select(sub.id, group.id)}
                    className={`rounded-xl border p-4 text-left transition ${
                      on
                        ? "border-sky-400/50 bg-sky-500/10"
                        : "border-white/[0.08] bg-black/20 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-white">{sub.name}</span>
                      <span className={on ? "text-sky-300" : "text-white/25"}>{on ? "✓" : "○"}</span>
                    </div>
                    <p className="mt-1.5 text-xs leading-5 text-white/45">{sub.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-5">
        <p className="text-xs text-white/45">{message ?? "You can add another Industry App later without exposing irrelevant business types now."}</p>
        <button
          type="button"
          disabled={saving || selected.length === 0}
          onClick={() => void save()}
          className="min-h-11 rounded-full bg-sky-600 px-5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-40"
        >
          Save business type
        </button>
      </div>
    </section>
  );
}
