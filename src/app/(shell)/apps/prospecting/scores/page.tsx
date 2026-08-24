import Link from "next/link";

import { ProspectingSubnav } from "@/components/prospecting/ProspectingSubnav";
import { redirectStaffProspectingIfNeeded } from "@/lib/prospecting-command-redirect";

const DIMENSIONS = [
  "Fit",
  "Need",
  "Reachability",
  "Commercial",
  "Weakness",
] as const;

export default async function ProspectingScoresPage() {
  await redirectStaffProspectingIfNeeded("/apps/prospecting/scores");
  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Opportunity scores</h1>
        <p className="text-sm text-slate-400">
          Fit × Need × Reachability × Commercial × Weakness — who to contact and why.
        </p>
        <ProspectingSubnav active="/apps/prospecting/scores" />
      </header>
      <main className="dg-page-main space-y-6">
        <div className="dg-card space-y-3">
          <h2 className="font-semibold text-white">Score model</h2>
          <ul className="flex flex-wrap gap-2">
            {DIMENSIONS.map((dim) => (
              <li
                key={dim}
                className="rounded-full border border-slate-700 bg-slate-950/60 px-3 py-1 text-sm text-slate-200"
              >
                {dim}
              </li>
            ))}
          </ul>
          <p className="text-sm text-slate-400">
            Digital Presence signals (website, SEO, AI Visibility) feed weakness and opportunity
            strength. AI recommendations surface the next best action for the human team.
          </p>
        </div>
        <div className="dg-card space-y-2">
          <p className="text-sm text-slate-300">
            After a sales or qualification call, voice{" "}
            <Link
              href="/apps/ai-communications/call-centre"
              className="text-sky-400 hover:underline"
            >
              Opportunity Intelligence
            </Link>{" "}
            also writes structured scores onto CRM Opportunities.
          </p>
        </div>
      </main>
    </>
  );
}
