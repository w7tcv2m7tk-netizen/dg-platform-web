import { redirect } from "next/navigation";

/** Compatibility route: commission workflow is canonical at /command/commissions. */
export default function ApprovedCommissionsRedirectPage() {
  redirect("/command/commissions");
}
