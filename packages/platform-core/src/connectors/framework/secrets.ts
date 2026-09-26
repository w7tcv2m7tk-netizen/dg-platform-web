import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VERSION = "v1";
const ALGORITHM = "aes-256-gcm";

function key(): Buffer {
  const encoded = process.env.CONNECTOR_CREDENTIALS_ENCRYPTION_KEY?.trim();
  if (!encoded) throw new Error("CONNECTOR_CREDENTIALS_ENCRYPTION_KEY not configured");
  const value = Buffer.from(encoded, "base64");
  if (value.length !== 32) throw new Error("CONNECTOR_CREDENTIALS_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
  return value;
}

export function encryptConnectorSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64"), tag.toString("base64"), ciphertext.toString("base64")].join(".");
}

export function decryptConnectorSecret(value: string): string {
  const [version, iv64, tag64, data64] = value.split(".");
  if (version !== VERSION || !iv64 || !tag64 || !data64) throw new Error("Unsupported encrypted connector secret");
  const decipher = createDecipheriv(ALGORITHM, key(), Buffer.from(iv64, "base64"));
  decipher.setAuthTag(Buffer.from(tag64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(data64, "base64")), decipher.final()]).toString("utf8");
}

export function isEncryptedConnectorSecret(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(`${VERSION}.`);
}
