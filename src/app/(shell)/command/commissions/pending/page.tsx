import { redirect } from "next/navigation";

/** Compatibility route: commission workflow is canonical at /command/commissions. */
export default function PendingCommissionsRedirectPage() {
  redirect("/command/commissions");
}
