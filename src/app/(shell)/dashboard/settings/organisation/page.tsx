import { redirect } from "next/navigation";

/** Legacy Settings → Organisation URL — Business Profile lives under Core → Business. */
export default function SettingsOrganisationPage() {
  redirect("/dashboard/business");
}
