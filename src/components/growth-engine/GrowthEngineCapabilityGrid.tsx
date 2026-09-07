import Link from "next/link";

export type GrowthCapabilityCard = {
  title: string;
  description: string;
  href: string;
};

export type GrowthCapabilityGroup = {
  phase: string;
  cards: GrowthCapabilityCard[];
};

/** Journey-ordered navigation into growth capabilities — commercial machine, not CRM screens. */
export function GrowthEngineCapabilityGrid({ groups }: { groups: GrowthCapabilityGroup[] }) {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
          Growth Engine™
        </p>
        <h2 className="mt-1 text-lg font-semibold text-white">Acquire → Qualify → Convert</h2>
        <p className="mt-1 text-sm text-slate-400">
          One commercial machine. Capabilities below — not a second CRM.
        </p>
      </div>
      {groups.map((group) => (
        <div key={group.phase} className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-400/90">
            {group.phase}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {group.cards.map((card) => (
              <Link
                key={card.href + card.title}
                href={card.href}
                className="block rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-4 transition-colors hover:border-sky-500/45 hover:bg-slate-950/70"
              >
                <h3 className="font-semibold text-white">{card.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{card.description}</p>
                <p className="mt-3 text-xs text-sky-400">Open →</p>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

/** Command / DigitalGate GTM — full commercial machine. */
export const OPERATOR_CAPABILITY_GROUPS: GrowthCapabilityGroup[] = [
  {
    phase: "Acquire",
    cards: [
      {
        title: "Discovery",
        description: "Find potential businesses.",
        href: "/apps/prospecting/discovery",
      },
    ],
  },
  {
    phase: "Qualify",
    cards: [
      {
        title: "AI Audit Engine™",
        description: "Understand their digital position.",
        href: "/command/growth-engine/audits",
      },
      {
        title: "Opportunity Engine™",
        description: "Determine whether there is a genuine opportunity.",
        href: "/command/growth-engine/reports",
      },
    ],
  },
  {
    phase: "Convert",
    cards: [
      {
        title: "Pipeline",
        description: "Manage the commercial process.",
        href: "/command/growth-engine/pipeline",
      },
      {
        title: "Smart Follow-Up",
        description: "Make sure opportunities don't go cold.",
        href: "/command/growth-engine/follow-ups",
      },
      {
        title: "Proposal Generator",
        description: "Turn qualified opportunities into offers.",
        href: "/command/growth-engine/proposals",
      },
      {
        title: "Conversion Dashboard",
        description: "Measure the funnel.",
        href: "/command/growth-engine/conversions",
      },
    ],
  },
];

/** Tenant Sales — same machine; CRM is where relationships land after convert. */
export const TENANT_CAPABILITY_GROUPS: GrowthCapabilityGroup[] = [
  {
    phase: "Acquire",
    cards: [
      {
        title: "Discovery",
        description: "Find potential businesses.",
        href: "/apps/prospecting/discovery",
      },
    ],
  },
  {
    phase: "Qualify",
    cards: [
      {
        title: "AI Audit Engine™",
        description: "Run tenant-scoped digital presence audits and generate opportunity reports.",
        href: "/apps/prospecting/audits",
      },
      {
        title: "Opportunity Scoring™",
        description: "Determine whether there is a genuine opportunity.",
        href: "/apps/prospecting/scores",
      },
    ],
  },
  {
    phase: "Convert",
    cards: [
      {
        title: "Pipeline",
        description: "Manage the commercial process.",
        href: "/apps/prospecting/pipeline",
      },
      {
        title: "Activity",
        description: "Calls, notes, tasks and follow-ups — carries into CRM on convert.",
        href: "/apps/prospecting/activity",
      },
      {
        title: "Proposal Generator",
        description: "Turn qualified opportunities into tenant-owned offers and Commerce quotes.",
        href: "/apps/prospecting/proposals",
      },
      {
        title: "CRM",
        description: "Genuine business relationships after conversion.",
        href: "/apps/crm",
      },
    ],
  },
];
