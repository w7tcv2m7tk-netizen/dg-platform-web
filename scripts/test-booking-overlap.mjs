/** H-9 regression tests for the shared booking overlap definition. */
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
              (clause.accommodationUnitId !== undefined && clause.accommodationUnitId === r.accommodationUnitId) ||
              (clause.accommodationWpId !== undefined && clause.accommodationWpId === r.accommodationWpId),
          );
          if (!unitMatch) return false;
          return r.checkin < where.checkin.lt && r.checkout > where.checkout.gt;
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

describe("H-9 overlap semantics", () => {
  it("allows adjacent same-day turnover", async () => {
    const { findOverlappingBookings } = await load();
    const db = fakeDb([booking()]);
    assert.deepEqual(
      await findOverlappingBookings(db, {
        organisationId: ORG_A,
        accommodationUnitId: UNIT_1,
        checkin: d("2026-09-10"),
        checkout: d("2026-09-14"),
      }),
      [],
    );
  });

  it("rejects overlapping dates", async () => {
    const { findOverlappingBookings } = await load();
    const db = fakeDb([booking()]);
    for (const [checkin, checkout] of [
      ["2026-09-06", "2026-09-08"],
      ["2026-09-04", "2026-09-06"],
      ["2026-09-09", "2026-09-12"],
      ["2026-09-01", "2026-09-20"],
    ]) {
      const conflicts = await findOverlappingBookings(db, {
        organisationId: ORG_A,
        accommodationUnitId: UNIT_1,
        checkin: d(checkin),
        checkout: d(checkout),
      });
      assert.equal(conflicts.length, 1);
    }
  });

  it("does not let cancelled stays block", async () => {
    const { findOverlappingBookings } = await load();
    for (const status of ["cancelled", "canceled"]) {
      assert.deepEqual(
        await findOverlappingBookings(fakeDb([booking({ status })]), {
          organisationId: ORG_A,
          accommodationUnitId: UNIT_1,
          checkin: d("2026-09-06"),
          checkout: d("2026-09-08"),
        }),
        [],
      );
    }
  });

  it("treats pending, OTA and completed stays as blocking", async () => {
    const { findOverlappingBookings } = await load();
    for (const status of ["pending", "airbnb", "bookingcom", "confirmed", "completed"]) {
      const conflicts = await findOverlappingBookings(fakeDb([booking({ status })]), {
        organisationId: ORG_A,
        accommodationUnitId: UNIT_1,
        checkin: d("2026-09-06"),
        checkout: d("2026-09-08"),
      });
      assert.equal(conflicts.length, 1, `${status} should block`);
    }
  });

  it("scopes conflicts by organisation and unit", async () => {
    const { findOverlappingBookings } = await load();
    const db = fakeDb([booking()]);
    assert.deepEqual(await findOverlappingBookings(db, {
      organisationId: ORG_A,
      accommodationUnitId: UNIT_2,
      checkin: d("2026-09-06"),
      checkout: d("2026-09-08"),
    }), []);
    assert.deepEqual(await findOverlappingBookings(fakeDb([booking({ organisationId: ORG_B })]), {
      organisationId: ORG_A,
      accommodationUnitId: UNIT_1,
      checkin: d("2026-09-06"),
      checkout: d("2026-09-08"),
    }), []);
  });

  it("matches the legacy WordPress unit id", async () => {
    const { findOverlappingBookings } = await load();
    const conflicts = await findOverlappingBookings(fakeDb([
      booking({ accommodationUnitId: null, accommodationWpId: 42 }),
    ]), {
      organisationId: ORG_A,
      accommodationUnitId: UNIT_1,
      accommodationWpId: 42,
      checkin: d("2026-09-06"),
      checkout: d("2026-09-08"),
    });
    assert.equal(conflicts.length, 1);
  });

  it("can exclude the row being updated", async () => {
    const { findOverlappingBookings } = await load();
    assert.deepEqual(await findOverlappingBookings(fakeDb([booking()]), {
      organisationId: ORG_A,
      accommodationUnitId: UNIT_1,
      checkin: d("2026-09-06"),
      checkout: d("2026-09-08"),
      excludeStayBookingId: "b1",
    }), []);
  });
});

describe("H-9 lock key", () => {
  it("isolates organisation and unit", async () => {
    const { unitBookingLockKey } = await load();
    assert.notEqual(unitBookingLockKey(ORG_A, UNIT_1), unitBookingLockKey(ORG_A, UNIT_2));
    assert.notEqual(unitBookingLockKey(ORG_A, UNIT_1), unitBookingLockKey(ORG_B, UNIT_1));
  });
});
