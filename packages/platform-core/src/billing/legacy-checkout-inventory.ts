import "server-only";
import { createHash } from "node:crypto";
import type Stripe from "stripe";

export type InventoryGate = {
  blocked: boolean;
  revision: number;
  lastAdmissionExpiresAt: number | null;
  databaseNow: number;
};
export type InventoryOwner = {
  billingCustomerId: string | null;
  subscription: {
    stripeSubscriptionId: string | null;
    stripeCustomerId: string | null;
    stripeStatus: string | null;
  } | null;
};
export type InventoryReader = {
  gate(): Promise<InventoryGate | null>;
  owner(organisationId: string): Promise<InventoryOwner | null>;
};

const reference = (id: string) => createHash("sha256").update(id).digest("hex").slice(0, 24);
const objectId = (value: string | { id: string } | null) => typeof value === "string" ? value : value?.id ?? null;

/** Entire account scan, deliberately without a customer or status filter.
 * No mutations, customer retrieval, emails, metadata bodies or URLs in output.
 * A clean report is inventory evidence only; deployment isolation is external.
 */
export async function reconcileLegacyCheckoutInventory(input: {
  stripe: Stripe;
  database: InventoryReader;
  expectedAccount: string;
  mode: "test" | "live";
  maxPages?: number;
  now?: () => number;
}) {
  const now = input.now ?? (() => Math.floor(Date.now() / 1000));
  const startedAt = now();
  const maxPages = input.maxPages ?? 20;
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 1000) throw new Error("Invalid page bound");
  const report = {
    version: 1, mode: input.mode, account: input.expectedAccount, startedAt,
    finishedAt: startedAt, pages: 0, scanned: 0, platformSessions: 0,
    inventoryComplete: false, inventoryConfidence: false, readyForCoordinator: false,
    gate: null as InventoryGate | null,
    counts: { open: 0, complete: 0, expired: 0 },
    sessions: [] as Array<{ reference: string; status: string; expiresAt: number; issues: string[] }>,
    blockers: [] as string[],
  };
  const block = (code: string) => { if (!report.blockers.includes(code)) report.blockers.push(code); };
  const deadline = () => { if (now() - startedAt > 120) throw new Error("Inventory deadline exceeded"); };
  try {
    // Account read works with both restricted and full keys; balance binds mode.
    const account = await input.stripe.accounts.retrieve();
    const balance = await input.stripe.balance.retrieve();
    if (account.id !== input.expectedAccount || balance.livemode !== (input.mode === "live")) {
      block("provider_scope_mismatch");
      return report;
    }
    report.gate = await input.database.gate();
    if (!report.gate?.blocked) block("gate_not_closed");
    if (report.gate && report.gate.lastAdmissionExpiresAt !== null &&
      report.gate.databaseNow <= report.gate.lastAdmissionExpiresAt + 60) block("admissions_not_drained");
    let cursor: string | undefined;
    const seen = new Set<string>();
    for (let page = 0; page < maxPages; page++) {
      deadline();
      // Scan all history. Never assume a customer, time window or status.
      const batch = await input.stripe.checkout.sessions.list({
        limit: 100, ...(cursor ? { starting_after: cursor } : {}),
      });
      report.pages++;
      if (batch.data.length === 0 && batch.has_more) { block("invalid_pagination"); break; }
      for (const listed of batch.data) {
        deadline();
        if (!listed.id || seen.has(listed.id)) { block("duplicate_or_invalid_session"); continue; }
        seen.add(listed.id);
        report.scanned++;
        if (listed.livemode !== (input.mode === "live")) { block("session_mode_mismatch"); continue; }
        if (listed.metadata?.dg_platform_checkout !== "true") {
          if (listed.mode === "subscription") block("unclassified_subscription_session");
          continue;
        }
        report.platformSessions++;
        // List status can be stale by the time a page is processed.
        const session = await input.stripe.checkout.sessions.retrieve(listed.id);
        deadline();
        const row = { reference: reference(listed.id), status: session.status ?? "unknown", expiresAt: session.expires_at, issues: [] as string[] };
        report.sessions.push(row);
        const issue = (code: string) => { row.issues.push(code); block(code); };
        if (session.id !== listed.id || session.mode !== "subscription" || session.metadata?.dg_platform_checkout !== "true" ||
          session.livemode !== (input.mode === "live")) issue("session_identity_mismatch");
        if (!Number.isSafeInteger(session.expires_at) || session.expires_at <= 0) issue("invalid_expiry");
        const orgId = session.metadata?.organisation_id?.trim();
        const owner = orgId ? await input.database.owner(orgId) : null;
        deadline();
        if (!owner) issue("unknown_organisation_ownership");
        const customerId = objectId(session.customer);
        // An open session without a Customer is valid and must remain visible.
        if (owner && customerId && owner.billingCustomerId && owner.billingCustomerId !== customerId) issue("customer_ownership_conflict");
        if (session.status === "open") {
          report.counts.open++;
          issue("existing_open_session"); // Never expire or disregard by local clock.
        } else if (session.status === "expired") {
          report.counts.expired++;
        } else if (session.status === "complete") {
          report.counts.complete++;
          const subscriptionId = objectId(session.subscription);
          if (!subscriptionId || !owner || !customerId) {
            issue("completed_purchase_unconfirmed");
          } else {
            const subscription = await input.stripe.subscriptions.retrieve(subscriptionId);
            deadline();
            const canonical = owner.subscription;
            if (subscription.id !== subscriptionId || subscription.livemode !== (input.mode === "live") ||
              subscription.metadata.organisation_id !== orgId || objectId(subscription.customer) !== customerId ||
              !canonical || canonical.stripeSubscriptionId !== subscriptionId || canonical.stripeCustomerId !== customerId ||
              canonical.stripeStatus !== subscription.status || owner.billingCustomerId !== customerId) {
              issue("completed_purchase_unconfirmed");
            }
          }
        } else issue("unknown_session_status");
      }
      if (!batch.has_more) { report.inventoryComplete = true; break; }
      const next = batch.data.at(-1)?.id;
      if (!next || next === cursor) { block("invalid_pagination"); break; }
      cursor = next;
    }
    if (!report.inventoryComplete) block("inventory_incomplete");
    const finalGate = await input.database.gate();
    deadline();
    if (!finalGate || !finalGate.blocked || !report.gate || finalGate.revision !== report.gate.revision ||
      finalGate.lastAdmissionExpiresAt !== report.gate.lastAdmissionExpiresAt) block("gate_changed_during_scan");
  } catch {
    // No raw SDK/DB error: those can contain secrets, URLs and personal data.
    report.inventoryComplete = false;
    block("inventory_read_failed");
  } finally {
    report.finishedAt = now();
  }
  report.inventoryConfidence = report.inventoryComplete && report.blockers.length === 0;
  // Even a clean report cannot certify that ungated deployment URLs are sealed.
  report.readyForCoordinator = false;
  return report;
}
