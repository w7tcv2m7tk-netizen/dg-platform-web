import assert from "node:assert/strict";
import { it } from "node:test";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bookingsUrl = pathToFileURL(
  path.join(__dirname, "../packages/platform-core/src/accommodation/bookings.ts"),
).href;

process.env.DATABASE_URL = process.env.DATABASE_URL || "postgres://booking-unit-test/none";

const ORG = "org_a";
const UNIT = "unit_1";
const d = (iso) => new Date(`${iso}T00:00:00.000Z`);

function booking(overrides = {}) {
  const now = new Date("2026-01-01T00:00:00.000Z");
  return {
    id: "b1",
    organisationId: ORG,
    externalWpId: null,
    accommodationUnitId: UNIT,
    accommodationWpId: 42,
    contactId: null,
    ref: null,
    guestName: "Existing Guest",
    email: null,
    phone: null,
    accommodationName: "Unit 1",
    checkin: d("2026-09-05"),
    checkout: d("2026-09-10"),
    status: "confirmed",
    totalCents: null,
    metadata: {},
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeClient(seed) {
  const rows = seed.map((row) => ({ ...row }));

  const client = {
    stayBooking: {
      async findFirst({ where }) {
        return (
          rows.find(
            (row) =>
              (!where.id || row.id === where.id) &&
              (!where.organisationId || row.organisationId === where.organisationId) &&
              (where.externalWpId === undefined || row.externalWpId === where.externalWpId),
          ) ?? null
        );
      },
      async findMany({ where, take }) {
        const matches = rows.filter((row) => {
          if (row.organisationId !== where.organisationId) return false;
          if (where.id?.not && row.id === where.id.not) return false;
          if (where.status?.notIn?.includes(row.status)) return false;
          if (!(row.checkin < where.checkin.lt && row.checkout > where.checkout.gt)) return false;
          return where.OR.some(
            (clause) =>
              (clause.accommodationUnitId !== undefined &&
                row.accommodationUnitId === clause.accommodationUnitId) ||
              (clause.accommodationWpId !== undefined &&
                row.accommodationWpId === clause.accommodationWpId),
          );
        });
        return matches.slice(0, take ?? matches.length);
      },
      async update({ where, data }) {
        const row = rows.find((item) => item.id === where.id);
        if (!row) throw new Error(`booking ${where.id} not found`);
        Object.assign(row, data, { updatedAt: new Date() });
        return row;
      },
    },
    async $executeRaw() {
      return 0;
    },
    async $transaction(fn) {
      return fn(client);
    },
  };

  return { client, rows };
}

it("same-unit booking edit succeeds", async () => {
  const { updateStayBooking } = await import(bookingsUrl);
  const store = makeClient([booking()]);

  const updated = await updateStayBooking(
    ORG,
    { platformId: "b1", accommodationWpId: 42, guestName: "Updated Guest" },
    { client: store.client },
  );

  assert.equal(updated?.guestName, "Updated Guest");
  assert.equal(store.rows[0].accommodationWpId, 42);
});

it("booking unit reassignment fails closed", async () => {
  const { StayBookingUnitReassignmentError, updateStayBooking } = await import(bookingsUrl);
  const store = makeClient([booking()]);

  await assert.rejects(
    updateStayBooking(
      ORG,
      { platformId: "b1", accommodationWpId: 99, guestName: "Must Not Apply" },
      { client: store.client },
    ),
    (error) => {
      assert.ok(error instanceof StayBookingUnitReassignmentError);
      assert.equal(error.code, "booking_unit_move_requires_atomic_operation");
      return true;
    },
  );

  assert.equal(store.rows[0].accommodationWpId, 42);
  assert.equal(store.rows[0].guestName, "Existing Guest");
});

it("H-9 overlap protection still rejects an overlapping date move", async () => {
  const { StayBookingConflictError, updateStayBooking } = await import(bookingsUrl);
  const store = makeClient([
    booking(),
    booking({
      id: "b2",
      guestName: "Other Guest",
      checkin: d("2026-09-12"),
      checkout: d("2026-09-15"),
    }),
  ]);

  await assert.rejects(
    updateStayBooking(
      ORG,
      { platformId: "b1", accommodationWpId: 42, checkin: "2026-09-13", checkout: "2026-09-14" },
      { client: store.client },
    ),
    StayBookingConflictError,
  );

  assert.equal(store.rows[0].checkin.toISOString().slice(0, 10), "2026-09-05");
  assert.equal(store.rows[0].checkout.toISOString().slice(0, 10), "2026-09-10");
});
