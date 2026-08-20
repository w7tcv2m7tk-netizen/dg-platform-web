import { NextResponse } from "next/server";
import { acceptFoundingResellerInvitationByToken } from "@dg/platform-core";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { token?: string } | null;
  const token = body?.token?.trim();
  if (!token) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "token is required" } },
      { status: 422 },
    );
  }

  const result = await acceptFoundingResellerInvitationByToken(token);
  if (!result.ok) {
    return NextResponse.json(
      {
        error: {
          code: result.withdrawn ? "withdrawn" : "not_found",
          message: result.error || "Invitation not found",
        },
        data: { portalUrl: result.portalUrl, withdrawn: result.withdrawn },
      },
      { status: result.withdrawn ? 410 : 404 },
    );
  }

  return NextResponse.json({ data: result });
}
