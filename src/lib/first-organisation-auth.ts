type ClerkIdentity = {
  id: string;
  primaryEmailAddress?: {
    verification: { status: string } | null;
  } | null;
} | null;

export function matchesSignedInClerkIdentity(
  userId: string | null | undefined,
  user: ClerkIdentity,
): user is NonNullable<ClerkIdentity> {
  return Boolean(userId && user && user.id === userId);
}

export function hasVerifiedPrimaryEmail(user: ClerkIdentity): boolean {
  return user?.primaryEmailAddress?.verification?.status === "verified";
}
