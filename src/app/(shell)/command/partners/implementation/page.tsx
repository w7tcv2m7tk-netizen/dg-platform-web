import { redirect } from "next/navigation";

/** Legacy path — Delivery Partner invitations live under Partners → Delivery. */
export default function ImplementationPartnersRedirectPage() {
  redirect("/command/delivery/invitations");
}
