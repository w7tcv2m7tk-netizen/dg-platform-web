import { completeOperatorCommandTask } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { requirePlatformOperator } from "@/lib/command-api";
import { isNextResponse } from "@/lib/platform-api";

/** Complete a DigitalGate operator-org CRM task from Command Centre. */
export async function PATCH(req: Request) {
  const auth = await requirePlatformOperator(req, "command.view");
  if (isNextResponse(auth)) return auth;

  const body = await req.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  if (!id) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "id required" } },
      { status: 422 },
    );
  }

  const task = await completeOperatorCommandTask(auth.operator, id);
  if (!task) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Operator task not found" } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: task });
}
