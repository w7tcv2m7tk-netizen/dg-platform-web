import type { PaymentConnector, PaymentConnectorManifest } from "./types";

const connectors = new Map<string, PaymentConnector>();
const manifests = new Map<string, PaymentConnectorManifest>();

export function registerPaymentConnector(
  connector: PaymentConnector,
  manifest: PaymentConnectorManifest,
) {
  connectors.set(connector.id, connector);
  manifests.set(connector.id, manifest);
}

export function getPaymentConnector(id: string): PaymentConnector | undefined {
  return connectors.get(id);
}

export function listPaymentConnectors(): PaymentConnectorManifest[] {
  return [...manifests.values()];
}

export function requirePaymentConnector(id: string): PaymentConnector {
  const connector = getPaymentConnector(id);
  if (!connector) {
    throw new Error(`Payment connector not registered: ${id}`);
  }
  return connector;
}

/** Default provider when org has no explicit preference */
export function defaultPaymentProviderId(): string {
  if (connectors.has("stripe")) return "stripe";
  const first = connectors.keys().next().value;
  if (!first) {
    throw new Error("No payment connectors registered");
  }
  return first;
}
