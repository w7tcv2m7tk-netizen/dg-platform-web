import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const PREFIX = "enc:v1:";

/**
 * Escape hatch for local development only. Without a key AND without this flag
 * set, writing a secret throws instead of silently persisting plaintext.
 */
const ALLOW_PLAINTEXT_ENV = "DG_ALLOW_PLAINTEXT_SECRETS";

export class SecretEncryptionUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SecretEncryptionUnavailableError";
  }
}

function encryptionKey(): Buffer | null {
  const raw = process.env.DG_SETTINGS_ENCRYPTION_KEY?.trim();
  if (!raw) return null;
  return createHash("sha256").update(raw).digest();
}

/** True when connector secrets can be encrypted at rest in this environment. */
export function isSecretEncryptionConfigured(): boolean {
  return encryptionKey() !== null;
}

function plaintextAllowed(): boolean {
  const flag = process.env[ALLOW_PLAINTEXT_ENV]?.trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}

/**
 * Encrypt a secret for storage in Organisation.settings.
 *
 * Previously this returned the plaintext unchanged when no key was configured,
 * so a missing DG_SETTINGS_ENCRYPTION_KEY silently persisted OAuth access and
 * refresh tokens in clear text with no signal anywhere. It now throws unless
 * plaintext is explicitly opted into for local development.
 */
export function encryptSecret(plaintext: string): string {
  if (!plaintext) return plaintext;
  const key = encryptionKey();

  if (!key) {
    if (plaintextAllowed()) {
      console.warn(
        `[crypto] DG_SETTINGS_ENCRYPTION_KEY is not set and ${ALLOW_PLAINTEXT_ENV} is enabled — storing a connector secret in plaintext. Never do this outside local development.`,
      );
      return plaintext;
    }
    throw new SecretEncryptionUnavailableError(
      `Cannot store a connector secret: DG_SETTINGS_ENCRYPTION_KEY is not configured. Set it, or set ${ALLOW_PLAINTEXT_ENV}=1 for local development only.`,
    );
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, tag, encrypted]).toString("base64url");
  return `${PREFIX}${payload}`;
}

export type DecryptSecretResult =
  | { ok: true; value: string; wasEncrypted: boolean }
  | { ok: false; reason: "missing_key" | "decrypt_failed" };

/**
 * Decrypt with an explicit outcome, so callers can distinguish "no secret
 * stored" from "stored but unreadable in this environment".
 *
 * Legacy plaintext values (written before encryption was enabled) are returned
 * as-is with wasEncrypted=false, so enabling the key does not strand existing
 * credentials.
 */
export function decryptSecretResult(stored: string): DecryptSecretResult {
  if (!stored || !stored.startsWith(PREFIX)) {
    return { ok: true, value: stored, wasEncrypted: false };
  }

  const key = encryptionKey();
  if (!key) {
    // Encrypted at rest but no key here — never hand ciphertext back as a password.
    return { ok: false, reason: "missing_key" };
  }

  try {
    const payload = Buffer.from(stored.slice(PREFIX.length), "base64url");
    const iv = payload.subarray(0, 12);
    const tag = payload.subarray(12, 28);
    const encrypted = payload.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return {
      ok: true,
      value: Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8"),
      wasEncrypted: true,
    };
  } catch {
    return { ok: false, reason: "decrypt_failed" };
  }
}

/**
 * Back-compatible accessor. Returns "" when a stored secret cannot be read,
 * but — unlike the previous silent version — logs why, so a missing or rotated
 * key surfaces in logs instead of presenting as "connector not configured".
 */
export function decryptSecret(stored: string): string {
  const result = decryptSecretResult(stored);
  if (result.ok) return result.value;

  console.error(
    result.reason === "missing_key"
      ? "[crypto] Stored secret is encrypted but DG_SETTINGS_ENCRYPTION_KEY is not set in this environment — the credential cannot be used."
      : "[crypto] Stored secret failed to decrypt (wrong key or corrupted value).",
  );
  return "";
}

export function isEncryptedSecret(value: string): boolean {
  return value.startsWith(PREFIX);
}
