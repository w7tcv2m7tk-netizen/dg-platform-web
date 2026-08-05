import { verifyWebhook } from "@clerk/backend/webhooks";
import { provisionOrganisation } from "@dg/platform-core";
import { NextResponse } from "next/server";

function userDisplayName(data: {
  first_name?: string | null;
  last_name?: string | null;
  email_addresses?: Array<{ email_address?: string }>;
}): string {
  const first = data.first_name ?? "";
  const last = data.last_name ?? "";
  const full = [first, last].filter(Boolean).join(" ");
  if (full) return full;
  return data.email_addresses?.[0]?.email_address ?? "";
}

export async function POST(req: Request) {
  let payload: Awaited<ReturnType<typeof verifyWebhook>>;

  try {
    if (process.env.CLERK_WEBHOOK_SIGNING_SECRET) {
      payload = await verifyWebhook(req);
    } else {
      payload = (await req.json()) as Awaited<ReturnType<typeof verifyWebhook>>;
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { error: "Webhook signing secret not configured" },
          { status: 500 },
        );
      }
    }
  } catch (err) {
    console.error("[Clerk webhook] verification failed:", err);
    return NextResponse.json({ error: "Webhook verification failed" }, { status: 400 });
  }

  if (payload.type === "user.created") {
    const data = payload.data;
    const clerkUserId = data.id;
    const email = data.email_addresses?.[0]?.email_address ?? "";
    const name = userDisplayName(data);

    if (!clerkUserId || !email) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const result = await provisionOrganisation({
      clerkUserId,
      email,
      name,
    });

    console.info("[Clerk webhook] user.created provisioned", {
      clerkUserId,
      email,
      organisationId: result.organisationId,
      created: result.created,
    });

    return NextResponse.json({ ok: true, event: payload.type, ...result });
  }

  return NextResponse.json({ ok: true, ignored: payload.type });
}

/** Dev-only: provision org for current session */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const { auth, currentUser } = await import("@clerk/nextjs/server");
  const { userId } = await auth();
  const user = await currentUser();
  if (!userId || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = user.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user.fullName ??
    [user.firstName, user.lastName].filter(Boolean).join(" ") ??
    email;

  const result = await provisionOrganisation({
    clerkUserId: userId,
    email,
    name,
  });

  return NextResponse.json(result);
}
