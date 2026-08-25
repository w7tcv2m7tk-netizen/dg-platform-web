/**
 * Apple iCloud Mail — organisation mailbox via IMAP + app-specific password.
 *
 * Apple does not offer public OAuth for third-party iCloud Mail.
 * Hosts: imap.mail.me.com:993 (SSL) · smtp.mail.me.com:587 (send later).
 */

import { ImapFlow } from "imapflow";

import { decryptSecret, encryptSecret } from "../../crypto/secret-field";
import {
  clearOrgConnectorSettings,
  getOrgConnectorSettings,
  saveOrgConnectorSettings,
} from "../framework/store";

export const APPLE_ICLOUD_CONNECTOR_ID = "apple-icloud";

export const ICLOUD_IMAP_HOST = "imap.mail.me.com";
export const ICLOUD_IMAP_PORT = 993;

export type OrgAppleIcloudConnectorCredentials = {
  /** Full iCloud / Apple ID email */
  email?: string;
  /** App-specific password (encrypted at rest) */
  appPassword?: string;
  connectedAt?: string;
  label?: string;
  lastError?: string;
  health?: {
    status: "connected" | "degraded" | "error" | "disconnected";
    lastSyncAt?: string | null;
    lastError?: string | null;
    messagesSynced?: number;
    message?: string | null;
  };
};

function encryptTokenField(value: string | undefined): string | undefined {
  if (!value) return value;
  return encryptSecret(value);
}

function decryptTokenField(value: string | undefined): string | undefined {
  if (!value) return value;
  return decryptSecret(value) || value;
}

export function normaliseIcloudEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function normaliseAppSpecificPassword(raw: string): string {
  // Apple shows passwords as xxxx-xxxx-xxxx-xxxx — IMAP accepts with or without dashes
  return raw.replace(/\s+/g, "").trim();
}

export async function getOrgAppleIcloudConnectorCredentials(
  organisationId: string,
): Promise<OrgAppleIcloudConnectorCredentials | null> {
  const blob = await getOrgConnectorSettings(
    organisationId,
    APPLE_ICLOUD_CONNECTOR_ID,
  );
  if (!blob) return null;
  return {
    email: typeof blob.email === "string" ? blob.email : undefined,
    appPassword: decryptTokenField(
      typeof blob.appPassword === "string" ? blob.appPassword : undefined,
    ),
    connectedAt:
      typeof blob.connectedAt === "string" ? blob.connectedAt : undefined,
    label: typeof blob.label === "string" ? blob.label : undefined,
    lastError: typeof blob.lastError === "string" ? blob.lastError : undefined,
    health:
      blob.health && typeof blob.health === "object"
        ? (blob.health as OrgAppleIcloudConnectorCredentials["health"])
        : undefined,
  };
}

export async function saveOrgAppleIcloudConnectorCredentials(
  organisationId: string,
  creds: OrgAppleIcloudConnectorCredentials,
): Promise<void> {
  await saveOrgConnectorSettings(organisationId, APPLE_ICLOUD_CONNECTOR_ID, {
    email: creds.email ?? null,
    appPassword: encryptTokenField(creds.appPassword),
    connectedAt: creds.connectedAt ?? new Date().toISOString(),
    label: creds.label ?? creds.email ?? null,
    lastError: creds.lastError ?? null,
    health: creds.health ?? null,
  });
}

export async function clearOrgAppleIcloudConnectorCredentials(
  organisationId: string,
): Promise<void> {
  await clearOrgConnectorSettings(organisationId, APPLE_ICLOUD_CONNECTOR_ID);
}

export function createIcloudImapClient(input: {
  email: string;
  appPassword: string;
}): ImapFlow {
  return new ImapFlow({
    host: ICLOUD_IMAP_HOST,
    port: ICLOUD_IMAP_PORT,
    secure: true,
    auth: {
      user: input.email,
      pass: input.appPassword,
    },
    logger: false,
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
  });
}

/** Live IMAP login check — does not persist. */
export async function probeIcloudImapLogin(input: {
  email: string;
  appPassword: string;
}): Promise<{ ok: true; email: string } | { ok: false; message: string }> {
  const email = normaliseIcloudEmail(input.email);
  const appPassword = normaliseAppSpecificPassword(input.appPassword);
  if (!email.includes("@")) {
    return { ok: false, message: "Enter a valid iCloud email address" };
  }
  if (appPassword.length < 8) {
    return {
      ok: false,
      message: "Use an Apple app-specific password (not your Apple ID password)",
    };
  }

  const client = createIcloudImapClient({ email, appPassword });
  try {
    await client.connect();
    await client.mailboxOpen("INBOX", { readOnly: true });
    await client.logout();
    return { ok: true, email };
  } catch (err) {
    try {
      client.close();
    } catch {
      /* ignore */
    }
    const raw = err instanceof Error ? err.message : String(err);
    const message = /auth|login|credential|password/i.test(raw)
      ? "Could not sign in to iCloud Mail — check the email and app-specific password"
      : `iCloud connection failed: ${raw}`;
    return { ok: false, message };
  }
}

export async function connectOrgAppleIcloudMailbox(input: {
  organisationId: string;
  email: string;
  appPassword: string;
}): Promise<{ ok: true; email: string } | { ok: false; message: string }> {
  const probed = await probeIcloudImapLogin({
    email: input.email,
    appPassword: input.appPassword,
  });
  if (!probed.ok) return probed;

  await saveOrgAppleIcloudConnectorCredentials(input.organisationId, {
    email: probed.email,
    appPassword: normaliseAppSpecificPassword(input.appPassword),
    label: probed.email,
    connectedAt: new Date().toISOString(),
    health: {
      status: "connected",
      lastSyncAt: null,
      lastError: null,
      message: "Connected — run Sync to pull recent mail",
    },
  });

  return { ok: true, email: probed.email };
}

export async function probeOrgAppleIcloudConnection(organisationId: string): Promise<{
  ok: boolean;
  connected: boolean;
  apiOk?: boolean;
  email?: string | null;
  message: string;
}> {
  const creds = await getOrgAppleIcloudConnectorCredentials(organisationId);
  if (!creds?.email || !creds.appPassword) {
    return { ok: false, connected: false, message: "iCloud Mail not connected" };
  }

  const probed = await probeIcloudImapLogin({
    email: creds.email,
    appPassword: creds.appPassword,
  });
  if (!probed.ok) {
    await saveOrgAppleIcloudConnectorCredentials(organisationId, {
      ...creds,
      lastError: probed.message,
      health: {
        status: "error",
        lastSyncAt: creds.health?.lastSyncAt ?? null,
        lastError: probed.message,
        message: probed.message,
      },
    });
    return {
      ok: false,
      connected: true,
      apiOk: false,
      email: creds.email,
      message: probed.message,
    };
  }

  return {
    ok: true,
    connected: true,
    apiOk: true,
    email: creds.email,
    message: `iCloud connected · ${creds.email}`,
  };
}
