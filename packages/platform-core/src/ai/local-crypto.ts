import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export type AiJobContentKind = "payload" | "result";
export type AiJobAad = {
  jobId: string;
  organisationId: string;
  task: string;
  taskVersion: number;
  policyVersion: number;
  classification: string;
  deploymentId: string;
  kind: AiJobContentKind;
};
export type EncryptedAiJobContent = { ciphertext: Buffer; nonce: Buffer; keyVersion: string };

function keyFor(version: string): Buffer {
  if (!/^v[1-9][0-9]*$/.test(version)) throw new Error("AI job encryption key version invalid");
  const name = `AI_JOB_ENCRYPTION_KEY_${version.toUpperCase()}`;
  const raw = (process.env[name] ?? "").trim();
  if (!raw) throw new Error("AI job encryption key unavailable");
  const key = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, "hex") :
    /^[A-Za-z0-9_-]{43}$/.test(raw) ? Buffer.from(raw, "base64url") : Buffer.alloc(0);
  if (key.length !== 32) throw new Error("AI job encryption key invalid");
  return key;
}

function aadBytes(aad: AiJobAad): Buffer {
  return Buffer.from(JSON.stringify([aad.jobId, aad.organisationId, aad.task, aad.taskVersion,
    aad.policyVersion, aad.classification, aad.deploymentId, aad.kind]), "utf8");
}

export function encryptAiJobContent(plaintext: string, aad: AiJobAad): EncryptedAiJobContent {
  const configuredVersion = (process.env.AI_JOB_ENCRYPTION_CURRENT_VERSION ?? "v1").trim();
  const keyVersion = /^v[1-9][0-9]*$/.test(configuredVersion) ? configuredVersion : "";
  if (!keyVersion) throw new Error("AI job encryption key version invalid");
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFor(keyVersion), nonce);
  cipher.setAAD(aadBytes(aad));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final(), cipher.getAuthTag()]);
  return { ciphertext, nonce, keyVersion };
}

export function decryptAiJobContent(encrypted: EncryptedAiJobContent, aad: AiJobAad): string {
  if (encrypted.nonce.length !== 12 || encrypted.ciphertext.length < 16) throw new Error("AI job ciphertext invalid");
  const decipher = createDecipheriv("aes-256-gcm", keyFor(encrypted.keyVersion), encrypted.nonce);
  decipher.setAAD(aadBytes(aad));
  decipher.setAuthTag(encrypted.ciphertext.subarray(-16));
  return Buffer.concat([decipher.update(encrypted.ciphertext.subarray(0, -16)), decipher.final()]).toString("utf8");
}
