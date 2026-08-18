import { createHmac, randomBytes, timingSafeEqual } from "crypto";

type LinkedInOAuthStateInner = {
  o: string;
  e: number;
  n: string;
};

function signingSecret(): string {
  return (
    process.env.LINKEDIN_OAUTH_STATE_SECRET?.trim() ||
    process.env.LINKEDIN_CLIENT_SECRET?.trim() ||
    process.env.CLERK_SECRET_KEY?.trim() ||
    ""
  );
}

function b64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromB64url(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64");
}

function signPayload(payloadJson: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadJson).digest("hex");
}

/** Single URL-safe token — org id travels with LinkedIn (no cookies). */
export function createLinkedInOAuthState(organisationId: string): string {
  const secret = signingSecret();
  if (!secret) {
    throw new Error("No secret available to sign LinkedIn OAuth state");
  }
  const inner: LinkedInOAuthStateInner = {
    o: organisationId,
    e: Date.now() + 30 * 60 * 1000,
    n: randomBytes(8).toString("hex"),
  };
  const payloadJson = JSON.stringify(inner);
  const envelope = {
    p: payloadJson,
    s: signPayload(payloadJson, secret),
  };
  return b64url(JSON.stringify(envelope));
}

export function parseLinkedInOAuthState(
  state: string,
): { ok: true; organisationId: string } | { ok: false; message: string } {
  const secret = signingSecret();
  if (!secret) {
    return { ok: false, message: "OAuth state secret not configured" };
  }

  const trimmed = state.trim();
  if (!trimmed) {
    return { ok: false, message: "Empty OAuth state" };
  }

  let envelope: { p?: string; s?: string };
  try {
    envelope = JSON.parse(fromB64url(trimmed).toString("utf8")) as {
      p?: string;
      s?: string;
    };
  } catch {
    return {
      ok: false,
      message: "Malformed OAuth state — hard refresh and click Connect LinkedIn again",
    };
  }

  if (!envelope.p || !envelope.s || typeof envelope.p !== "string") {
    return { ok: false, message: "OAuth state missing payload" };
  }

  const expected = signPayload(envelope.p, secret);
  try {
    const a = Buffer.from(envelope.s);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, message: "OAuth state signature mismatch" };
    }
  } catch {
    return { ok: false, message: "OAuth state signature mismatch" };
  }

  try {
    const payload = JSON.parse(envelope.p) as LinkedInOAuthStateInner;
    if (!payload?.o || typeof payload.o !== "string") {
      return { ok: false, message: "OAuth state missing organisation" };
    }
    if (typeof payload.e !== "number" || Date.now() > payload.e) {
      return {
        ok: false,
        message: "OAuth state expired — try Connect LinkedIn again",
      };
    }
    return { ok: true, organisationId: payload.o };
  } catch {
    return { ok: false, message: "OAuth state payload invalid" };
  }
}
