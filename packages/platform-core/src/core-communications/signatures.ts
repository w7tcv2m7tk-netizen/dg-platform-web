/**
 * Signature Studio v1 — org email signatures in organisation.settings.communications.signatures
 * No Prisma table for v1.
 */

export interface CommunicationSignature {
  id: string;
  name: string;
  html: string;
  isDefault: boolean;
  replyHtml?: string;
  updatedAt: string;
}

export type CommunicationSignatureDraft = {
  name: string;
  html: string;
  isDefault?: boolean;
  replyHtml?: string;
};

export type CommunicationSignaturePatch = Partial<CommunicationSignatureDraft>;

type OrgSettings = {
  communications?: {
    signatures?: unknown;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

const MAX_SIGNATURES = 20;
const MAX_NAME = 80;
const MAX_HTML = 20_000;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function normaliseCommunicationSignatures(raw: unknown): CommunicationSignature[] {
  if (!Array.isArray(raw)) return [];
  const out: CommunicationSignature[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const id = typeof item.id === "string" ? item.id.trim() : "";
    const name = typeof item.name === "string" ? item.name.trim() : "";
    const html = typeof item.html === "string" ? item.html : "";
    if (!id || !name) continue;
    out.push({
      id,
      name: name.slice(0, MAX_NAME),
      html: html.slice(0, MAX_HTML),
      isDefault: Boolean(item.isDefault),
      replyHtml:
        typeof item.replyHtml === "string" && item.replyHtml.trim()
          ? item.replyHtml.slice(0, MAX_HTML)
          : undefined,
      updatedAt:
        typeof item.updatedAt === "string" && !Number.isNaN(Date.parse(item.updatedAt))
          ? item.updatedAt
          : new Date(0).toISOString(),
    });
  }
  return out;
}

function ensureSingleDefault(list: CommunicationSignature[]): CommunicationSignature[] {
  const defaults = list.filter((s) => s.isDefault);
  if (defaults.length <= 1) {
    if (list.length > 0 && defaults.length === 0) {
      return list.map((s, i) => (i === 0 ? { ...s, isDefault: true } : s));
    }
    return list;
  }
  const keepId = defaults[defaults.length - 1]!.id;
  return list.map((s) => ({ ...s, isDefault: s.id === keepId }));
}

async function readSettings(organisationId: string) {
  const { prisma } = await import("@dg/database");
  const org = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: { settings: true },
  });
  return {
    prisma,
    settings: ((org?.settings as OrgSettings | null) ?? {}) as OrgSettings,
  };
}

export async function listCommunicationSignatures(
  organisationId: string,
): Promise<CommunicationSignature[]> {
  if (!process.env.DATABASE_URL) return [];
  const { settings } = await readSettings(organisationId);
  return ensureSingleDefault(
    normaliseCommunicationSignatures(settings.communications?.signatures),
  );
}

export async function getDefaultCommunicationSignature(
  organisationId: string,
): Promise<CommunicationSignature | null> {
  const list = await listCommunicationSignatures(organisationId);
  return list.find((s) => s.isDefault) ?? list[0] ?? null;
}

async function writeSignatures(
  organisationId: string,
  signatures: CommunicationSignature[],
) {
  const { prisma, settings } = await readSettings(organisationId);
  type InputJsonValue = import("@dg/database").Prisma.InputJsonValue;
  const next = ensureSingleDefault(signatures).slice(0, MAX_SIGNATURES);
  const communications = {
    ...(isRecord(settings.communications) ? settings.communications : {}),
    signatures: next,
  };
  await prisma.organisation.update({
    where: { id: organisationId },
    data: {
      settings: {
        ...settings,
        communications,
      } as unknown as InputJsonValue,
    },
  });
  return next;
}

function sanitiseDraft(
  draft: CommunicationSignatureDraft,
): CommunicationSignatureDraft | { error: string } {
  const name = draft.name?.trim().slice(0, MAX_NAME) ?? "";
  if (name.length < 1) return { error: "Name is required" };
  const html = (draft.html ?? "").slice(0, MAX_HTML);
  if (!html.trim()) return { error: "Signature body is required" };
  const replyHtml = draft.replyHtml?.trim()
    ? draft.replyHtml.trim().slice(0, MAX_HTML)
    : undefined;
  return {
    name,
    html,
    isDefault: Boolean(draft.isDefault),
    replyHtml,
  };
}

/** Strip tags for plain-text email body append. */
export function htmlToPlainSignature(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Append default signature to a plain-text compose body if not already present. */
export function appendSignatureToBody(
  body: string,
  signature: CommunicationSignature | null | undefined,
): string {
  if (!signature?.html?.trim()) return body;
  const plain = htmlToPlainSignature(signature.html);
  if (!plain) return body;
  const trimmed = body.trimEnd();
  if (trimmed.includes(plain)) return body;
  return `${trimmed}\n\n--\n${plain}`;
}

export async function createCommunicationSignature(
  organisationId: string,
  draft: CommunicationSignatureDraft,
): Promise<
  { signatures: CommunicationSignature[]; signature: CommunicationSignature } | { error: string }
> {
  const clean = sanitiseDraft(draft);
  if ("error" in clean) return clean;
  const existing = await listCommunicationSignatures(organisationId);
  if (existing.length >= MAX_SIGNATURES) {
    return { error: `You can save up to ${MAX_SIGNATURES} signatures` };
  }
  const now = new Date().toISOString();
  const signature: CommunicationSignature = {
    id: crypto.randomUUID(),
    name: clean.name,
    html: clean.html,
    isDefault: clean.isDefault || existing.length === 0,
    replyHtml: clean.replyHtml,
    updatedAt: now,
  };
  let next = [...existing, signature];
  if (signature.isDefault) {
    next = next.map((s) => ({ ...s, isDefault: s.id === signature.id }));
  }
  const signatures = await writeSignatures(organisationId, next);
  const saved = signatures.find((s) => s.id === signature.id) ?? signature;
  return { signatures, signature: saved };
}

export async function updateCommunicationSignature(
  organisationId: string,
  id: string,
  patch: CommunicationSignaturePatch,
): Promise<
  { signatures: CommunicationSignature[]; signature: CommunicationSignature } | { error: string }
> {
  const existing = await listCommunicationSignatures(organisationId);
  const idx = existing.findIndex((s) => s.id === id);
  if (idx < 0) return { error: "Signature not found" };
  const current = existing[idx]!;
  const draft: CommunicationSignatureDraft = {
    name: patch.name ?? current.name,
    html: patch.html ?? current.html,
    isDefault: patch.isDefault ?? current.isDefault,
    replyHtml: patch.replyHtml !== undefined ? patch.replyHtml : current.replyHtml,
  };
  const clean = sanitiseDraft(draft);
  if ("error" in clean) return clean;
  const updated: CommunicationSignature = {
    ...current,
    name: clean.name,
    html: clean.html,
    isDefault: clean.isDefault ?? current.isDefault,
    replyHtml: clean.replyHtml,
    updatedAt: new Date().toISOString(),
  };
  let next = existing.map((s) => (s.id === id ? updated : s));
  if (updated.isDefault) {
    next = next.map((s) => ({ ...s, isDefault: s.id === id }));
  }
  const signatures = await writeSignatures(organisationId, next);
  const saved = signatures.find((s) => s.id === id) ?? updated;
  return { signatures, signature: saved };
}

export async function deleteCommunicationSignature(
  organisationId: string,
  id: string,
): Promise<{ signatures: CommunicationSignature[] } | { error: string }> {
  const existing = await listCommunicationSignatures(organisationId);
  if (!existing.some((s) => s.id === id)) return { error: "Signature not found" };
  const next = existing.filter((s) => s.id !== id);
  const signatures = await writeSignatures(organisationId, next);
  return { signatures };
}
