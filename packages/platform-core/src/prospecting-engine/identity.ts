import { lookupBusinessIdentityByAbn } from "../business-identity";

export class AcquisitionError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 409) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function normaliseAustralianAbn(value: string): string {
  const abn = value.replace(/\s/g, "");
  if (!/^\d{11}$/.test(abn)) throw new AcquisitionError("invalid_abn", "Enter an 11-digit Australian ABN", 422);
  const digits = [...abn].map(Number);
  digits[0] -= 1;
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  if (digits.reduce((sum, digit, i) => sum + digit * weights[i], 0) % 89 !== 0)
    throw new AcquisitionError("invalid_abn", "ABN checksum is invalid", 422);
  return abn;
}

/** Only server-obtained ABR results establish verification. Caller metadata never does. */
export async function verifyAcquisitionAbn(value: string, lookup = lookupBusinessIdentityByAbn) {
  const abn = normaliseAustralianAbn(value);
  const result = await lookup(abn);
  if (!result.abr.ok || !result.identity) {
    const code = result.abr.ok ? "upstream_error" : result.abr.code;
    throw new AcquisitionError(code, "ABR verification unavailable; no verified identity was saved", code === "not_found" ? 422 : 503);
  }
  if (result.identity.identifiers.abn !== abn)
    throw new AcquisitionError("identity_mismatch", "ABR returned a different identifier", 502);
  return { abn, provenance: { provider: "abr", method: result.abr.entity.method,
    verifiedAt: result.identity.retrievedAt, snapshot: result.identity } };
}

/** Historical formats found in discovery, manual metadata and identity snapshots.
 * Values remain claims until a fresh ABR lookup succeeds. Conflicts never auto-merge.
 */
export function legacyAustralianAbns(metadata: unknown): string[] {
  const meta = metadata as { abn?: unknown; providerRefs?: { abn?: unknown }; businessIdentity?: { identifiers?: { abn?: unknown } }; identity?: { identifiers?: { abn?: unknown } } } | null;
  const values = [meta?.abn, meta?.providerRefs?.abn, meta?.businessIdentity?.identifiers?.abn, meta?.identity?.identifiers?.abn];
  return [...new Set(values.flatMap((value) => {
    if (typeof value !== "string") return [];
    try { return [normaliseAustralianAbn(value)]; } catch { return []; }
  }))].sort();
}
