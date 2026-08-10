import { seedPlannedConnectorManifests } from "./types";

let booted = false;

/** Seed connector manifests once per isolate (mirrors bootPaymentConnectors). */
export function bootConnectorEngine(): void {
  if (booted) return;
  booted = true;
  seedPlannedConnectorManifests();
}

export function isConnectorEngineBooted(): boolean {
  return booted;
}
