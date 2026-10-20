import "server-only";
import Stripe from "stripe";
import { randomUUID } from "node:crypto";
import { CheckoutTemporarilyUnavailable } from "./checkout-creation-gate";

/** Called only after durable admission, with its immutable absolute expiry.
 * Stripe validates the 30-minute minimum at creation, not at DB admission.
 * A lost response may hide an accepted session; never renew or start a new send here.
 */
export async function createAdmittedPlatformSession(
  stripe: Stripe,
  parameters: Stripe.Checkout.SessionCreateParams,
) {
  try {
    // The installed SDK can replay a connection-closed request even with zero
    // normal retries. Bind that replay to this send's unchanged body and key.
    return await stripe.checkout.sessions.create(parameters, {
      maxNetworkRetries: 0, idempotencyKey: `platform-checkout-admission-${randomUUID()}`,
    });
  } catch (error) {
    const expiryRejected = error instanceof Stripe.errors.StripeInvalidRequestError &&
      error.statusCode === 400 && error.param === "expires_at";
    // Only an explicit provider validation rejection proves this send failed.
    // Time elapsed locally cannot distinguish rejection from a lost response.
    throw new CheckoutTemporarilyUnavailable(expiryRejected ? "expiry_rejected" : "unknown");
  }
}
