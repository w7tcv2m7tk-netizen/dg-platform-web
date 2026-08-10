import { redirect } from "next/navigation";

/** Audit Command module deferred — redirect only (no fake UI). */
export default function CommandAuditRedirectPage() {
  redirect("/dashboard/settings/audit");
}
