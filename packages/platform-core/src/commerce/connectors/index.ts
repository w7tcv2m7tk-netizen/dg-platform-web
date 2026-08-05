import { registerPaymentConnector } from "./registry";
import { stripeConnectorManifest, stripePaymentConnector } from "./stripe";

let booted = false;

/** Register built-in payment connectors (Stripe first) */
export function bootPaymentConnectors() {
  if (booted) return;
  booted = true;
  registerPaymentConnector(stripePaymentConnector, stripeConnectorManifest);
}

export * from "./types";
export * from "./registry";
