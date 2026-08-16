/**
 * Accommodation Guest = Contact + app context.
 * Never a Universal Object / parallel people type.
 * @see docs/foundations/CONTACTS-AND-APP-ROLES.md
 */

import type { Prisma } from "@dg/database";

import { ensureContactForLeadFields } from "../contacts";
import { parseHideawayCircleMeta } from "./hideaway-circle-emails";

const REPEAT_STAY_THRESHOLD = 2;
const VIP_SPEND_CENTS = 250_000; // $2,500 AUD

export interface AccommodationGuestListItem {
  contactId: string;
  displayName: string;
  email?: string | null;
  phone?: string | null;
  role: "Guest";
  stayCount: number;
  totalSpendCents: number;
  lastStayAt?: string | null;
  nextStayAt?: string | null;
  favouriteUnit?: string | null;
  vip: boolean;
  repeatGuest: boolean;
  hideawayCircle: boolean;
  marketingConsent?: boolean | null;
  legacyWpGuestId?: number | null;
}

export interface AccommodationGuestDetail extends AccommodationGuestListItem {
  preferences?: string | null;
  specialRequests?: string | null;
  guestNotes?: string | null;
  hideawayCircleJoinedAt?: string | null;
  hideawayCircleInterests?: string[];
  hideawayCircleTopics?: string[];
  birthdayMonth?: number | null;
  anniversaryDate?: string | null;
  hideawayCircleRewardPercent?: number | null;
  bookings: Array<{
    id: string;
    ref?: string | null;
    accommodationName?: string | null;
    checkin?: string | null;
    checkout?: string | null;
    status: string;
    totalCents?: number | null;
  }>;
  upcomingBookings: Array<{
    id: string;
    ref?: string | null;
    accommodationName?: string | null;
    checkin?: string | null;
    checkout?: string | null;
    status: string;
    totalCents?: number | null;
  }>;
}

function formatDay(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

function favouriteUnitFromBookings(
  bookings: Array<{ accommodationName: string | null }>,
): string | null {
  const counts = new Map<string, number>();
  for (const b of bookings) {
    const name = b.accommodationName?.trim();
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [name, count] of counts) {
    if (count > bestCount) {
      best = name;
      bestCount = count;
    }
  }
  return best;
}

async function ensureGuestProfile(input: {
  organisationId: string;
  contactId: string;
  legacyWpGuestId?: number | null;
  favouriteUnit?: string | null;
}): Promise<void> {
  const { prisma } = await import("@dg/database");
  const existing = await prisma.accommodationGuestProfile.findUnique({
    where: { contactId: input.contactId },
  });

  if (existing) {
    if (existing.organisationId !== input.organisationId) return;
    const data: Prisma.AccommodationGuestProfileUpdateInput = {};
    if (input.legacyWpGuestId != null && existing.legacyWpGuestId == null) {
      data.legacyWpGuestId = input.legacyWpGuestId;
    }
    if (input.favouriteUnit && !existing.favouriteUnit) {
      data.favouriteUnit = input.favouriteUnit;
    }
    if (Object.keys(data).length > 0) {
      await prisma.accommodationGuestProfile.update({
        where: { id: existing.id },
        data,
      });
    }
    return;
  }

  try {
    await prisma.accommodationGuestProfile.create({
      data: {
        organisationId: input.organisationId,
        contactId: input.contactId,
        legacyWpGuestId: input.legacyWpGuestId ?? null,
        favouriteUnit: input.favouriteUnit ?? null,
      },
    });
  } catch {
    // Unique race or legacyWpGuestId conflict — ignore; list path re-reads.
  }
}

/**
 * Ensure Contact (+ guest profile) for a booking guest and return contactId.
 */
export async function ensureContactForStayGuest(input: {
  organisationId: string;
  actorId?: string;
  guestName?: string;
  email?: string | null;
  phone?: string | null;
  legacyWpGuestId?: number | null;
  favouriteUnit?: string | null;
}): Promise<string | null> {
  const ensured = await ensureContactForLeadFields({
    organisationId: input.organisationId,
    actorId: input.actorId,
    name: input.guestName,
    email: input.email ?? undefined,
    phone: input.phone ?? undefined,
    source: "accommodation",
  });
  if (!ensured) return null;

  await ensureGuestProfile({
    organisationId: input.organisationId,
    contactId: ensured.id,
    legacyWpGuestId: input.legacyWpGuestId,
    favouriteUnit: input.favouriteUnit,
  });

  return ensured.id;
}

/**
 * Link StayBooking → Contact and ensure AccommodationGuestProfile.
 */
export async function linkStayBookingToContact(
  organisationId: string,
  stayBookingId: string,
  options?: { actorId?: string; legacyWpGuestId?: number | null },
): Promise<string | null> {
  const { prisma } = await import("@dg/database");
  const booking = await prisma.stayBooking.findFirst({
    where: { id: stayBookingId, organisationId },
  });
  if (!booking) return null;

  if (booking.contactId) {
    await ensureGuestProfile({
      organisationId,
      contactId: booking.contactId,
      legacyWpGuestId: options?.legacyWpGuestId,
      favouriteUnit: booking.accommodationName,
    });
    return booking.contactId;
  }

  const contactId = await ensureContactForStayGuest({
    organisationId,
    actorId: options?.actorId,
    guestName: booking.guestName,
    email: booking.email,
    phone: booking.phone,
    legacyWpGuestId: options?.legacyWpGuestId,
    favouriteUnit: booking.accommodationName,
  });
  if (!contactId) return null;

  await prisma.stayBooking.update({
    where: { id: booking.id },
    data: { contactId },
  });
  return contactId;
}

export async function ensureContactsForOrganisationStayBookings(
  organisationId: string,
  options?: { actorId?: string; limit?: number },
): Promise<{ linked: number; skipped: number }> {
  const { prisma } = await import("@dg/database");
  const limit = Math.min(options?.limit ?? 200, 500);
  const bookings = await prisma.stayBooking.findMany({
    where: { organisationId, contactId: null },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  let linked = 0;
  let skipped = 0;
  for (const booking of bookings) {
    const contactId = await linkStayBookingToContact(organisationId, booking.id, {
      actorId: options?.actorId,
    });
    if (contactId) linked += 1;
    else skipped += 1;
  }
  return { linked, skipped };
}

/**
 * Upsert Contact + guest profile from a WordPress guest row (connector bridge).
 */
export async function upsertGuestFromWpRow(
  organisationId: string,
  guest: {
    id: number;
    name?: string;
    email?: string;
    phone?: string;
    total_stays?: number;
    vip?: boolean;
    notes?: string;
    preferences?: string;
    special_requests?: string;
    tags?: string;
    address?: string;
    source?: string;
    contact_id?: string | null;
  },
  options?: { actorId?: string },
): Promise<AccommodationGuestListItem | null> {
  const { prisma } = await import("@dg/database");

  let contactId: string | null = null;
  if (guest.contact_id?.trim()) {
    const existing = await prisma.contact.findFirst({
      where: {
        id: guest.contact_id.trim(),
        organisationId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (existing) {
      contactId = existing.id;
      await ensureGuestProfile({
        organisationId,
        contactId,
        legacyWpGuestId: guest.id,
      });
    }
  }

  if (!contactId) {
    contactId = await ensureContactForStayGuest({
      organisationId,
      actorId: options?.actorId,
      guestName: guest.name,
      email: guest.email,
      phone: guest.phone,
      legacyWpGuestId: guest.id,
    });
  }
  if (!contactId) return null;

  const profilePatch: Prisma.AccommodationGuestProfileUpdateInput = {
    legacyWpGuestId: guest.id,
  };
  if (guest.vip !== undefined) profilePatch.vip = Boolean(guest.vip);
  if (guest.notes !== undefined) profilePatch.guestNotes = guest.notes.trim() || null;
  if (guest.preferences !== undefined) {
    profilePatch.preferences = guest.preferences.trim() || null;
  }
  if (guest.special_requests !== undefined) {
    profilePatch.specialRequests = guest.special_requests.trim() || null;
  }

  try {
    await prisma.accommodationGuestProfile.update({
      where: { contactId },
      data: profilePatch,
    });
  } catch {
    await ensureGuestProfile({
      organisationId,
      contactId,
      legacyWpGuestId: guest.id,
    });
    if (guest.vip !== undefined || guest.notes !== undefined || guest.preferences !== undefined || guest.special_requests !== undefined) {
      await prisma.accommodationGuestProfile.update({
        where: { contactId },
        data: {
          ...(guest.vip !== undefined ? { vip: Boolean(guest.vip) } : {}),
          ...(guest.notes !== undefined
            ? { guestNotes: guest.notes.trim() || null }
            : {}),
          ...(guest.preferences !== undefined
            ? { preferences: guest.preferences.trim() || null }
            : {}),
          ...(guest.special_requests !== undefined
            ? { specialRequests: guest.special_requests.trim() || null }
            : {}),
        },
      });
    }
  }

  // Attach any unlinked bookings that match email/name
  const email = guest.email?.trim().toLowerCase() || null;
  if (email) {
    await prisma.stayBooking.updateMany({
      where: {
        organisationId,
        contactId: null,
        email: { equals: email, mode: "insensitive" },
      },
      data: { contactId },
    });
  }

  const detail = await getAccommodationGuest(organisationId, contactId);
  return detail;
}

function buildListItem(input: {
  contact: {
    id: string;
    firstName: string;
    lastName: string | null;
    email: string | null;
    phone: string | null;
  };
  profile: {
    vip: boolean;
    marketingConsent: boolean | null;
    favouriteUnit: string | null;
    legacyWpGuestId: number | null;
    metadata?: unknown;
  } | null;
  bookings: Array<{
    checkin: Date | null;
    accommodationName: string | null;
    totalCents: number | null;
    status: string;
  }>;
}): AccommodationGuestListItem {
  const now = new Date();
  const completed = input.bookings.filter(
    (b) => b.status !== "cancelled" && b.status !== "canceled",
  );
  const stayCount = completed.length;
  const totalSpendCents = completed.reduce((sum, b) => sum + (b.totalCents ?? 0), 0);

  const past = completed
    .filter((b) => b.checkin && b.checkin.getTime() <= now.getTime())
    .sort((a, b) => (b.checkin?.getTime() ?? 0) - (a.checkin?.getTime() ?? 0));
  const upcoming = completed
    .filter((b) => b.checkin && b.checkin.getTime() > now.getTime())
    .sort((a, b) => (a.checkin?.getTime() ?? 0) - (b.checkin?.getTime() ?? 0));

  const favouriteUnit =
    input.profile?.favouriteUnit ?? favouriteUnitFromBookings(completed);
  const repeatGuest = stayCount >= REPEAT_STAY_THRESHOLD;
  const vip = Boolean(input.profile?.vip) || totalSpendCents >= VIP_SPEND_CENTS || stayCount >= 5;
  const hideawayCircle = Boolean(parseHideawayCircleMeta(input.profile?.metadata));

  return {
    contactId: input.contact.id,
    displayName: [input.contact.firstName, input.contact.lastName].filter(Boolean).join(" "),
    email: input.contact.email,
    phone: input.contact.phone,
    role: "Guest",
    stayCount,
    totalSpendCents,
    lastStayAt: formatDay(past[0]?.checkin),
    nextStayAt: formatDay(upcoming[0]?.checkin),
    favouriteUnit,
    vip,
    repeatGuest,
    hideawayCircle,
    marketingConsent: input.profile?.marketingConsent ?? null,
    legacyWpGuestId: input.profile?.legacyWpGuestId ?? null,
  };
}

export async function listAccommodationGuests(
  organisationId: string,
  options?: { limit?: number; search?: string },
): Promise<{ items: AccommodationGuestListItem[]; meta: { total: number } }> {
  const { prisma } = await import("@dg/database");
  await ensureContactsForOrganisationStayBookings(organisationId, {
    limit: options?.limit ?? 200,
  });

  const limit = Math.min(options?.limit ?? 100, 200);
  const search = options?.search?.trim();

  const profiles = await prisma.accommodationGuestProfile.findMany({
    where: {
      organisationId,
      ...(search
        ? {
            contact: {
              OR: [
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    },
    include: {
      contact: true,
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  // Also include contacts that have stay bookings but somehow no profile yet
  const profileContactIds = new Set(profiles.map((p) => p.contactId));
  const orphanBookings = await prisma.stayBooking.findMany({
    where: {
      organisationId,
      AND: [
        { contactId: { not: null } },
        ...(profileContactIds.size
          ? [{ contactId: { notIn: [...profileContactIds] } }]
          : []),
      ],
    },
    select: { contactId: true },
    distinct: ["contactId"],
    take: limit,
  });

  for (const row of orphanBookings) {
    if (!row.contactId || profileContactIds.has(row.contactId)) continue;
    await ensureGuestProfile({ organisationId, contactId: row.contactId });
  }

  const refreshed =
    orphanBookings.length > 0
      ? await prisma.accommodationGuestProfile.findMany({
          where: {
            organisationId,
            ...(search
              ? {
                  contact: {
                    OR: [
                      { firstName: { contains: search, mode: "insensitive" } },
                      { lastName: { contains: search, mode: "insensitive" } },
                      { email: { contains: search, mode: "insensitive" } },
                      { phone: { contains: search, mode: "insensitive" } },
                    ],
                  },
                }
              : {}),
          },
          include: { contact: true },
          orderBy: { updatedAt: "desc" },
          take: limit,
        })
      : profiles;

  const contactIds = refreshed.map((p) => p.contactId);
  const bookings = contactIds.length
    ? await prisma.stayBooking.findMany({
        where: { organisationId, contactId: { in: contactIds } },
        orderBy: { checkin: "desc" },
      })
    : [];

  const byContact = new Map<string, typeof bookings>();
  for (const b of bookings) {
    if (!b.contactId) continue;
    const list = byContact.get(b.contactId) ?? [];
    list.push(b);
    byContact.set(b.contactId, list);
  }

  const items = refreshed
    .filter((p) => p.contact.deletedAt == null)
    .map((p) =>
      buildListItem({
        contact: p.contact,
        profile: p,
        bookings: byContact.get(p.contactId) ?? [],
      }),
    )
    .sort((a, b) => {
      const aKey = a.lastStayAt ?? a.nextStayAt ?? "";
      const bKey = b.lastStayAt ?? b.nextStayAt ?? "";
      return bKey.localeCompare(aKey);
    });

  return { items, meta: { total: items.length } };
}

export async function getAccommodationGuest(
  organisationId: string,
  contactId: string,
): Promise<AccommodationGuestDetail | null> {
  const { prisma } = await import("@dg/database");
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, organisationId, deletedAt: null },
  });
  if (!contact) return null;

  let profile = await prisma.accommodationGuestProfile.findUnique({
    where: { contactId },
  });
  if (profile && profile.organisationId !== organisationId) {
    return null;
  }

  const bookings = await prisma.stayBooking.findMany({
    where: { organisationId, contactId },
    orderBy: { checkin: "desc" },
  });

  if (!profile && bookings.length === 0) {
    // Allow opening guest detail only when Accommodation relationship exists
    return null;
  }

  if (!profile) {
    await ensureGuestProfile({
      organisationId,
      contactId,
      favouriteUnit: favouriteUnitFromBookings(bookings),
    });
    profile = await prisma.accommodationGuestProfile.findUnique({
      where: { contactId },
    });
  }

  const listItem = buildListItem({
    contact,
    profile,
    bookings,
  });

  const now = Date.now();
  const mapped = bookings.map((b) => ({
    id: b.id,
    ref: b.ref,
    accommodationName: b.accommodationName,
    checkin: formatDay(b.checkin),
    checkout: formatDay(b.checkout),
    status: b.status,
    totalCents: b.totalCents,
  }));

  const circle = parseHideawayCircleMeta(profile?.metadata);

  return {
    ...listItem,
    preferences: profile?.preferences ?? null,
    specialRequests: profile?.specialRequests ?? null,
    guestNotes: profile?.guestNotes ?? null,
    hideawayCircleJoinedAt: circle?.joinedAt ?? null,
    hideawayCircleInterests: circle?.interests ?? [],
    hideawayCircleTopics: circle?.topics ?? [],
    birthdayMonth: circle?.birthdayMonth ?? null,
    anniversaryDate: circle?.anniversaryDate ?? null,
    hideawayCircleRewardPercent: circle?.rewardPercent ?? null,
    bookings: mapped,
    upcomingBookings: mapped.filter((b) => {
      if (!b.checkin) return false;
      return new Date(`${b.checkin}T00:00:00`).getTime() > now;
    }),
  };
}

export async function getContactAccommodationGuestPanel(
  organisationId: string,
  contactId: string,
): Promise<AccommodationGuestDetail | null> {
  return getAccommodationGuest(organisationId, contactId);
}

export async function updateAccommodationGuestProfile(
  organisationId: string,
  contactId: string,
  input: {
    vip?: boolean;
    marketingConsent?: boolean | null;
    preferences?: string | null;
    specialRequests?: string | null;
    guestNotes?: string | null;
    favouriteUnit?: string | null;
    /** Staff toggle for Hideaway Circle membership */
    hideawayCircle?: boolean;
    birthdayMonth?: number | null;
    anniversaryDate?: string | null;
    hideawayCircleInterests?: string[];
    hideawayCircleTopics?: string[];
    /** Optional Contact identity fields */
    displayName?: string;
    email?: string | null;
    phone?: string | null;
    /** Mirror VIP/notes/prefs to WordPress guest when linked or email-matched */
    syncWp?: {
      patchWp: (updates: Array<Record<string, unknown>>) => Promise<unknown>;
    };
  },
): Promise<
  | (AccommodationGuestDetail & {
      wpSync?: {
        attempted: boolean;
        ok: boolean;
        updatedCount: number;
        skippedCount: number;
        message?: string;
      };
    })
  | null
> {
  const { prisma } = await import("@dg/database");
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, organisationId, deletedAt: null },
  });
  if (!contact) return null;

  await ensureGuestProfile({ organisationId, contactId });

  const profileData: Prisma.AccommodationGuestProfileUpdateInput = {};
  if (input.vip !== undefined) profileData.vip = Boolean(input.vip);
  if (input.marketingConsent !== undefined) {
    profileData.marketingConsent = input.marketingConsent;
  }
  if (input.preferences !== undefined) {
    profileData.preferences = input.preferences?.trim() || null;
  }
  if (input.specialRequests !== undefined) {
    profileData.specialRequests = input.specialRequests?.trim() || null;
  }
  if (input.guestNotes !== undefined) {
    profileData.guestNotes = input.guestNotes?.trim() || null;
  }
  if (input.favouriteUnit !== undefined) {
    profileData.favouriteUnit = input.favouriteUnit?.trim() || null;
  }

  const wantsCirclePatch =
    input.hideawayCircle !== undefined ||
    input.birthdayMonth !== undefined ||
    input.anniversaryDate !== undefined ||
    input.hideawayCircleInterests !== undefined ||
    input.hideawayCircleTopics !== undefined;

  if (wantsCirclePatch) {
    const existing = await prisma.accommodationGuestProfile.findUnique({
      where: { contactId },
    });
    const prev =
      existing?.metadata && typeof existing.metadata === "object"
        ? (existing.metadata as Record<string, unknown>)
        : {};
    const prevCircle = parseHideawayCircleMeta(existing?.metadata);
    if (input.hideawayCircle === false) {
      const rest = { ...prev };
      delete rest.hideawayCircle;
      profileData.metadata = rest as Prisma.InputJsonValue;
      if (input.marketingConsent === undefined) {
        profileData.marketingConsent = existing?.marketingConsent ?? null;
      }
    } else {
      const nextCircle = {
        joinedAt: prevCircle?.joinedAt ?? new Date().toISOString(),
        rewardPercent: prevCircle?.rewardPercent ?? 10,
        permanent: true as const,
        birthdayMonth:
          input.birthdayMonth !== undefined
            ? input.birthdayMonth ?? undefined
            : prevCircle?.birthdayMonth,
        anniversaryDate:
          input.anniversaryDate !== undefined
            ? input.anniversaryDate ?? undefined
            : prevCircle?.anniversaryDate,
        interests:
          input.hideawayCircleInterests ?? prevCircle?.interests ?? [],
        topics: input.hideawayCircleTopics ?? prevCircle?.topics ?? [],
        joinSource: prevCircle?.joinSource ?? "staff",
      };
      profileData.metadata = {
        ...prev,
        hideawayCircle: nextCircle,
      } as Prisma.InputJsonValue;
      if (input.hideawayCircle === true && input.marketingConsent === undefined) {
        profileData.marketingConsent = true;
      }
    }
  }

  if (Object.keys(profileData).length > 0) {
    await prisma.accommodationGuestProfile.update({
      where: { contactId },
      data: profileData,
    });
  }

  const contactData: Prisma.ContactUpdateInput = {};
  if (input.displayName !== undefined) {
    const parts = input.displayName.trim().split(/\s+/);
    contactData.firstName = parts[0] || contact.firstName;
    contactData.lastName = parts.slice(1).join(" ") || null;
  }
  if (input.email !== undefined) {
    contactData.email = input.email?.trim().toLowerCase() || null;
  }
  if (input.phone !== undefined) {
    contactData.phone = input.phone?.trim() || null;
  }
  if (Object.keys(contactData).length > 0) {
    await prisma.contact.update({ where: { id: contactId }, data: contactData });
  }

  const profile = await prisma.accommodationGuestProfile.findUnique({
    where: { contactId },
  });

  let wpSync: {
    attempted: boolean;
    ok: boolean;
    updatedCount: number;
    skippedCount: number;
    message?: string;
  } = { attempted: false, ok: true, updatedCount: 0, skippedCount: 0 };

  if (input.syncWp) {
    wpSync.attempted = true;
    const email = input.email !== undefined ? input.email : contact.email;
    const payload: Record<string, unknown> = {
      contact_id: contactId,
      vip: profile?.vip ?? false,
      notes: profile?.guestNotes ?? "",
      preferences: profile?.preferences ?? "",
      special_requests: profile?.specialRequests ?? "",
      name:
        input.displayName ??
        [contact.firstName, contact.lastName].filter(Boolean).join(" "),
      email,
      phone: input.phone !== undefined ? input.phone : contact.phone,
    };
    if (profile?.legacyWpGuestId != null) {
      payload.id = profile.legacyWpGuestId;
    }

    try {
      const result = (await input.syncWp.patchWp([payload])) as {
        ok?: boolean;
        data?: { ok?: boolean; updated?: unknown[]; skipped?: unknown[]; count?: number };
        code?: string;
        message?: string;
      } | null;

      // patchWp may return connector shape { ok, data } or raw WP body.
      const body =
        result && typeof result === "object" && "data" in result && result.data
          ? result.data
          : (result as { ok?: boolean; updated?: unknown[]; skipped?: unknown[]; count?: number } | null);

      if (result && "ok" in (result as object) && (result as { ok?: boolean }).ok === false) {
        wpSync = {
          attempted: true,
          ok: false,
          updatedCount: 0,
          skippedCount: 0,
          message: (result as { message?: string }).message ?? "WordPress sync failed",
        };
      } else {
        const updated = Array.isArray(body?.updated) ? body.updated.length : body?.count ?? 0;
        const skipped = Array.isArray(body?.skipped) ? body.skipped.length : 0;
        wpSync = {
          attempted: true,
          ok: updated > 0,
          updatedCount: updated,
          skippedCount: skipped,
          message:
            updated > 0
              ? `Synced to WordPress guest (#${updated})`
              : skipped > 0
                ? "No matching WordPress guest (link by email or sync guests first)"
                : "WordPress sync returned no updates",
        };

        // Persist legacy id when email/contact match succeeded.
        const first =
          Array.isArray(body?.updated) && body.updated[0] && typeof body.updated[0] === "object"
            ? (body.updated[0] as { id?: number })
            : null;
        if (first?.id && profile && profile.legacyWpGuestId == null) {
          await prisma.accommodationGuestProfile.update({
            where: { contactId },
            data: { legacyWpGuestId: first.id },
          });
        }
      }
    } catch (err) {
      wpSync = {
        attempted: true,
        ok: false,
        updatedCount: 0,
        skippedCount: 0,
        message: err instanceof Error ? err.message : "WordPress sync error",
      };
    }
  }

  const detail = await getAccommodationGuest(organisationId, contactId);
  if (!detail) return null;
  return { ...detail, wpSync };
}

/** Format LTV for Accommodation Guests list copy */
export function formatGuestSpendAud(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(dollars);
}

export function guestListSummaryLine(guest: AccommodationGuestListItem): string {
  const parts = [
    guest.displayName,
    guest.role,
    `${guest.stayCount} stay${guest.stayCount === 1 ? "" : "s"}`,
    `${formatGuestSpendAud(guest.totalSpendCents)} LTV`,
  ];
  if (guest.lastStayAt) parts.push(`Last stay ${guest.lastStayAt}`);
  if (guest.favouriteUnit) parts.push(guest.favouriteUnit);
  if (guest.repeatGuest) parts.push("Repeat Guest");
  if (guest.vip) parts.push("VIP");
  return parts.join(" · ");
}
