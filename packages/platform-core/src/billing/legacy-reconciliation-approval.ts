import { createPublicKey, verify } from "node:crypto";
import type { ProductionReconciliationApproval } from "./legacy-app-entitlement-reconciliation";

export type UnsignedProductionReconciliationApproval = Omit<ProductionReconciliationApproval, "signature">;

export function canonicalProductionApproval(approval: UnsignedProductionReconciliationApproval): string {
  return JSON.stringify({
    version: approval.version,
    mode: approval.mode,
    planSha256: approval.planSha256,
    stripeAccountId: approval.stripeAccountId,
    databaseHost: approval.databaseHost,
    databaseName: approval.databaseName,
    approvedBy: approval.approvedBy,
    changeTicket: approval.changeTicket,
    approvedAt: approval.approvedAt,
    expiresAt: approval.expiresAt,
  });
}

export function verifyProductionReconciliationApproval(input: {
  approval: ProductionReconciliationApproval;
  publicKey: string;
  expectedPlanSha256: string;
  expectedStripeAccountId: string;
  expectedDatabaseHost: string;
  expectedDatabaseName: string;
}): boolean {
  const { approval } = input;
  if (!input.publicKey.trim() || !approval.signature || approval.version !== 1 || approval.mode !== "production" ||
    approval.planSha256 !== input.expectedPlanSha256 ||
    approval.stripeAccountId !== input.expectedStripeAccountId ||
    approval.databaseHost !== input.expectedDatabaseHost ||
    approval.databaseName !== input.expectedDatabaseName ||
    !approval.approvedBy.trim() || !approval.changeTicket.trim()) return false;
  const approvedAt = Date.parse(approval.approvedAt);
  const expiresAt = Date.parse(approval.expiresAt);
  const now = Date.now();
  if (!Number.isFinite(approvedAt) || !Number.isFinite(expiresAt) || expiresAt <= approvedAt ||
    expiresAt - approvedAt > 24 * 60 * 60 * 1000 || approvedAt > now + 5 * 60 * 1000 || now > expiresAt) return false;
  try {
    const unsigned = { ...approval } as UnsignedProductionReconciliationApproval;
    delete (unsigned as Partial<ProductionReconciliationApproval>).signature;
    return verify(null, Buffer.from(canonicalProductionApproval(unsigned)), createPublicKey(input.publicKey), Buffer.from(approval.signature, "base64"));
  } catch {
    return false;
  }
}
