import { NextResponse } from "next/server";
import {
  createDeliveryPartnerInvitation,
  createFoundingResellerInvitation,
} from "@dg/platform-core";

import { requirePlatformOperator } from "@/lib/command-api";
import { isNextResponse } from "@/lib/platform-api";

export async function POST(req: Request) {
  try {
    const auth = await requirePlatformOperator(req);
    if (isNextResponse(auth)) return auth;

    const body = (await req.json().catch(() => null)) as {
      kind?: "founding_reseller" | "delivery_partner";
      name?: string;
      email?: string;
      phone?: string;
      businessName?: string;
      deliveryRole?: "lead" | "member";
      send?: boolean;
    } | null;

    const kind = body?.kind === "delivery_partner" ? "delivery_partner" : "founding_reseller";

    const result =
      kind === "delivery_partner"
        ? await createDeliveryPartnerInvitation({
            organisationId: auth.session.organisationId,
            actorName: auth.session.name,
            name: body?.name,
            email: body?.email,
            phone: body?.phone,
            businessName: body?.businessName,
            deliveryRole: body?.deliveryRole,
            send: Boolean(body?.send),
          })
        : await createFoundingResellerInvitation({
            organisationId: auth.session.organisationId,
            actorName: auth.session.name,
            name: body?.name,
            email: body?.email,
            phone: body?.phone,
            businessName: body?.businessName,
            send: Boolean(body?.send),
          });

    if (result.error && !result.partnerId) {
      return NextResponse.json(
        { error: { code: "validation_error", message: result.error } },
        { status: 422 },
      );
    }

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not create invitation. Please try again.";
    return NextResponse.json(
      { error: { code: "server_error", message } },
      { status: 500 },
    );
  }
}
