import type { MembershipProfile } from "./membership-profile";

/**
 * Enrich memberships with Clerk account name/image.
 * Server-only — keep out of the platform-core barrel so client catalogs
 * can import manifests/guides without pulling `@clerk/nextjs/server`.
 */
export async function enrichMembersWithClerkAccount(
  members: MembershipProfile[],
): Promise<MembershipProfile[]> {
  if (!members.length) return members;

  try {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    const ids = [...new Set(members.map((m) => m.clerkUserId).filter(Boolean))];
    if (!ids.length) return members;

    const users = await client.users.getUserList({ userId: ids, limit: 100 });
    const byId = new Map(users.data.map((u) => [u.id, u]));

    return members.map((m) => {
      const user = byId.get(m.clerkUserId);
      if (!user) return m;
      const clerkName =
        user.fullName ||
        [user.firstName, user.lastName].filter(Boolean).join(" ") ||
        user.primaryEmailAddress?.emailAddress ||
        null;
      return {
        ...m,
        displayName: m.displayName?.trim() || clerkName,
        email: m.email || user.primaryEmailAddress?.emailAddress || null,
        clerkImageUrl: user.imageUrl || null,
      };
    });
  } catch {
    return members;
  }
}

function splitDisplayName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "" };
  return {
    firstName: parts[0]!,
    lastName: parts.slice(1).join(" "),
  };
}

/**
 * Push team profile name + photo back to the Clerk Account (self-service sync).
 * Photo: fetch the public URL and set as Clerk profile image.
 */
export async function pushMembershipProfileToClerk(input: {
  clerkUserId: string;
  displayName?: string | null;
  avatarUrl?: string | null;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();

    const name = input.displayName?.trim();
    if (name) {
      const { firstName, lastName } = splitDisplayName(name);
      await client.users.updateUser(input.clerkUserId, {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      });
    }

    const avatarUrl = input.avatarUrl?.trim();
    if (avatarUrl && /^https?:\/\//i.test(avatarUrl)) {
      const imageRes = await fetch(avatarUrl, { cache: "no-store" });
      if (!imageRes.ok) {
        return {
          ok: false,
          message: `Could not fetch profile photo (HTTP ${imageRes.status})`,
        };
      }
      const bytes = await imageRes.arrayBuffer();
      const contentType = imageRes.headers.get("content-type") || "image/png";
      const file = new File([bytes], "avatar", { type: contentType });
      await client.users.updateUserProfileImage(input.clerkUserId, { file });
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Clerk sync failed";
    return { ok: false, message };
  }
}
