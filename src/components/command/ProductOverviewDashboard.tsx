import Link from "next/link";
import {
  getCommandFeatureFlagsOverview,
  getCommerciallyReadyV1Summary,
  listOpenSupportConversations,
} from "@dg/platform-core";

import { OperatorMetricStrip } from "@/components/command/OperatorMetricStrip";

const LINKS = [
  {
    href: "/command/flags",
    title: "Feature Flags",
    description: "Cross-tenant rollout controls and beta programme toggles.",
  },
  {
    href: "/command/product/roadmap",
    title: "Roadmap",
    description: "What exists, what is being built, and what is planned next.",
  },
  {
    href: "/command/product/releases",
    title: "Releases",
    description: "Curated launch and rollout docs — not a separate changelog CMS.",
  },
  {
    href: "/command/product/feedback",
    title: "Feedback",
    description: "Product feedback that needs triage or a decision.",
  },
] as const;

const BETA_FLAG_IDS = new Set([
  "re.beta",
  "acc.beta",
  "websites.builder",
  "infra.domains_beta",
  "pm.beta",
  "commercial.beta",
  "services.beta",
  "finance.beta",
]);

function countActiveBetas(
  orgs: { flags: Record<string, boolean> }[],
): number {
  let n = 0;
  for (const org of orgs) {
    for (const [id, on] of Object.entries(org.flags)) {
      if (on && (BETA_FLAG_IDS.has(id) || id.endsWith(".beta"))) n += 1;
    }
  }
  return n;
}

export async function ProductOverviewDashboard() {
  const db = Boolean(process.env.DATABASE_URL);
  const crv1 = getCommerciallyReadyV1Summary();

  const [flags, openFeedback] = db
    ? await Promise.all([
        getCommandFeatureFlagsOverview(),
        listOpenSupportConversations({ limit: 50 }),
      ])
    : [null, null];

  const activeBetas = flags ? countActiveBetas(flags.orgs) : null;

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm text-slate-400">
        Product strategy, capability rollout, roadmap, releases and customer feedback across
        DigitalGate.
      </p>

      <OperatorMetricStrip
        columnsClassName="sm:grid-cols-2 lg:grid-cols-5"
        metrics={[
          { label: "Shipped", value: crv1.done, tone: "emerald" },
          { label: "In progress", value: crv1.inProgress, tone: "sky" },
          {
            label: "Coming next",
            value: crv1.planned + crv1.scaffold,
            tone: "default",
          },
          {
            label: "Feedback",
            value: openFeedback !== null ? openFeedback.length : "—",
            tone: openFeedback && openFeedback.length > 0 ? "amber" : "default",
          },
          {
            label: "Active betas",
            value: activeBetas !== null ? activeBetas : "—",
            tone: activeBetas && activeBetas > 0 ? "sky" : "default",
          },
        ]}
      />

      <ul className="grid gap-3 sm:grid-cols-2">
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="block rounded-xl border border-slate-700/80 bg-slate-950/50 px-5 py-4 transition hover:border-sky-500/30"
            >
              <p className="font-medium text-white">{link.title}</p>
              <p className="mt-1 text-sm text-slate-400">{link.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
