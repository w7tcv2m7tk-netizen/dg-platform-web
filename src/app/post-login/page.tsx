import { redirect } from "next/navigation";

import { getPlatformOperatorContext } from "@/lib/platform-operator";

/** Resolve the default signed-in landing without changing explicit deep links. */
export default async function PostLoginPage() {
  const operator = await getPlatformOperatorContext();
  redirect(operator ? "/command" : "/dashboard");
}
