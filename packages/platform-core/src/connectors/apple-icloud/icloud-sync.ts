/**
 * Sync recent iCloud Mail messages into OrgCommunication via IMAP.
 */

import "server-only";

import type { Prisma } from "@dg/database";
import type { ImapFlow } from "imapflow";

import {
  createIcloudImapClient,
  getOrgAppleIcloudConnectorCredentials,
  saveOrgAppleIcloudConnectorCredentials,
  type OrgAppleIcloudConnectorCredentials,
} from "./auth";

const ICLOUD_PROVIDER = "icloud";

async function findContactIdByEmail(
  organisationId: string,
  emails: string[],
): Promise<string | undefined> {
  const unique = [...new Set(emails.map((e) => e.toLowerCase()).filter(Boolean))];
  if (!unique.length) return undefined;
  const { prisma } = await import("@dg/database");
  const contacts = await prisma.contact.findMany({
    where: {
      organisationId,
      deletedAt: null,
      email: { in: unique, mode: "insensitive" },
    },
    select: { id: true, email: true },
    take: 5,
  });
  if (contacts.length === 1) return contacts[0].id;
  if (contacts.length > 1) {
    for (const email of unique) {
      const hit = contacts.find((c) => c.email?.toLowerCase() === email);
      if (hit) return hit.id;
    }
  }
  return undefined;
}

function addressList(
  list: Array<{ address?: string | null }> | undefined,
): string[] {
  if (!list?.length) return [];
  return list
    .map((a) => (a.address || "").trim().toLowerCase())
    .filter((e) => e.includes("@"));
}

function previewFromSource(source: Buffer | false | undefined): string {
  if (!source || !Buffer.isBuffer(source)) return "";
  const text = source.toString("utf8");
  // Strip crude MIME headers if present
  const body = text.includes("\r\n\r\n")
    ? text.slice(text.indexOf("\r\n\r\n") + 4)
    : text.includes("\n\n")
      ? text.slice(text.indexOf("\n\n") + 2)
      : text;
  return body.replace(/\s+/g, " ").trim().slice(0, 500);
}

async function upsertMailboxMessage(input: {
  organisationId: string;
  mailboxEmail: string;
  uid: number;
  direction: "inbound" | "outbound";
  subject?: string;
  fromAddress?: string;
  toAddresses: string[];
  ccAddresses: string[];
  sentAt: Date;
  preview: string;
  messageId?: string;
}): Promise<"created" | "updated" | "skipped"> {
  const { prisma } = await import("@dg/database");
  const externalId =
    input.messageId?.trim() || `uid:${input.direction}:${input.uid}`;

  const associateEmails =
    input.direction === "inbound"
      ? ([input.fromAddress, ...input.toAddresses].filter(Boolean) as string[])
      : ([...input.toAddresses, input.fromAddress].filter(Boolean) as string[]);
  const contactId = await findContactIdByEmail(
    input.organisationId,
    associateEmails,
  );

  const existing = await prisma.orgCommunication.findFirst({
    where: {
      organisationId: input.organisationId,
      provider: ICLOUD_PROVIDER,
      externalId,
      deletedAt: null,
    },
    select: { id: true },
  });

  const data = {
    channel: "email",
    direction: input.direction,
    source: "mailbox",
    status: "delivered",
    subject: input.subject ?? null,
    bodyPreview: input.preview || null,
    fromAddress: input.fromAddress ?? null,
    toAddresses: input.toAddresses.length
      ? input.toAddresses
      : input.fromAddress
        ? [input.fromAddress]
        : [],
    ccAddresses: input.ccAddresses,
    contactId: contactId ?? null,
    threadKey: input.messageId
      ? `icloud:${input.messageId.replace(/[<>\s]/g, "").slice(0, 120)}`
      : `icloud:${input.direction}:${input.uid}`,
    provider: ICLOUD_PROVIDER,
    externalId,
    whySent: "Synced from connected iCloud mailbox",
    triggerRule: "icloud.sync",
    sentAt: input.sentAt,
    metadata: {
      mailboxEmail: input.mailboxEmail,
      imapUid: input.uid,
    } as Prisma.InputJsonValue,
  };

  if (existing) {
    await prisma.orgCommunication.update({
      where: { id: existing.id },
      data,
    });
    return "updated";
  }

  await prisma.orgCommunication.create({
    data: {
      organisationId: input.organisationId,
      ...data,
    },
  });
  return "created";
}

async function resolveSentPath(client: ImapFlow): Promise<string | null> {
  const boxes = await client.list();
  const special = boxes.find((b) => b.specialUse === "\\Sent");
  if (special?.path) return special.path;
  const named = boxes.find((b) => /sent/i.test(b.path) || /sent/i.test(b.name));
  return named?.path ?? null;
}

async function syncMailboxFolder(
  client: ImapFlow,
  organisationId: string,
  mailboxEmail: string,
  path: string,
  direction: "inbound" | "outbound",
  maxMessages: number,
): Promise<{ created: number; updated: number; skipped: number; examined: number }> {
  const lock = await client.getMailboxLock(path, { readOnly: true });
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let examined = 0;

  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const uids = await client.search({ since }, { uid: true });
    if (!uids || uids.length === 0) {
      return { created: 0, updated: 0, skipped: 0, examined: 0 };
    }

    const slice = uids.slice(-maxMessages);
    examined = slice.length;

    for await (const msg of client.fetch(
      slice,
      {
        uid: true,
        envelope: true,
        source: { start: 0, maxLength: 4000 },
      },
      { uid: true },
    )) {
      try {
        const envelope = msg.envelope;
        const fromAddress = addressList(envelope?.from)[0];
        const toAddresses = addressList(envelope?.to);
        const ccAddresses = addressList(envelope?.cc);
        const subject = envelope?.subject?.trim() || undefined;
        const messageId =
          typeof envelope?.messageId === "string" ? envelope.messageId : undefined;
        const date = envelope?.date ? new Date(envelope.date) : new Date();
        const preview = previewFromSource(msg.source);

        const result = await upsertMailboxMessage({
          organisationId,
          mailboxEmail,
          uid: msg.uid,
          direction,
          subject,
          fromAddress,
          toAddresses,
          ccAddresses,
          sentAt: date,
          preview,
          messageId,
        });
        if (result === "created") created += 1;
        else if (result === "updated") updated += 1;
        else skipped += 1;
      } catch {
        skipped += 1;
      }
    }
  } finally {
    lock.release();
  }

  return { created, updated, skipped, examined };
}

export type SyncOrgIcloudResult = {
  ok: boolean;
  message: string;
  created: number;
  updated: number;
  skipped: number;
  examined: number;
  mailboxEmail?: string;
  lastSyncAt?: string;
};

export async function syncOrgAppleIcloudMailbox(
  organisationId: string,
  options?: { maxMessages?: number },
): Promise<SyncOrgIcloudResult> {
  const maxMessages = Math.min(options?.maxMessages ?? 40, 50);
  const creds = await getOrgAppleIcloudConnectorCredentials(organisationId);
  if (!creds?.email || !creds.appPassword) {
    return {
      ok: false,
      message: "iCloud Mail not connected for this organisation",
      created: 0,
      updated: 0,
      skipped: 0,
      examined: 0,
    };
  }

  const client = createIcloudImapClient({
    email: creds.email,
    appPassword: creds.appPassword,
  });

  try {
    await client.connect();

    const inbox = await syncMailboxFolder(
      client,
      organisationId,
      creds.email,
      "INBOX",
      "inbound",
      maxMessages,
    );

    let sent = { created: 0, updated: 0, skipped: 0, examined: 0 };
    const sentPath = await resolveSentPath(client);
    if (sentPath) {
      sent = await syncMailboxFolder(
        client,
        organisationId,
        creds.email,
        sentPath,
        "outbound",
        maxMessages,
      );
    }

    await client.logout();

    const created = inbox.created + sent.created;
    const updated = inbox.updated + sent.updated;
    const skipped = inbox.skipped + sent.skipped;
    const examined = inbox.examined + sent.examined;
    const lastSyncAt = new Date().toISOString();

    await saveOrgAppleIcloudConnectorCredentials(organisationId, {
      ...creds,
      lastError: undefined,
      health: {
        status: "connected",
        lastSyncAt,
        lastError: null,
        messagesSynced: created + updated,
        message: `Synced ${created + updated} message(s)`,
      },
    });

    return {
      ok: true,
      message: `Synced ${created + updated} of ${examined} recent messages`,
      created,
      updated,
      skipped,
      examined,
      mailboxEmail: creds.email,
      lastSyncAt,
    };
  } catch (err) {
    try {
      client.close();
    } catch {
      /* ignore */
    }
    const message = err instanceof Error ? err.message : "iCloud sync failed";
    const next: OrgAppleIcloudConnectorCredentials = {
      ...creds,
      lastError: message,
      health: {
        status: "error",
        lastSyncAt: creds.health?.lastSyncAt ?? null,
        lastError: message,
        message,
      },
    };
    await saveOrgAppleIcloudConnectorCredentials(organisationId, next);
    return {
      ok: false,
      message,
      created: 0,
      updated: 0,
      skipped: 0,
      examined: 0,
      mailboxEmail: creds.email,
    };
  }
}
