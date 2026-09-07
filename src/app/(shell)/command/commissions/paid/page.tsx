import { redirect } from "next/navigation";

/** Compatibility route: commission workflow is canonical at /command/commissions. */
export default function PaidCommissionsRedirectPage() {
  redirect("/command/commissions");
}
