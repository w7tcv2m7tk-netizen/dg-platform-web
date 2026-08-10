import { redirect } from "next/navigation";

/** Customers live in CRM Contacts — do not duplicate under Services. */
export default function ServicesCustomersRedirectPage() {
  redirect("/apps/crm/contacts");
}
