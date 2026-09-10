import { redirect } from "next/navigation";

export default function ConnectionsAliasPage() {
  redirect("/dashboard/settings/connected-services");
}
