import { redirect } from "next/navigation";

import { redirectUnlessStaffNetwork } from "@/lib/network-staff-gate";

/** Staff Network → Organisations maps to Customer Portfolio. */
export default async function NetworkOrganisationsPage() {
  await redirectUnlessStaffNetwork();
  redirect("/command/clients");
}
