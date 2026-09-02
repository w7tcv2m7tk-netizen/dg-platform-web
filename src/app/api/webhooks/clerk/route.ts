import { verifyWebhook } from "@clerk/backend/webhooks";
import { claimTeamInvitesForUser, parseTeamInviteMetadata } from "@dg/platform-core";
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
    const invite = parseTeamInviteMetadata({
      ...((data.public_metadata as Record<string, unknown> | undefined) ?? {}),
      ...((data.unsafe_metadata as Record<string, unknown> | undefined) ?? {}),
    });

    if (!clerkUserId || !email) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    // Clerk user creation must never create a tenant implicitly. Organisation
    // creation belongs to the explicit onboarding/create flow. The only
    // exception here is a legitimate team invitation, which activates the
    // invited membership without creating a new organisation.
    const claimedInvite = await claimTeamInvitesForUser({
      clerkUserId,
      email,
      name,
      organisationId: invite.organisationId,
      role: invite.role,
    });

    console.info("[Clerk webhook] user.created handled", {
      clerkUserId,
      email,
      claimedOrganisationId: claimedInvite?.organisationId ?? null,
      joinedViaInvite: Boolean(claimedInvite),
    });

    return NextResponse.json({
      ok: true,
      event: payload.type,
      claimedInvite: claimedInvite
        ? {
            organisationId: claimedInvite.organisationId,
            membershipId: claimedInvite.membershipId,
            slug: claimedInvite.slug,
            role: claimedInvite.role,
          }
        : null,
    });
  }

  return NextResponse.json({ ok: true, ignored: payload.type });
}
