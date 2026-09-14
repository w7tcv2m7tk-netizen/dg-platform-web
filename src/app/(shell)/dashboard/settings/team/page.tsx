import { redirect } from "next/navigation";

/** Team management lives in Core → Business → Team. */
export default function TeamSettingsPage() {
  redirect("/dashboard/team");
}
