import "server-only";
import { createHash } from "node:crypto";
import type { Prisma } from "@dg/database";
import type Stripe from "stripe";
import { PLATFORM_COMMERCIAL_PLANS } from "./commercial-catalogue";

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).filter(([,v]) => v !== undefined)
    .sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  return JSON.stringify(value);
}
export function checkoutAdmissionTermsHash(terms: unknown): string {
  return createHash("sha256").update(canonical(terms)).digest("hex");
}
/** Freeze commercial terms, including resolved provider prices, subscription
 * metadata (seats/apps/offer version), quantities, currency, cadence and trial.
 * Customer contact and entry-point return URLs are not commercial authority. */
export function checkoutAdmissionRequestTerms(params: Stripe.Checkout.SessionCreateParams) {
  const commercial = structuredClone(params);
  delete commercial.customer_email; delete commercial.success_url; delete commercial.cancel_url;
  delete commercial.expires_at; delete commercial.locale; delete commercial.client_reference_id;
  if (commercial.metadata) { delete commercial.metadata.contact_email; delete commercial.metadata.business_name; }
  commercial.line_items = [...(commercial.line_items ?? [])].sort((a,b) => canonical(a).localeCompare(canonical(b)));
  return commercial;
}

export async function resolveCheckoutAdmissionTerms(stripe: Stripe, params: Stripe.Checkout.SessionCreateParams) {
  const metadata = { ...params.metadata };
  delete metadata.contact_email; delete metadata.business_name;
  const lines = await Promise.all((params.line_items ?? []).map(async line => {
    if (!line.price) return { ...line };
    const price = await stripe.prices.retrieve(line.price);
    if (!price.active || price.id !== line.price || price.type !== "recurring" || !price.recurring ||
        !Number.isSafeInteger(price.unit_amount) || price.unit_amount === null || price.unit_amount < 0 ||
        price.billing_scheme !== "per_unit" || price.transform_quantity || price.custom_unit_amount) {
      throw new Error("Unsupported admission price");
    }
    return { quantity: line.quantity, price: price.id, product: typeof price.product === "string" ? price.product : price.product.id,
      unit_amount: price.unit_amount, currency: price.currency, recurring: price.recurring, tax_behavior: price.tax_behavior };
  }));
  const commercial = { ...params };
  delete commercial.customer_email;
  delete commercial.success_url; delete commercial.cancel_url;
  delete commercial.expires_at; delete commercial.locale;
  delete commercial.client_reference_id;
  const custom = Boolean(metadata.dg_commercial_offer_id);
  const seatCount = custom ? Number(metadata.dg_seats) : PLATFORM_COMMERCIAL_PLANS.find(p => p.id === metadata.dg_platform_tier)?.maxUsers;
  if (!Number.isSafeInteger(seatCount) || !seatCount || seatCount < 1) throw new Error("Admission seat terms are not verifiable");
  if (params.allow_promotion_codes || params.adaptive_pricing?.enabled) throw new Error("Variable commercial terms cannot use a fixed admission");
  return { ...commercial, metadata, seatCount,
    line_items: lines.sort((a,b) => canonical(a).localeCompare(canonical(b))) };
}
export interface CheckoutAdmissionContext {
  organisationId: string;
  clerkUserId?: string;
  providerScope: string;
  terms: unknown;
  attemptId?: string;
  hasProviderEvidence?: boolean;
  mustBeBound?: boolean;
}
export class CheckoutAdmissionDenied extends Error {
  constructor() { super("Checkout admission is not authorised for this user and selection."); }
}
/** Gate and permit decisions share the coordinator transaction. The gate lock
 * serializes closure; the permit lock serializes binding and operator revocation.
 * No lock is held during Stripe I/O. No client-supplied permit ID is accepted. */
export async function verifyCheckoutAdmission(tx: Prisma.TransactionClient, input: CheckoutAdmissionContext,
  bind = false): Promise<string | null> {
  await tx.$executeRaw`SET LOCAL lock_timeout='1s'`;
  await tx.$executeRaw`SET LOCAL statement_timeout='3s'`;
  const gates = await tx.$queryRaw<Array<{blocked:boolean;subscription_webhooks_held:boolean}>>`SELECT blocked,subscription_webhooks_held FROM platform_checkout_creation_gate WHERE id=1 FOR UPDATE`;
  if (gates.length !== 1) throw new CheckoutAdmissionDenied();
  const rows = await tx.$queryRaw<Array<{id:string; clerk_user_id:string; provider_scope:string; terms_hash:string;
    terms:unknown; attempt_id:string|null; usable:boolean}>>`
    SELECT id,clerk_user_id,provider_scope,terms_hash,terms,attempt_id,
      (revoked_at IS NULL AND active_organisation_id=organisation_id AND expires_at>clock_timestamp()) AS usable
    FROM platform_checkout_admissions
    WHERE organisation_id=${input.organisationId} AND
      (active_organisation_id=${input.organisationId} OR (attempt_id IS NOT NULL AND attempt_id=${input.attemptId ?? null}))
    ORDER BY id FOR UPDATE`;
  if (rows.length === 0 && !gates[0].blocked) return null;
  if (rows.length !== 1 || gates[0].subscription_webhooks_held) throw new CheckoutAdmissionDenied();
  // Reject accidental use with a root Prisma client: FOR UPDATE must still be
  // held by the SAME explicit transaction, not an already-committed query.
  const [transaction] = await tx.$queryRaw<Array<{ transaction_id: string | null }>>`
    SELECT pg_current_xact_id_if_assigned()::text AS transaction_id`;
  if (!transaction?.transaction_id) throw new CheckoutAdmissionDenied();
  const row = rows[0];
  if (!row.usable || input.terms === undefined || !input.clerkUserId || row.clerk_user_id !== input.clerkUserId || row.provider_scope !== input.providerScope ||
      row.terms_hash !== checkoutAdmissionTermsHash(row.terms) || row.terms_hash !== checkoutAdmissionTermsHash(input.terms) ||
      (row.attempt_id !== null && row.attempt_id !== input.attemptId) ||
      (input.mustBeBound && (!row.attempt_id || row.attempt_id !== input.attemptId))) throw new CheckoutAdmissionDenied();
  const member = await tx.membership.findUnique({ where: { organisationId_clerkUserId: {
    organisationId: input.organisationId, clerkUserId: input.clerkUserId } }, select: {status:true} });
  if (!member || member.status !== "active") throw new CheckoutAdmissionDenied();
  if (bind && !row.attempt_id) {
    if (!input.attemptId || input.hasProviderEvidence) throw new CheckoutAdmissionDenied();
    const n = await tx.$executeRaw`UPDATE platform_checkout_admissions SET attempt_id=${input.attemptId}
      WHERE id=${row.id} AND attempt_id IS NULL AND revoked_at IS NULL AND expires_at>clock_timestamp()`;
    if (n !== 1) throw new CheckoutAdmissionDenied();
  }
  return row.id;
}

/** Operator preparation only: builds the real standard selection and resolves
 * provider prices/account; does NOT create an attempt, session or admission.
 * Issuance still requires a separately approved private database operation. */
export async function prepareStandardCheckoutAdmission(input: import("./platform-checkout").PlatformCheckoutInput) {
  if (!input.clerkUserId) throw new CheckoutAdmissionDenied();
  const { prepareStandardPlatformCheckout } = await import("./platform-checkout");
  const { stripe, parameters } = await prepareStandardPlatformCheckout(input);
  const [account, balance] = await Promise.all([stripe.accounts.retrieve(), stripe.balance.retrieve()]);
  const terms = await resolveCheckoutAdmissionTerms(stripe, parameters);
  return { organisationId: input.organisationId, clerkUserId: input.clerkUserId,
    providerScope: `${account.id}:${balance.livemode ? "live" : "test"}:2025-02-24.acacia`,
    terms, termsHash: checkoutAdmissionTermsHash(terms) };
}
