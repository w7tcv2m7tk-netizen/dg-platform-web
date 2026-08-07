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
        // Keep stored team avatar separate; UI falls back to clerkImageUrl.
        clerkImageUrl: user.imageUrl || null,
      };
    });
  } catch {
    return members;
  }
}
