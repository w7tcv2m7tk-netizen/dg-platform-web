import { redirect } from "next/navigation";

/** Quotes live in Commerce — do not duplicate under Services. */
export default function ServicesQuotesRedirectPage() {
  redirect("/apps/commerce/quotes");
}
