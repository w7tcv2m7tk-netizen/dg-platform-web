import { getPlatformOperatorContext } from "@/lib/platform-operator";

export const AUTH_ROLE_AWARE_HOME_URL = "/home";

export async function resolveAuthenticatedHome(): Promise<"/command" | "/dashboard"> {
  const operator = await getPlatformOperatorContext();
  return operator ? "/command" : "/dashboard";
}
