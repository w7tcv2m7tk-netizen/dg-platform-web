import { redirect } from "next/navigation";

/** Canonical CRM home — sub-routes are the real surfaces. */
export default function CrmIndexPage() {
  redirect("/apps/crm/contacts");
}
