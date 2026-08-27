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

/** Journey-ordered navigation into growth capabilities — not marketing blurbs. */
export function GrowthEngineCapabilityGrid({ groups }: { groups: GrowthCapabilityGroup[] }) {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
          Growth capabilities
        </p>
        <h2 className="mt-1 text-lg font-semibold text-white">Work the loop</h2>
        <p className="mt-1 text-sm text-slate-400">
          Discovery, audit, scoring, follow-up and conversion — one connected system.
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

export const OPERATOR_CAPABILITY_GROUPS: GrowthCapabilityGroup[] = [
  {
    phase: "Find",
    cards: [
      {
        title: "Business Discovery",
        description: "Find and organise potential customers.",
        href: "/apps/prospecting/discovery",
      },
    ],
  },
  {
    phase: "Understand",
    cards: [
      {
        title: "AI Audit Engine™",
        description: "Analyse their digital presence and business signals.",
        href: "/command/growth-engine/audits",
      },
      {
        title: "Opportunity Reports",
        description: "Turn analysis into a clear commercial opportunity.",
        href: "/command/growth-engine/reports",
      },
    ],
  },
  {
    phase: "Engage",
    cards: [
      {
        title: "Smart Follow-Up",
        description: "Know who needs attention and what to do next.",
        href: "/command/growth-engine/follow-ups",
      },
      {
        title: "Proposal Generator",
        description: "Turn qualified opportunities into proposals.",
        href: "/command/growth-engine/proposals",
      },
    ],
  },
  {
    phase: "Convert",
    cards: [
      {
        title: "Prospect Pipeline",
        description: "Move prospects through qualification and conversion.",
        href: "/command/growth-engine/pipeline",
      },
      {
        title: "Conversion Dashboard",
        description: "Understand the funnel and what's producing results.",
        href: "/command/growth-engine/conversions",
      },
    ],
  },
];

export const TENANT_CAPABILITY_GROUPS: GrowthCapabilityGroup[] = [
  {
    phase: "Find",
    cards: [
      {
        title: "Business Discovery",
        description: "Find and organise potential customers.",
        href: "/apps/prospecting/discovery",
      },
    ],
  },
  {
    phase: "Understand",
    cards: [
      {
        title: "Opportunity Scoring™",
        description: "Analyse fit, need, reachability and commercial potential.",
        href: "/apps/prospecting/scores",
      },
      {
        title: "Activity",
        description: "Calls, messages, notes and follow-ups across the pipeline.",
        href: "/apps/prospecting/activity",
      },
    ],
  },
  {
    phase: "Engage",
    cards: [
      {
        title: "Smart Follow-Up",
        description: "Know who needs attention and what to do next.",
        href: "/apps/prospecting/activity",
      },
    ],
  },
  {
    phase: "Convert",
    cards: [
      {
        title: "Prospect Pipeline",
        description: "Move prospects through qualification and conversion.",
        href: "/apps/prospecting/pipeline",
      },
      {
        title: "CRM",
        description: "The underlying customer relationship record.",
        href: "/apps/crm",
      },
    ],
  },
];
