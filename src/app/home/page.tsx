import { redirect } from "next/navigation";

import { resolveAuthenticatedHome } from "@/lib/auth-home";

export const dynamic = "force-dynamic";

export default async function AuthenticatedHomePage() {
  redirect(await resolveAuthenticatedHome());
}
