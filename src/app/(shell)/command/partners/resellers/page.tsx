import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Legacy route — Acquisition Partners is the canonical division name. */
export default function LegacyResellersRedirectPage() {
  redirect("/command/partners/acquisition");
}
