import { connection } from "next/server";
import {
  getSalesWeekScoreboard,
  resolveSalesWeekPrompt,
} from "@dg/platform-core";

import { SalesWeekCockpit } from "@/components/command/SalesWeekCockpit";
import { getPlatformPageContext } from "@/lib/org-apps";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function CommandSalesWeekPage() {
  await connection();
  const { session } = await getPlatformPageContext();
  const prompt = resolveSalesWeekPrompt();
  const scoreboard = session?.organisationId
    ? await getSalesWeekScoreboard(session.organisationId)
    : await getSalesWeekScoreboard("");

  return <SalesWeekCockpit prompt={prompt} scoreboard={scoreboard} />;
}
