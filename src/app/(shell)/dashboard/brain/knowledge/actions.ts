"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  approveKnowledgeItem,
  archiveKnowledgeItem,
  isOrgAdminRole,
  proposeKnowledgeItem,
  rejectKnowledgeItem,
  supersedeKnowledgeItem,
  upsertKnowledgeSource,
} from "@dg/platform-core";

import { getPlatformPageContext } from "@/lib/platform-page-context";

const SAFE_KNOWLEDGE_ERRORS = new Set([
  "You must be signed in to review Business Brain knowledge.",
  "Only organisation owners and admins can manage Business Brain knowledge.",
  "Invalid knowledge item.",
  "Add a title and the knowledge DigitalGate should remember.",
  "Invalid knowledge classification.",
]);

function knowledgeNoticeHref(tone: "success" | "error", notice: string) {
  const params = new URLSearchParams({ tone, notice });
  return `/dashboard/brain/knowledge?${params.toString()}`;
}

function customerSafeKnowledgeError(error: unknown) {
  if (error instanceof Error && SAFE_KNOWLEDGE_ERRORS.has(error.message)) {
    return error.message;
  }
  return "We couldn’t save that Business Brain change. Please try again.";
}

async function requireKnowledgeApprover() {
  const { session, clerkUserId } = await getPlatformPageContext();
  if (!session || !clerkUserId) {
    throw new Error("You must be signed in to review Business Brain knowledge.");
  }
  if (!isOrgAdminRole(session.role)) {
    throw new Error("Only organisation owners and admins can manage Business Brain knowledge.");
  }
  return { session, actorId: clerkUserId };
}

function readItemId(formData: FormData) {
  const itemId = formData.get("itemId");
  if (typeof itemId !== "string" || itemId.length < 1 || itemId.length > 200) {
    throw new Error("Invalid knowledge item.");
  }
  return itemId;
}

function readText(formData: FormData, key: string, maxLength: number) {
  const value = formData.get(key);
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function readKnowledgeDraft(formData: FormData) {
  const title = readText(formData, "title", 160);
  const statement = readText(formData, "statement", 5000);
  const type = readText(formData, "type", 50) || "fact";
  const importance = readText(formData, "importance", 20) || "medium";

  if (!title || !statement) {
    throw new Error("Add a title and the knowledge DigitalGate should remember.");
  }

  const allowedTypes = new Set(["fact", "decision", "strategy", "policy", "process", "principle"]);
  const allowedImportance = new Set(["low", "medium", "high", "critical"]);
  if (!allowedTypes.has(type) || !allowedImportance.has(importance)) {
    throw new Error("Invalid knowledge classification.");
  }

  return { title, statement, type, importance };
}

export async function proposeKnowledgeAction(formData: FormData) {
  let failure: string | null = null;

  try {
    const { session, actorId } = await requireKnowledgeApprover();
    const { title, statement, type, importance } = readKnowledgeDraft(formData);

    const sourceRef = `user-entry:${randomUUID()}`;
    const sourceId = await upsertKnowledgeSource({
      organisationId: session.organisationId,
      sourceType: "user_entry",
      title,
      sourceApp: "business_brain",
      sourceRef,
      capturedAt: new Date(),
      metadata: { enteredBy: actorId },
    });

    await proposeKnowledgeItem({
      organisationId: session.organisationId,
      type,
      title,
      statement,
      importance,
      sourceId,
      sourceRef,
      sourceExcerpt: statement.slice(0, 500),
      createdBy: actorId,
      metadata: { sourceType: "user_entry" },
    });

    revalidatePath("/dashboard/brain");
    revalidatePath("/dashboard/brain/knowledge");
  } catch (error) {
    failure = customerSafeKnowledgeError(error);
  }

  if (failure) redirect(knowledgeNoticeHref("error", failure));
  redirect(knowledgeNoticeHref("success", "Knowledge added for review."));
}

export async function approveKnowledgeAction(formData: FormData) {
  let failure: string | null = null;

  try {
    const { session, actorId } = await requireKnowledgeApprover();
    const itemId = readItemId(formData);

    await approveKnowledgeItem({
      organisationId: session.organisationId,
      itemId,
      actorId,
    });

    revalidatePath("/dashboard/brain");
    revalidatePath("/dashboard/brain/knowledge");
    revalidatePath("/dashboard/advisor");
  } catch (error) {
    failure = customerSafeKnowledgeError(error);
  }

  if (failure) redirect(knowledgeNoticeHref("error", failure));
  redirect(knowledgeNoticeHref("success", "Knowledge approved and available to Business Brain."));
}

export async function rejectKnowledgeAction(formData: FormData) {
  let failure: string | null = null;

  try {
    const { session, actorId } = await requireKnowledgeApprover();
    const itemId = readItemId(formData);
    const reason = formData.get("reason");

    await rejectKnowledgeItem({
      organisationId: session.organisationId,
      itemId,
      actorId,
      reason: typeof reason === "string" && reason.trim() ? reason.trim().slice(0, 500) : undefined,
    });

    revalidatePath("/dashboard/brain");
    revalidatePath("/dashboard/brain/knowledge");
    revalidatePath("/dashboard/advisor");
  } catch (error) {
    failure = customerSafeKnowledgeError(error);
  }

  if (failure) redirect(knowledgeNoticeHref("error", failure));
  redirect(knowledgeNoticeHref("success", "Knowledge rejected and kept out of approved Business Brain truth."));
}

export async function archiveKnowledgeAction(formData: FormData) {
  let failure: string | null = null;

  try {
    const { session, actorId } = await requireKnowledgeApprover();
    const itemId = readItemId(formData);

    await archiveKnowledgeItem({
      organisationId: session.organisationId,
      itemId,
      actorId,
    });

    revalidatePath("/dashboard/brain");
    revalidatePath("/dashboard/brain/knowledge");
    revalidatePath("/dashboard/advisor");
  } catch (error) {
    failure = customerSafeKnowledgeError(error);
  }

  if (failure) redirect(knowledgeNoticeHref("error", failure));
  redirect(knowledgeNoticeHref("success", "Knowledge archived and removed from current Business Brain truth."));
}

export async function replaceKnowledgeAction(formData: FormData) {
  let failure: string | null = null;

  try {
    const { session, actorId } = await requireKnowledgeApprover();
    const existingItemId = readItemId(formData);
    const { title, statement, type, importance } = readKnowledgeDraft(formData);

    const sourceRef = `user-replacement:${randomUUID()}`;
    const sourceId = await upsertKnowledgeSource({
      organisationId: session.organisationId,
      sourceType: "user_entry",
      title,
      sourceApp: "business_brain",
      sourceRef,
      capturedAt: new Date(),
      metadata: { enteredBy: actorId, replacesKnowledgeItemId: existingItemId },
    });

    const replacement = await proposeKnowledgeItem({
      organisationId: session.organisationId,
      type,
      title,
      statement,
      importance,
      sourceId,
      sourceRef,
      sourceExcerpt: statement.slice(0, 500),
      createdBy: actorId,
      metadata: { sourceType: "user_entry", replacesKnowledgeItemId: existingItemId },
    });

    await supersedeKnowledgeItem({
      organisationId: session.organisationId,
      existingItemId,
      replacementItemId: replacement.id,
      actorId,
    });

    revalidatePath("/dashboard/brain");
    revalidatePath("/dashboard/brain/knowledge");
    revalidatePath("/dashboard/advisor");
  } catch (error) {
    failure = customerSafeKnowledgeError(error);
  }

  if (failure) redirect(knowledgeNoticeHref("error", failure));
  redirect(knowledgeNoticeHref("success", "Approved knowledge replaced. The previous version remains in history as superseded."));
}
