import "dotenv/config";

const OLD_CLERK_USER_ID = process.env.OLD_CLERK_USER_ID;
const NEW_CLERK_USER_ID = process.env.NEW_CLERK_USER_ID;
const CONFIRM = process.env.IDENTITY_RECOVERY_CONFIRM;
const EXECUTE = process.env.IDENTITY_RECOVERY_EXECUTE === "YES";

if (!OLD_CLERK_USER_ID || !NEW_CLERK_USER_ID) {
  throw new Error("Set OLD_CLERK_USER_ID and NEW_CLERK_USER_ID before running identity recovery.");
}
if (OLD_CLERK_USER_ID === NEW_CLERK_USER_ID) {
  throw new Error("Old and new Clerk user IDs must be different.");
}
if (CONFIRM !== "I_UNDERSTAND_IDENTITY_RECOVERY") {
  throw new Error("Set IDENTITY_RECOVERY_CONFIRM=I_UNDERSTAND_IDENTITY_RECOVERY to run this recovery.");
}
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}

const { prisma } = await import("@dg/database");

const OLD_ORGS = [
  "DigitalGate",
  "Roe Realty",
  "Currumbin Valley Hideaway",
  "Aëtherra",
  "Wantd",
];

try {
  const oldMemberships = await prisma.membership.findMany({
    where: { clerkUserId: OLD_CLERK_USER_ID, status: "active" },
    include: { organisation: true },
    orderBy: { createdAt: "asc" },
  });

  const oldOrgNames = oldMemberships.map((m) => m.organisation.name);
  const missing = OLD_ORGS.filter((name) => !oldOrgNames.includes(name));
  if (missing.length) {
    throw new Error(`Safety check failed: old identity is missing expected active memberships: ${missing.join(", ")}`);
  }
  if (oldMemberships.length !== OLD_ORGS.length) {
    throw new Error(`Safety check failed: expected exactly ${OLD_ORGS.length} active old-identity memberships, found ${oldMemberships.length}.`);
  }

  const newMemberships = await prisma.membership.findMany({
    where: { clerkUserId: NEW_CLERK_USER_ID },
    include: { organisation: true },
    orderBy: { createdAt: "asc" },
  });

  const newActiveNames = newMemberships.filter((m) => m.status === "active").map((m) => m.organisation.name);
  if (newActiveNames.some((name) => name !== "Wantd")) {
    throw new Error(`Safety check failed: new identity has unexpected active memberships: ${newActiveNames.join(", ")}`);
  }

  const originalWantd = oldMemberships.find((m) => m.organisation.name === "Wantd");
  if (!originalWantd) {
    throw new Error("Safety check failed: original Wantd membership was not found.");
  }

  const conflictingNewWantd = newMemberships.find(
    (m) => m.organisationId === originalWantd.organisationId && m.clerkUserId === NEW_CLERK_USER_ID,
  );

  console.log(EXECUTE ? "EXECUTION MODE" : "DRY-RUN MODE");
  console.log(`Old Clerk identity: ${OLD_CLERK_USER_ID}`);
  console.log(`New Clerk identity: ${NEW_CLERK_USER_ID}`);
  console.log(`Memberships to remap: ${oldMemberships.map((m) => m.organisation.name).join(", ")}`);
  console.log(`Stale original-Wantd membership for new identity: ${conflictingNewWantd ? "YES (will be deleted)" : "NO"}`);
  console.log("Wantd-1 organisation: PRESERVED");

  if (!EXECUTE) {
    console.log("Dry run complete. No database changes were made.");
    console.log("To execute the verified transaction, set IDENTITY_RECOVERY_EXECUTE=YES.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    // The duplicate identity has a removed seat on the original Wantd organisation.
    // Remove only that stale membership so the composite uniqueness constraint permits the remap.
    if (conflictingNewWantd) {
      await tx.membership.delete({ where: { id: conflictingNewWantd.id } });
    }

    const result = await tx.membership.updateMany({
      where: {
        clerkUserId: OLD_CLERK_USER_ID,
        status: "active",
      },
      data: {
        clerkUserId: NEW_CLERK_USER_ID,
      },
    });

    if (result.count !== OLD_ORGS.length) {
      throw new Error(`Recovery rolled back: expected ${OLD_ORGS.length} memberships to move, moved ${result.count}.`);
    }
  });

  const finalMemberships = await prisma.membership.findMany({
    where: { clerkUserId: NEW_CLERK_USER_ID, status: "active" },
    include: { organisation: true },
    orderBy: { createdAt: "asc" },
  });

  const finalNames = finalMemberships.map((m) => m.organisation.name);
  for (const expected of [...OLD_ORGS, "Wantd"]) {
    if (!finalNames.includes(expected)) {
      throw new Error(`Post-recovery verification failed: ${expected} is not visible to the new identity.`);
    }
  }

  console.log("Identity recovery completed successfully.");
  console.log(`New Clerk identity: ${NEW_CLERK_USER_ID}`);
  console.log(`Active organisations: ${finalNames.join(", ")}`);
  console.log("The accidental Wantd-1 organisation was not deleted by this script.");
} finally {
  await prisma.$disconnect();
}
