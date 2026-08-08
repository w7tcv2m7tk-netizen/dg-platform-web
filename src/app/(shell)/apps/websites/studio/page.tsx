import { redirect } from "next/navigation";

/** Studio index → sites list (open a site for Studio) */
export default function StudioIndexPage() {
  redirect("/apps/websites");
}
