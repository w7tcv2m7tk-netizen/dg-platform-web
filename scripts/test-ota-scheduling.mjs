/**
 * OTA scheduler regression.
 *
 * The org-selection query had no ORDER BY and used `take: 50`, so Postgres
 * returned an arbitrary — but in practice stable — set. Any organisation
 * outside that set could go unsynced indefinitely. Selection is now
 * least-recently-synced first with a deterministic tiebreak, making the cap a
 * rotating batch size rather than a starvation boundary.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const readSource = (rel) => readFile(path.join(__dirname, "..", rel), "utf8");

/**
 * Mirrors the selection logic in syncAllOrganisationsOtaCalendars so the
 * rotation contract can be asserted without a database.
 */
function selectOrganisations(units, limit) {
  const oldestByOrg = new Map();
  for (const unit of units) {
    const feedTimes = [
      unit.airbnbIcalUrl !== undefined && !unit.airbnbIcalUrl
        ? null
        : (unit.airbnbLastSyncAt?.getTime() ?? 0),
      unit.bookingcomIcalUrl !== undefined && !unit.bookingcomIcalUrl
        ? null
        : (unit.bookingcomLastSyncAt?.getTime() ?? 0),
    ].filter((t) => t !== null);
    if (!feedTimes.length) continue;
    const syncedAt = Math.min(...feedTimes);
    const current = oldestByOrg.get(unit.organisationId);
    if (current === undefined || syncedAt < current) {
      oldestByOrg.set(unit.organisationId, syncedAt);
    }
  }
  return [...oldestByOrg.entries()]
    .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([organisationId]) => organisationId);
}

const at = (iso) => new Date(iso);

describe("OTA scheduler: batch rotation", () => {
  it("selects least-recently-synced organisations first", () => {
    const units = [
      { organisationId: "org_fresh", airbnbLastSyncAt: at("2026-08-30T05:00:00Z"), bookingcomLastSyncAt: at("2026-08-30T05:00:00Z") },
      { organisationId: "org_stale", airbnbLastSyncAt: at("2026-08-01T05:00:00Z"), bookingcomLastSyncAt: at("2026-08-01T05:00:00Z") },
      { organisationId: "org_middle", airbnbLastSyncAt: at("2026-08-20T05:00:00Z"), bookingcomLastSyncAt: at("2026-08-20T05:00:00Z") },
    ];

    assert.deepEqual(selectOrganisations(units, 3), [
      "org_stale",
      "org_middle",
      "org_fresh",
    ]);
  });

  it("puts never-synced organisations at the front", () => {
    const units = [
      { organisationId: "org_synced", airbnbLastSyncAt: at("2026-08-29T05:00:00Z"), bookingcomLastSyncAt: at("2026-08-29T05:00:00Z") },
      { organisationId: "org_new", airbnbLastSyncAt: null, bookingcomLastSyncAt: null },
    ];

    assert.deepEqual(selectOrganisations(units, 2), ["org_new", "org_synced"]);
  });

  it("rotates so an organisation outside one batch is picked up next run", () => {
    const units = [
      { organisationId: "org_a", airbnbLastSyncAt: at("2026-08-01T00:00:00Z"), bookingcomLastSyncAt: at("2026-08-01T00:00:00Z") },
      { organisationId: "org_b", airbnbLastSyncAt: at("2026-08-02T00:00:00Z"), bookingcomLastSyncAt: at("2026-08-02T00:00:00Z") },
      { organisationId: "org_c", airbnbLastSyncAt: at("2026-08-03T00:00:00Z"), bookingcomLastSyncAt: at("2026-08-03T00:00:00Z") },
    ];

    // Batch of one: oldest goes first.
    assert.deepEqual(selectOrganisations(units, 1), ["org_a"]);

    // After org_a syncs it becomes the freshest, so the next run picks org_b.
    const afterRun = units.map((u) =>
      u.organisationId === "org_a"
        ? { ...u, airbnbLastSyncAt: at("2026-08-30T00:00:00Z"), bookingcomLastSyncAt: at("2026-08-30T00:00:00Z") }
        : u,
    );
    assert.deepEqual(selectOrganisations(afterRun, 1), ["org_b"]);
  });

  it("is deterministic when timestamps tie", () => {
    const units = [
      { organisationId: "org_z", airbnbLastSyncAt: null, bookingcomLastSyncAt: null },
      { organisationId: "org_a", airbnbLastSyncAt: null, bookingcomLastSyncAt: null },
    ];

    assert.deepEqual(selectOrganisations(units, 2), ["org_a", "org_z"]);
    assert.deepEqual(selectOrganisations([...units].reverse(), 2), [
      "org_a",
      "org_z",
    ]);
  });

  it("uses a unit's oldest feed so a half-synced organisation still rotates in", () => {
    const units = [
      {
        organisationId: "org_partial",
        airbnbLastSyncAt: at("2026-08-30T00:00:00Z"),
        bookingcomLastSyncAt: at("2026-08-01T00:00:00Z"),
      },
      {
        organisationId: "org_current",
        airbnbLastSyncAt: at("2026-08-29T00:00:00Z"),
        bookingcomLastSyncAt: at("2026-08-29T00:00:00Z"),
      },
    ];

    assert.deepEqual(selectOrganisations(units, 1), ["org_partial"]);
  });
});

describe("OTA scheduler: documentation matches deployment", () => {
  it("no longer claims a 15-minute cadence", async () => {
    const src = await readSource("src/app/api/cron/ota-ical-sync/route.ts");
    assert.doesNotMatch(src, /Every 15 minutes/);
    assert.match(src, /Daily 05:00 UTC/);
  });

  it("no longer claims the Vercel cron header is accepted", async () => {
    const src = await readSource("src/app/api/cron/ota-ical-sync/route.ts");
    assert.match(src, /x-vercel-cron header is NOT accepted/);
  });

  it("matches the schedule actually configured in vercel.json", async () => {
    const config = JSON.parse(await readSource("vercel.json"));
    const entry = config.crons.find((c) => c.path === "/api/cron/ota-ical-sync");
    assert.ok(entry, "ota-ical-sync must be scheduled");
    assert.equal(entry.schedule, "0 5 * * *");
  });
});

describe("OTA scheduler: single-feed organisations rotate correctly", () => {
  it("ignores an unconfigured feed instead of treating it as never synced", () => {
    // Regression: Math.min(airbnb, bookingcom) with a null bookingcom leg
    // always produced 0, pinning every Airbnb-only organisation to the front
    // of the queue forever and starving everyone else.
    const units = [
      {
        organisationId: "org_airbnb_only",
        airbnbIcalUrl: "https://airbnb.example/cal.ics",
        bookingcomIcalUrl: null,
        airbnbLastSyncAt: at("2026-08-30T00:00:00Z"),
        bookingcomLastSyncAt: null,
      },
      {
        organisationId: "org_stale_both",
        airbnbIcalUrl: "https://airbnb.example/b.ics",
        bookingcomIcalUrl: "https://booking.example/b.ics",
        airbnbLastSyncAt: at("2026-08-01T00:00:00Z"),
        bookingcomLastSyncAt: at("2026-08-01T00:00:00Z"),
      },
    ];

    assert.deepEqual(
      selectOrganisations(units, 1),
      ["org_stale_both"],
      "the genuinely stale organisation must win, not the freshly-synced single-feed one",
    );
  });
});
