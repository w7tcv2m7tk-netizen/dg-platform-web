import { connection } from "next/server";
import {
  getSalesWeekScoreboard,
  resolveSalesWeekPrompt,
} from "@dg/platform-core";

import { SalesWeekCockpit } from "@/components/command/SalesWeekCockpit";
import { requirePlatformOperatorContext } from "@/lib/platform-operator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function CommandSalesWeekPage() {
  await connection();
  const operator = await requirePlatformOperatorContext();
  const prompt = resolveSalesWeekPrompt();
  const scoreboard = await getSalesWeekScoreboard(operator.operatorOrganisationId);

  return <SalesWeekCockpit prompt={prompt} scoreboard={scoreboard} />;
}
