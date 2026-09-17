import { createHmac, randomBytes, timingSafeEqual } from "crypto";

type MetaOAuthStateInner = { o: string; e: number; n: string };

function signingSecret(): string {
  return process.env.META_OAUTH_STATE_SECRET?.trim() || process.env.META_APP_SECRET?.trim() || process.env.CLERK_SECRET_KEY?.trim() || "";
}

function b64url(input: Buffer | string): string {
  return (typeof input === "string" ? Buffer.from(input, "utf8") : input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function fromB64url(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}
function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function createMetaOAuthState(organisationId: string): string {
  const secret = signingSecret();
  if (!secret) throw new Error("No secret available to sign Meta OAuth state");
  const payload = JSON.stringify({ o: organisationId, e: Date.now() + 30 * 60 * 1000, n: randomBytes(8).toString("hex") } satisfies MetaOAuthStateInner);
  return b64url(JSON.stringify({ p: payload, s: sign(payload, secret) }));
}

export function parseMetaOAuthState(state: string): { ok: true; organisationId: string } | { ok: false; message: string } {
  const secret = signingSecret();
  if (!secret) return { ok: false, message: "OAuth state secret not configured" };
  try {
    const envelope = JSON.parse(fromB64url(state.trim()).toString("utf8")) as { p?: string; s?: string };
    if (!envelope.p || !envelope.s) return { ok: false, message: "OAuth state missing payload" };
    const expected = Buffer.from(sign(envelope.p, secret));
    const supplied = Buffer.from(envelope.s);
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return { ok: false, message: "OAuth state signature mismatch" };
    const payload = JSON.parse(envelope.p) as MetaOAuthStateInner;
    if (!payload.o || typeof payload.o !== "string") return { ok: false, message: "OAuth state missing organisation" };
    if (typeof payload.e !== "number" || Date.now() > payload.e) return { ok: false, message: "OAuth state expired — connect Meta again" };
    return { ok: true, organisationId: payload.o };
  } catch {
    return { ok: false, message: "Malformed Meta OAuth state" };
  }
}
