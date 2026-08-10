import { redirect } from "next/navigation";

/** Team membership lives in Settings — do not duplicate under Services. */
export default function ServicesTeamsRedirectPage() {
  redirect("/dashboard/settings/team");
}
