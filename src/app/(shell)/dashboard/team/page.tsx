import { TeamManagementView } from "@/components/platform/TeamManagementView";

/** Core → Business → Team — keeps Business chrome (not Platform Settings). */
export default async function BusinessTeamPage() {
  return <TeamManagementView context="business" />;
}
