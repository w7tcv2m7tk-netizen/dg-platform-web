import { redirect } from "next/navigation";

/** Support Command module deferred — redirect only (no fake UI). */
export default function CommandSupportRedirectPage() {
  redirect("/support");
}
