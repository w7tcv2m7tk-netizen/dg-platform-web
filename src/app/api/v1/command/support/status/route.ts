import { NextResponse } from "next/server";
import { requirePlatformOperatorContext } from "@/lib/platform-operator";

function safeReturnTo(value: FormDataEntryValue | null) {
  const path = typeof value === "string" ? value : "/support/tickets";
  return path.startsWith("/support/tickets") ? path : "/support/tickets";
}

export async function POST(request: Request) {
  try {
    await requirePlatformOperatorContext();
  } catch {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Platform operator access required" } },
      { status: 403 },
    );
  }

  const form = await request.formData();
  const conversationId = String(form.get("conversationId") ?? "").trim();
  const status = String(form.get("status") ?? "").trim();
  const returnTo = safeReturnTo(form.get("returnTo"));

  if (!conversationId || (status !== "open" && status !== "resolved")) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "Invalid support status update" } },
      { status: 400 },
    );
  }

  const { prisma } = await import("@dg/database");
  const existing = await prisma.supportConversation.findUnique({
    where: { id: conversationId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Support conversation not found" } },
      { status: 404 },
    );
  }

  await prisma.supportConversation.update({
    where: { id: conversationId },
    data: {
      status,
      ...(status === "resolved" ? { aiPaused: false } : {}),
    },
  });

  return NextResponse.redirect(new URL(returnTo, request.url), 303);
}
