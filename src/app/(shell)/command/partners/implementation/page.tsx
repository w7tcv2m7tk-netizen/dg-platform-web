import { redirect } from "next/navigation";

/** Legacy path — Delivery invitations live under DigitalGate → Delivery. */
export default function ImplementationPartnersRedirectPage() {
  redirect("/command/delivery/invitations");
}
