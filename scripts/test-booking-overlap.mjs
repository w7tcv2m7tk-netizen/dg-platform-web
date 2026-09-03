/**
 * H-9 regression tests.
 *
 * Invariant: for a given organisation + accommodation unit, two ACTIVE bookings
 * must never overlap, including under concurrent requests/imports. Cancelled/
 * canceled stays are non-blocking and same-day turnover (checkout === next
 * checkin) is legal.
 *
 * Two layers are covered:
 *   1. the shared overlap definition (findOverlappingBookings / lock key), and
 *   2. every write path (create, update, WordPress import, OTA import), proving
 *      the overlap check and the create/update run inside the SAME advisory-
 *      locked transaction so concurrent writers cannot both succeed.
 *
 * A deterministic in-memory store models Prisma + the advisory lock: every
 * $transaction is serialised (as a per-unit lock would serialise writers) and
 * writes commit to the shared store, so "concurrent" attempts see each other.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcUrl = (rel) =>
  pathToFileURL(path.join(__dirname, "../packages/platform-core/src/accommodation", rel)).href;

const loadConflicts = () => import(srcUrl("booking-conflicts.ts"));
const loadBookings = () => import(srcUrl("bookings.ts"));
const loadIcal = () => import(srcUrl("ical-import.ts"));

// The write paths early-return unless DATABASE_URL is set; the injected client
// means it is never actually used to connect.
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgres://h9-test/none";

const ORG_A = "org_a";
const ORG_B = "org_b";
const UNIT_1 = "unit_1";
const UNIT_2 = "unit_2";
const d = (iso) => new Date(`${iso}T00:00:00.000Z`);

function fakeDb(rows) {
  return {
    stayBooking: {
      async findMany({ where, take }) {
        const out = rows.filter((r) => matchOverlapWhere(where, r));
        return out.slice(0, take ?? out.length);
      },
    },
  };
}

function matchOverlapWhere(where, r) {
  if (r.organisationId !== where.organisationId) return false;
  if (where.id?.not && r.id === where.id.not) return false;
  if (where.status?.notIn?.includes(r.status)) return false;
  const unitMatch = where.OR.some(
    (clause) =>
      (clause.accommodationUnitId !== undefined &&
        clause.accommodationUnitId === r.accommodationUnitId) ||
      (clause.accommodationWpId !== undefined && clause.accommodationWpId === r.accommodationWpId),
  );
  if (!unitMatch) return false;
  return r.checkin < where.checkin.lt && r.checkout > where.checkout.gt;
}

function booking(over = {}) {
  const now = new Date("2026-01-01T00:00:00.000Z");
  return {
    id: "b1",
    organisationId: ORG_A,
    externalWpId: null,
    accommodationUnitId: UNIT_1,
    accommodationWpId: null,
    contactId: null,
    ref: null,
    guestName: "Existing Guest",
    email: null,
    phone: null,
    accommodationName: "Unit 1",
    status: "confirmed",
    checkin: d("2026-09-05"),
    checkout: d("2026-09-10"),
    totalCents: null,
    metadata: {},
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}

/**
 * Lock-aware in-memory Prisma double. `$transaction` serialises like a per-unit
 * advisory lock; writes commit to the shared array so serialised transactions
 * observe each other. `lockHeld` is true only while a transaction body runs.
 */
function makeStore(seed = []) {
  let idSeq = 1;
  const rows = seed.map((r) => ({ ...r }));
  const units = [];
  const state = { lockHeld: false, fetchWhileLocked: 0 };
  let txChain = Promise.resolve();

  const stayBooking = {
    async findMany({ where, take }) {
      const out = rows.filter((r) => matchOverlapWhere(where, r));
      return out.slice(0, take ?? out.length);
    },
    async findFirst({ where }) {
      return (
        rows.find((r) => {
          if (where.id && r.id !== where.id) return false;
          if (where.organisationId && r.organisationId !== where.organisationId) return false;
          if (where.externalWpId !== undefined && r.externalWpId !== where.externalWpId) return false;
          if (
            where.accommodationUnitId !== undefined &&
            r.accommodationUnitId !== where.accommodationUnitId
          )
            return false;
          if (where.metadata) {
            const key = where.metadata.path?.[0];
            const meta = r.metadata ?? {};
            if (key && meta[key] !== where.metadata.equals) return false;
          }
          return true;
        }) ?? null
      );
    },
    async findUnique({ where, select }) {
      let row = null;
      if (where.id) row = rows.find((r) => r.id === where.id) ?? null;
      else if (where.organisationId_externalWpId) {
        const { organisationId, externalWpId } = where.organisationId_externalWpId;
        row =
          rows.find(
            (r) => r.organisationId === organisationId && r.externalWpId === externalWpId,
          ) ?? null;
      }
      if (row && select?.metadata && Object.keys(select).length === 1) {
        return { metadata: row.metadata };
      }
      return row;
    },
    async create({ data }) {
      const now = new Date();
      const row = {
        id: `sb_${idSeq++}`,
        externalWpId: null,
        contactId: null,
        ref: null,
        guestName: null,
        email: null,
        phone: null,
        accommodationName: null,
        accommodationWpId: null,
        accommodationUnitId: null,
        checkin: null,
        checkout: null,
        status: "pending",
        totalCents: null,
        metadata: {},
        createdAt: now,
        updatedAt: now,
        ...data,
      };
      rows.push(row);
      return row;
    },
    async update({ where, data }) {
      const row = rows.find((r) => r.id === where.id);
      if (!row) throw new Error(`stayBooking ${where.id} not found`);
      Object.assign(row, data, { updatedAt: new Date() });
      return row;
    },
  };

  const accommodationUnit = {
    async findFirst({ where }) {
      return (
        units.find(
          (u) =>
            (where.id ? u.id === where.id : true) &&
            (where.organisationId ? u.organisationId === where.organisationId : true),
        ) ?? null
      );
    },
    async findUnique({ where }) {
      if (where.organisationId_externalWpId) {
        const { organisationId, externalWpId } = where.organisationId_externalWpId;
        return (
          units.find(
            (u) => u.organisationId === organisationId && u.externalWpId === externalWpId,
          ) ?? null
        );
      }
      if (where.id) return units.find((u) => u.id === where.id) ?? null;
      return null;
    },
  };

  const client = {
    stayBooking,
    accommodationUnit,
    async $executeRaw() {
      state.lockHeld = true;
      return 0;
    },
    async $transaction(fn) {
      const run = txChain.then(async () => {
        try {
          return await fn(client);
        } finally {
          state.lockHeld = false;
        }
      });
      txChain = run.then(
        () => undefined,
        () => undefined,
      );
      return run;
    },
  };

  return {
    client,
    rows,
    state,
    addUnit(u) {
      units.push(u);
    },
    active(unitId = UNIT_1, organisationId = ORG_A) {
      return rows.filter(
        (r) =>
          r.organisationId === organisationId &&
          r.accommodationUnitId === unitId &&
          !["cancelled", "canceled"].includes(r.status),
      );
    },
  };
}

const noContact = async () => null;
const available = async () => ({ ok: true });

// ── Layer 1: overlap definition ────────────────────────────────────────────

describe("H-9 overlap semantics", () => {
  it("allows adjacent same-day turnover", async () => {
    const { findOverlappingBookings } = await loadConflicts();
    assert.deepEqual(
      await findOverlappingBookings(fakeDb([booking()]), {
        organisationId: ORG_A,
        accommodationUnitId: UNIT_1,
        checkin: d("2026-09-10"),
        checkout: d("2026-09-14"),
      }),
      [],
    );
  });

  it("rejects overlapping dates", async () => {
    const { findOverlappingBookings } = await loadConflicts();
    for (const [checkin, checkout] of [
      ["2026-09-06", "2026-09-08"],
      ["2026-09-04", "2026-09-06"],
      ["2026-09-09", "2026-09-12"],
      ["2026-09-01", "2026-09-20"],
    ]) {
      const conflicts = await findOverlappingBookings(fakeDb([booking()]), {
        organisationId: ORG_A,
        accommodationUnitId: UNIT_1,
        checkin: d(checkin),
        checkout: d(checkout),
      });
      assert.equal(conflicts.length, 1, `${checkin}->${checkout}`);
    }
  });

  it("does not let cancelled or canceled stays block", async () => {
    const { findOverlappingBookings } = await loadConflicts();
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
    const { findOverlappingBookings } = await loadConflicts();
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
    const { findOverlappingBookings } = await loadConflicts();
    assert.deepEqual(
      await findOverlappingBookings(fakeDb([booking()]), {
        organisationId: ORG_A,
        accommodationUnitId: UNIT_2,
        checkin: d("2026-09-06"),
        checkout: d("2026-09-08"),
      }),
      [],
      "different unit must not conflict",
    );
    assert.deepEqual(
      await findOverlappingBookings(fakeDb([booking({ organisationId: ORG_B })]), {
        organisationId: ORG_A,
        accommodationUnitId: UNIT_1,
        checkin: d("2026-09-06"),
        checkout: d("2026-09-08"),
      }),
      [],
      "different org must not conflict",
    );
  });

  it("matches the legacy WordPress unit id", async () => {
    const { findOverlappingBookings } = await loadConflicts();
    const conflicts = await findOverlappingBookings(
      fakeDb([booking({ accommodationUnitId: null, accommodationWpId: 42 })]),
      {
        organisationId: ORG_A,
        accommodationUnitId: UNIT_1,
        accommodationWpId: 42,
        checkin: d("2026-09-06"),
        checkout: d("2026-09-08"),
      },
    );
    assert.equal(conflicts.length, 1);
  });

  it("can exclude the row being updated", async () => {
    const { findOverlappingBookings } = await loadConflicts();
    assert.deepEqual(
      await findOverlappingBookings(fakeDb([booking()]), {
        organisationId: ORG_A,
        accommodationUnitId: UNIT_1,
        checkin: d("2026-09-06"),
        checkout: d("2026-09-08"),
        excludeStayBookingId: "b1",
      }),
      [],
    );
  });
});

describe("H-9 lock key", () => {
  it("isolates organisation and unit", async () => {
    const { unitBookingLockKey } = await loadConflicts();
    assert.notEqual(unitBookingLockKey(ORG_A, UNIT_1), unitBookingLockKey(ORG_A, UNIT_2));
    assert.notEqual(unitBookingLockKey(ORG_A, UNIT_1), unitBookingLockKey(ORG_B, UNIT_1));
  });
});

// ── Layer 2: write paths (atomic check + write) ─────────────────────────────

describe("H-9 Gen 2 create", () => {
  it("creates a non-overlapping booking", async () => {
    const { createStayBookingGen2First } = await loadBookings();
    const store = makeStore();
    store.addUnit({ id: UNIT_1, organisationId: ORG_A, externalWpId: 42, title: "Unit 1" });
    const res = await createStayBookingGen2First(
      ORG_A,
      { guestName: "Alice", accommodationUnitId: UNIT_1, checkin: "2026-09-01", checkout: "2026-09-03" },
      { client: store.client, checkAvailability: available, resolveContactId: noContact },
    );
    assert.equal(res.ok, true);
    assert.equal(store.active().length, 1);
  });

  it("rejects an overlapping create with dates_unavailable (no row written)", async () => {
    const { createStayBookingGen2First } = await loadBookings();
    const store = makeStore([booking()]);
    store.addUnit({ id: UNIT_1, organisationId: ORG_A, externalWpId: 42, title: "Unit 1" });
    const res = await createStayBookingGen2First(
      ORG_A,
      { guestName: "Bob", accommodationUnitId: UNIT_1, checkin: "2026-09-06", checkout: "2026-09-09" },
      { client: store.client, checkAvailability: available, resolveContactId: noContact },
    );
    assert.equal(res.ok, false);
    assert.equal(res.code, "dates_unavailable");
    assert.equal(store.active().length, 1, "no overlapping row created");
  });

  it("concurrent creates for the same unit cannot both succeed", async () => {
    const { createStayBookingGen2First } = await loadBookings();
    const store = makeStore();
    store.addUnit({ id: UNIT_1, organisationId: ORG_A, externalWpId: 42, title: "Unit 1" });
    const attempt = (guest) =>
      createStayBookingGen2First(
        ORG_A,
        { guestName: guest, accommodationUnitId: UNIT_1, checkin: "2026-09-10", checkout: "2026-09-14" },
        { client: store.client, checkAvailability: available, resolveContactId: noContact },
      );
    const [a, b] = await Promise.all([attempt("A"), attempt("B")]);
    const oks = [a, b].filter((r) => r.ok);
    const fails = [a, b].filter((r) => !r.ok);
    assert.equal(oks.length, 1, "exactly one create succeeds");
    assert.equal(fails.length, 1);
    assert.equal(fails[0].code, "dates_unavailable");
    assert.equal(store.active().length, 1, "only one active booking persisted");
  });

  it("operator force bypasses the overlap check", async () => {
    const { createStayBookingGen2First } = await loadBookings();
    const store = makeStore([booking()]);
    store.addUnit({ id: UNIT_1, organisationId: ORG_A, externalWpId: 42, title: "Unit 1" });
    const res = await createStayBookingGen2First(
      ORG_A,
      {
        guestName: "Forced",
        accommodationUnitId: UNIT_1,
        checkin: "2026-09-06",
        checkout: "2026-09-09",
        force: true,
      },
      { client: store.client, checkAvailability: available, resolveContactId: noContact },
    );
    assert.equal(res.ok, true, "force writes despite overlap");
    assert.equal(store.active().length, 2);
  });

  it("does no network / pre-lock work while the advisory lock is held", async () => {
    const { createStayBookingGen2First } = await loadBookings();
    const store = makeStore();
    store.addUnit({ id: UNIT_1, organisationId: ORG_A, externalWpId: 42, title: "Unit 1" });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      if (store.state.lockHeld) store.state.fetchWhileLocked += 1;
      throw new Error("no network expected");
    };
    let availabilityLockHeld = null;
    let contactLockHeld = null;
    try {
      await createStayBookingGen2First(
        ORG_A,
        { guestName: "Nia", accommodationUnitId: UNIT_1, checkin: "2026-09-01", checkout: "2026-09-03" },
        {
          client: store.client,
          checkAvailability: async () => {
            availabilityLockHeld = store.state.lockHeld;
            return { ok: true };
          },
          resolveContactId: async () => {
            contactLockHeld = store.state.lockHeld;
            return null;
          },
        },
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
    assert.equal(availabilityLockHeld, false, "availability check runs before the lock");
    assert.equal(contactLockHeld, false, "contact resolution runs before the lock");
    assert.equal(store.state.fetchWhileLocked, 0, "no fetch while lock held");
  });
});

describe("H-9 Gen 2 update", () => {
  const seed = () => [
    booking({ id: "a", checkin: d("2026-09-01"), checkout: d("2026-09-03") }),
    booking({ id: "b", checkin: d("2026-09-10"), checkout: d("2026-09-15") }),
  ];

  it("cannot move a booking onto another active booking", async () => {
    const { updateStayBooking, StayBookingConflictError } = await loadBookings();
    const store = makeStore(seed());
    await assert.rejects(
      updateStayBooking(
        ORG_A,
        { platformId: "a", checkin: "2026-09-11", checkout: "2026-09-13" },
        { client: store.client },
      ),
      (err) => err instanceof StayBookingConflictError && err.code === "dates_unavailable",
    );
    const a = store.rows.find((r) => r.id === "a");
    assert.equal(a.checkin.toISOString(), d("2026-09-01").toISOString(), "dates unchanged after conflict");
  });

  it("allows moving onto free, non-overlapping dates", async () => {
    const { updateStayBooking } = await loadBookings();
    const store = makeStore(seed());
    const res = await updateStayBooking(
      ORG_A,
      { platformId: "a", checkin: "2026-09-20", checkout: "2026-09-22" },
      { client: store.client },
    );
    assert.equal(res.checkin, "2026-09-20");
  });

  it("allows moving to a same-day turnover boundary", async () => {
    const { updateStayBooking } = await loadBookings();
    const store = makeStore(seed());
    const res = await updateStayBooking(
      ORG_A,
      { platformId: "a", checkin: "2026-09-07", checkout: "2026-09-10" },
      { client: store.client },
    );
    assert.equal(res.checkout, "2026-09-10", "checkout === next checkin is allowed");
  });

  it("operator force skips the update overlap re-check", async () => {
    const { updateStayBooking } = await loadBookings();
    const store = makeStore(seed());
    const res = await updateStayBooking(
      ORG_A,
      { platformId: "a", checkin: "2026-09-11", checkout: "2026-09-13", force: true },
      { client: store.client },
    );
    assert.equal(res.checkin, "2026-09-11", "force applies the move");
  });

  it("concurrent date-changing updates cannot create an overlap", async () => {
    const { updateStayBooking, StayBookingConflictError } = await loadBookings();
    const store = makeStore(seed());
    const move = (id) =>
      updateStayBooking(
        ORG_A,
        { platformId: id, checkin: "2026-09-20", checkout: "2026-09-22" },
        { client: store.client },
      ).then(
        (row) => ({ ok: true, row }),
        (err) => ({ ok: false, err }),
      );
    const [ra, rb] = await Promise.all([move("a"), move("b")]);
    const oks = [ra, rb].filter((r) => r.ok);
    const fails = [ra, rb].filter((r) => !r.ok);
    assert.equal(oks.length, 1, "only one move succeeds");
    assert.equal(fails.length, 1);
    assert.ok(fails[0].err instanceof StayBookingConflictError);
    const atTarget = store.rows.filter(
      (r) => r.checkin?.toISOString() === d("2026-09-20").toISOString(),
    );
    assert.equal(atTarget.length, 1, "only one booking landed on the target dates");
  });
});

describe("H-9 WordPress import", () => {
  it("resolves the legacy WordPress unit id and creates when free", async () => {
    const { upsertStayBookingFromWpRow } = await loadBookings();
    const store = makeStore();
    store.addUnit({ id: UNIT_1, organisationId: ORG_A, externalWpId: 42, title: "Unit 1" });
    const outcome = await upsertStayBookingFromWpRow(
      ORG_A,
      { id: 1001, guest_name: "WP Guest", accommodation_id: 42, checkin: "2026-09-01", checkout: "2026-09-03", status: "confirmed" },
      {},
      { client: store.client, resolveContactId: noContact },
    );
    assert.equal(outcome, "created");
    const created = store.rows.find((r) => r.externalWpId === 1001);
    assert.ok(created, "WP row was created");
    assert.equal(created.status, "confirmed");
    // WP create leaves accommodationUnitId null (linked later) but the overlap
    // guard still resolved and locked on the Gen 2 unit via the legacy WP id.
    assert.equal(created.accommodationWpId, 42);
  });

  it("cannot import a booking that overlaps an existing active booking", async () => {
    const { upsertStayBookingFromWpRow } = await loadBookings();
    const store = makeStore([booking({ accommodationWpId: 42 })]);
    store.addUnit({ id: UNIT_1, organisationId: ORG_A, externalWpId: 42, title: "Unit 1" });
    const outcome = await upsertStayBookingFromWpRow(
      ORG_A,
      { id: 2002, guest_name: "WP Overlap", accommodation_id: 42, checkin: "2026-09-06", checkout: "2026-09-09", status: "confirmed" },
      {},
      { client: store.client, resolveContactId: noContact },
    );
    assert.equal(outcome, "conflict");
    assert.equal(store.rows.some((r) => r.externalWpId === 2002), false, "no overlapping row created");
    const blocker = store.rows.find((r) => r.id === "b1");
    assert.ok(Array.isArray(blocker.metadata.import_conflicts), "conflict recorded on the blocker");
  });

  it("cannot move an existing mirror row onto another active booking", async () => {
    const { upsertStayBookingFromWpRow } = await loadBookings();
    const store = makeStore([
      booking({ id: "keep", accommodationWpId: 42, checkin: d("2026-09-20"), checkout: d("2026-09-24") }),
      booking({ id: "mirror", externalWpId: 3003, accommodationWpId: 42, checkin: d("2026-09-01"), checkout: d("2026-09-03") }),
    ]);
    store.addUnit({ id: UNIT_1, organisationId: ORG_A, externalWpId: 42, title: "Unit 1" });
    const outcome = await upsertStayBookingFromWpRow(
      ORG_A,
      { id: 3003, guest_name: "Moved", accommodation_id: 42, checkin: "2026-09-21", checkout: "2026-09-23", status: "confirmed" },
      {},
      { client: store.client, resolveContactId: noContact },
    );
    assert.equal(outcome, "conflict");
    const mirror = store.rows.find((r) => r.id === "mirror");
    assert.equal(mirror.checkin.toISOString(), d("2026-09-01").toISOString(), "mirror dates unchanged");
  });
});

describe("H-9 OTA import", () => {
  const evt = (over = {}) => ({
    uid: "ical-1",
    start: "2026-09-06",
    end: "2026-09-09",
    summary: "Reserved",
    cancelled: false,
    ...over,
  });
  const base = (over = {}) => ({
    organisationId: ORG_A,
    unitId: UNIT_1,
    unitTitle: "Unit 1",
    accommodationWpId: null,
    source: "airbnb",
    ...over,
  });

  it("imports a non-overlapping OTA event", async () => {
    const { upsertOtaStayBooking } = await loadIcal();
    const store = makeStore();
    const outcome = await upsertOtaStayBooking(
      base({ event: evt({ start: "2026-09-01", end: "2026-09-03" }) }),
      { client: store.client },
    );
    assert.equal(outcome, "created");
    assert.equal(store.active().length, 1);
  });

  it("cannot import an OTA event that overlaps an existing active booking", async () => {
    const { upsertOtaStayBooking } = await loadIcal();
    const store = makeStore([booking()]);
    const outcome = await upsertOtaStayBooking(base({ event: evt() }), { client: store.client });
    assert.equal(outcome, "conflict");
    assert.equal(store.active().length, 1, "no overlapping OTA row created");
    const blocker = store.rows.find((r) => r.id === "b1");
    assert.ok(Array.isArray(blocker.metadata.import_conflicts));
  });

  it("allows a same-day turnover OTA event", async () => {
    const { upsertOtaStayBooking } = await loadIcal();
    const store = makeStore([booking()]); // existing 09-05 -> 09-10
    const outcome = await upsertOtaStayBooking(
      base({ event: evt({ start: "2026-09-10", end: "2026-09-12" }) }),
      { client: store.client },
    );
    assert.equal(outcome, "created");
  });

  it("does not treat a cancelled existing stay as a blocker", async () => {
    const { upsertOtaStayBooking } = await loadIcal();
    const store = makeStore([booking({ status: "cancelled" })]);
    const outcome = await upsertOtaStayBooking(base({ event: evt() }), { client: store.client });
    assert.equal(outcome, "created");
  });
});
