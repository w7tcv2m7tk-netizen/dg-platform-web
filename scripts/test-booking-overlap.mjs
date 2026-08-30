/**
 * H-9 regression — booking overlap semantics and cross-channel protection.
 *
 * Three paths create StayBooking rows (direct Gen 2, WordPress ingestion, OTA
 * iCal import). Only the direct path checked availability, and it did so as a
 * read followed by a separate insert, so concurrent requests could both pass.
 * The import paths performed no check at all and silently created overlapping
 * rows.
 *
 * These tests pin the overlap definition and the per-unit serialisation, using
 * an in-memory stand-in for the Prisma client so the rules can be asserted
 * without a database.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const load = () =>
  import(
    pathToFileURL(
      path.join(
        __dirname,
        "../packages/platform-core/src/accommodation/booking-conflicts.ts",
      ),
    ).href
  );

const ORG_A = "org_a";
const ORG_B = "org_b";
const UNIT_1 = "unit_1";
const UNIT_2 = "unit_2";

const d = (iso) => new Date(`${iso}T00:00:00.000Z`);

/** Minimal in-memory stand-in implementing the query shape we rely on. */
function fakeDb(rows) {
  return {
    stayBooking: {
      async findMany({ where, take }) {
        const out = rows.filter((r) => {
          if (r.organisationId !== where.organisationId) return false;
          if (where.id?.not && r.id === where.id.not) return false;
          if (where.status?.notIn?.includes(r.status)) return false;

          const unitMatch = where.OR.some(
            (clause) =>
              (clause.accommodationUnitId !== undefined &&
                clause.accommodationUnitId === r.accommodationUnitId) ||
              (clause.accommodationWpId !== undefined &&
                clause.accommodationWpId === r.accommodationWpId),
          );
          if (!unitMatch) return false;

          if (!(r.checkin < where.checkin.lt)) return false;
          if (!(r.checkout > where.checkout.gt)) return false;
          return true;
        });
        return out.slice(0, take ?? out.length);
      },
    },
  };
}

function booking(over = {}) {
  return {
    id: "b1",
    organisationId: ORG_A,
    accommodationUnitId: UNIT_1,
    accommodationWpId: null,
    guestName: "Existing Guest",
    status: "confirmed",
    checkin: d("2026-09-05"),
    checkout: d("2026-09-10"),
    ...over,
  };
}

describe("H-9: overlap semantics", () => {
  it("sequential non-overlapping bookings do not conflict", async () => {
    const { findOverlappingBookings } = await load();
    const db = fakeDb([booking()]);

    const conflicts = await findOverlappingBookings(db, {
      organisationId: ORG_A,
      accommodationUnitId: UNIT_1,
      checkin: d("2026-09-12"),
      checkout: d("2026-09-15"),
    });
    assert.deepEqual(conflicts, []);
  });

  it("adjacent bookings are allowed — same-day turnover is legitimate", async () => {
    const { findOverlappingBookings } = await load();
    const db = fakeDb([booking()]);

    // Existing checks out 10 Sep; new checks in 10 Sep.
    const after = await findOverlappingBookings(db, {
      organisationId: ORG_A,
      accommodationUnitId: UNIT_1,
      checkin: d("2026-09-10"),
      checkout: d("2026-09-14"),
    });
    assert.deepEqual(after, []);

    // New checks out 5 Sep; existing checks in 5 Sep.
    const before = await findOverlappingBookings(db, {
      organisationId: ORG_A,
      accommodationUnitId: UNIT_1,
      checkin: d("2026-09-01"),
      checkout: d("2026-09-05"),
    });
    assert.deepEqual(before, []);
  });

  it("overlapping bookings conflict", async () => {
    const { findOverlappingBookings } = await load();
    const db = fakeDb([booking()]);

    for (const [checkin, checkout] of [
      ["2026-09-06", "2026-09-08"], // fully inside
      ["2026-09-04", "2026-09-06"], // straddles start
      ["2026-09-09", "2026-09-12"], // straddles end
      ["2026-09-01", "2026-09-20"], // encloses
    ]) {
      const conflicts = await findOverlappingBookings(db, {
        organisationId: ORG_A,
        accommodationUnitId: UNIT_1,
        checkin: d(checkin),
        checkout: d(checkout),
      });
      assert.equal(conflicts.length, 1, `${checkin}→${checkout} should conflict`);
    }
  });

  it("cancelled bookings do not block", async () => {
    const { findOverlappingBookings } = await load();

    for (const status of ["cancelled", "canceled"]) {
      const db = fakeDb([booking({ status })]);
      const conflicts = await findOverlappingBookings(db, {
        organisationId: ORG_A,
        accommodationUnitId: UNIT_1,
        checkin: d("2026-09-06"),
        checkout: d("2026-09-08"),
      });
      assert.deepEqual(conflicts, [], `${status} must not block`);
    }
  });

  it("pending bookings do block", async () => {
    const { findOverlappingBookings } = await load();
    const db = fakeDb([booking({ status: "pending" })]);

    const conflicts = await findOverlappingBookings(db, {
      organisationId: ORG_A,
      accommodationUnitId: UNIT_1,
      checkin: d("2026-09-06"),
      checkout: d("2026-09-08"),
    });
    assert.equal(conflicts.length, 1);
  });

  it("OTA and WordPress statuses block just like direct bookings", async () => {
    const { findOverlappingBookings } = await load();

    for (const status of ["airbnb", "bookingcom", "confirmed", "completed"]) {
      const db = fakeDb([booking({ status })]);
      const conflicts = await findOverlappingBookings(db, {
        organisationId: ORG_A,
        accommodationUnitId: UNIT_1,
        checkin: d("2026-09-06"),
        checkout: d("2026-09-08"),
      });
      assert.equal(conflicts.length, 1, `${status} should block`);
    }
  });

  it("different units may hold the same dates", async () => {
    const { findOverlappingBookings } = await load();
    const db = fakeDb([booking()]);

    const conflicts = await findOverlappingBookings(db, {
      organisationId: ORG_A,
      accommodationUnitId: UNIT_2,
      checkin: d("2026-09-06"),
      checkout: d("2026-09-08"),
    });
    assert.deepEqual(conflicts, []);
  });

  it("organisations cannot interfere with each other", async () => {
    const { findOverlappingBookings } = await load();
    const db = fakeDb([booking({ organisationId: ORG_B })]);

    const conflicts = await findOverlappingBookings(db, {
      organisationId: ORG_A,
      accommodationUnitId: UNIT_1,
      checkin: d("2026-09-06"),
      checkout: d("2026-09-08"),
    });
    assert.deepEqual(conflicts, []);
  });

  it("matches legacy WordPress unit ids as well as Gen 2 unit ids", async () => {
    const { findOverlappingBookings } = await load();
    const db = fakeDb([
      booking({ accommodationUnitId: null, accommodationWpId: 42 }),
    ]);

    const conflicts = await findOverlappingBookings(db, {
      organisationId: ORG_A,
      accommodationUnitId: UNIT_1,
      accommodationWpId: 42,
      checkin: d("2026-09-06"),
      checkout: d("2026-09-08"),
    });
    assert.equal(conflicts.length, 1);
  });

  it("excludes the row being updated", async () => {
    const { findOverlappingBookings } = await load();
    const db = fakeDb([booking()]);

    const conflicts = await findOverlappingBookings(db, {
      organisationId: ORG_A,
      accommodationUnitId: UNIT_1,
      checkin: d("2026-09-06"),
      checkout: d("2026-09-08"),
      excludeStayBookingId: "b1",
    });
    assert.deepEqual(conflicts, []);
  });
});

describe("H-9: per-unit serialisation key", () => {
  it("scopes the advisory lock to organisation and unit", async () => {
    const { unitBookingLockKey } = await load();

    assert.equal(unitBookingLockKey(ORG_A, UNIT_1), `stay-booking:${ORG_A}:${UNIT_1}`);
    assert.notEqual(
      unitBookingLockKey(ORG_A, UNIT_1),
      unitBookingLockKey(ORG_A, UNIT_2),
      "different units must not contend",
    );
    assert.notEqual(
      unitBookingLockKey(ORG_A, UNIT_1),
      unitBookingLockKey(ORG_B, UNIT_1),
      "different organisations must not contend",
    );
  });

  it("describes conflicts for operator surfaces", async () => {
    const { describeBookingConflict } = await load();

    const text = describeBookingConflict([
      {
        id: "b1",
        guestName: "Existing",
        status: "confirmed",
        checkin: d("2026-09-05"),
        checkout: d("2026-09-10"),
      },
    ]);
    assert.match(text, /b1/);
    assert.match(text, /2026-09-05/);
    assert.match(text, /2026-09-10/);
  });
});

describe("H-9 (Phase 3): unified conflict definition", () => {
  it("counts operator manual blocks as a conflict", async () => {
    const { findBookingConflicts } = await load();
    const db = fakeDb([]);

    const result = await findBookingConflicts(db, {
      organisationId: ORG_A,
      accommodationUnitId: UNIT_1,
      checkin: d("2026-09-06"),
      checkout: d("2026-09-09"),
      manualBlockedDates: ["2026-09-07"],
    });

    assert.equal(result.hasConflict, true);
    assert.deepEqual(result.blockedDates, ["2026-09-07"]);
    assert.deepEqual(result.bookings, []);
  });

  it("ignores manual blocks outside the requested nights", async () => {
    const { findBookingConflicts } = await load();
    const db = fakeDb([]);

    const result = await findBookingConflicts(db, {
      organisationId: ORG_A,
      accommodationUnitId: UNIT_1,
      checkin: d("2026-09-06"),
      checkout: d("2026-09-09"),
      // The checkout night itself is never occupied.
      manualBlockedDates: ["2026-09-09", "2026-09-20"],
    });

    assert.equal(result.hasConflict, false);
  });

  it("enumerates nights as a half-open interval", async () => {
    const { nightsBetween } = await load();

    assert.deepEqual(nightsBetween(d("2026-09-05"), d("2026-09-08")), [
      "2026-09-05",
      "2026-09-06",
      "2026-09-07",
    ]);
    // Zero-night range yields nothing.
    assert.deepEqual(nightsBetween(d("2026-09-05"), d("2026-09-05")), []);
  });

  it("treats both cancelled spellings as freeing the dates", async () => {
    const { isCancelledStayStatus } = await load();

    assert.equal(isCancelledStayStatus("cancelled"), true);
    assert.equal(isCancelledStayStatus("canceled"), true);
    assert.equal(isCancelledStayStatus("CANCELLED"), true);
    assert.equal(isCancelledStayStatus("pending"), false);
    assert.equal(isCancelledStayStatus("airbnb"), false);
    assert.equal(isCancelledStayStatus(null), false);
  });

  it("still reports an overlapping booking alongside a manual block", async () => {
    const { findBookingConflicts } = await load();
    const db = fakeDb([booking()]);

    const result = await findBookingConflicts(db, {
      organisationId: ORG_A,
      accommodationUnitId: UNIT_1,
      checkin: d("2026-09-06"),
      checkout: d("2026-09-08"),
      manualBlockedDates: ["2026-09-06"],
    });

    assert.equal(result.hasConflict, true);
    assert.equal(result.bookings.length, 1);
    assert.deepEqual(result.blockedDates, ["2026-09-06"]);
  });
});

describe("H-9 (Phase 3): manual blocks vs existing stays", () => {
  it("does not block an edit to a booking that already holds those nights", async () => {
    const { findBookingConflicts, nightsBetween } = await load();
    const db = fakeDb([]);

    const result = await findBookingConflicts(db, {
      organisationId: ORG_A,
      accommodationUnitId: UNIT_1,
      checkin: d("2026-09-05"),
      checkout: d("2026-09-08"),
      manualBlockedDates: ["2026-09-06"],
      incumbentNights: nightsBetween(d("2026-09-05"), d("2026-09-10")),
    });

    assert.equal(
      result.hasConflict,
      false,
      "shortening a stay that already sits on a blocked night must be allowed",
    );
  });

  it("still blocks newly requested nights that are manually blocked", async () => {
    const { findBookingConflicts, nightsBetween } = await load();
    const db = fakeDb([]);

    const result = await findBookingConflicts(db, {
      organisationId: ORG_A,
      accommodationUnitId: UNIT_1,
      checkin: d("2026-09-05"),
      checkout: d("2026-09-12"),
      manualBlockedDates: ["2026-09-11"],
      // Original stay ended before the blocked night, so extending onto it is new.
      incumbentNights: nightsBetween(d("2026-09-05"), d("2026-09-08")),
    });

    assert.equal(result.hasConflict, true);
    assert.deepEqual(result.blockedDates, ["2026-09-11"]);
  });
});
