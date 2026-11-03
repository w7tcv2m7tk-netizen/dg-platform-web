import { isCanonicalDemoOrganisation } from "./types";

export type DemoAccessGrant = "customer" | "partner";

export function demoMembershipRole(access: DemoAccessGrant): "demo:customer" | "demo:partner" {
  if (access === "customer") return "demo:customer";
  if (access === "partner") return "demo:partner";
  throw new Error("Unsupported demo access");
}

export function assertDemoResetTarget(input: {
  name?: string | null;
  slug?: string | null;
  status?: string | null;
  settings?: unknown;
}): void {
  if (!isCanonicalDemoOrganisation(input)) {
    throw new Error("Refusing to reset a non-demo organisation");
  }
}
