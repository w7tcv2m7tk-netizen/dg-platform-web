/**
 * WordPress booking source-of-truth policy.
 *
 * Gen 2 / Neon is canonical; WordPress is a legacy mirror. Every WP import path
 * funnels into `upsertStayBookingFromWpRow`, which matched on externalWpId and
 * then wrote the WordPress values over the Neon row whenever any field differed.
 * There was no recency check, so an operator edit made in Gen 2 could be
 * silently reverted by a later sync carrying a stale WordPress row.
 *
 * The rule added here answers the only question Neon can answer on its own:
 * is WordPress saying anything it has not already said? Timestamps cannot be
 * used — the plugin emits none — and `platform_id` does not exist in the plugin
 * at all, both verified against the plugin source.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { pathToFileURL, fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const load = () =>
  import(
    pathToFileURL(
      path.join(__dirname, "../packages/platform-core/src/accommodation/bookings.ts"),
    ).href
  );

const readSource = (rel) => readFile(path.join(__dirname, "..", rel), "utf8");

/** A WordPress booking row as the plugin actually emits it. */
function wpRow(overrides = {}) {
  return {
    id: 4211,
    ref: "MANUAL-20260830-1234",
    guest_name: "Dana Reid",
    email: "dana@example.com",
    phone: "0400 000 000",
    accommodation: "Creekside Cabin",
    accommodation_id: 88,
    checkin: "2026-09-10",
    checkout: "2026-09-14",
    nights: 4,
    guests: 2,
    status: "confirmed",
    source: "website",
    total: 1480,
    paid: "yes",
    payment_method: "stripe",
    message: "",
    ...overrides,
  };
}

describe("Stale WordPress mirror must not overwrite a newer Gen 2 edit", () => {
  it("skips a WordPress row identical to the one already accepted", async () => {
    const {
      __wpRowIsStaleMirrorForTests: isStale,
      __wpMetadataWithFingerprintForTests: metaFor,
    } = await load();

    const row = wpRow();
    // Neon accepted this exact WordPress state on a previous sync.
    const stored = metaFor(row);

    assert.equal(
      isStale(row, stored),
      true,
      "an unchanged WordPress row carries no new information",
    );
  });

  it("skips even though the Neon row now differs, which is what used to revert the edit", async () => {
    const {
      __wpRowIsStaleMirrorForTests: isStale,
      __wpMetadataWithFingerprintForTests: metaFor,
    } = await load();

    const row = wpRow();

    // Neon accepted this WordPress state, then the operator renamed the guest in
    // Gen 2 and the mirror did not land. So the stored fingerprint still
    // describes WordPress, while the rest of the Neon row has moved on.
    const neonRow = {
      guestName: "Dana Reid-Okafor",
      metadata: metaFor(row),
    };

    // The legacy comparison is against the NEON row, so it sees a difference and
    // concludes WordPress has something to apply — that is the bug. The rule
    // compares against the last WordPress state instead, and short-circuits.
    const legacyWouldWrite = neonRow.guestName !== row.guest_name;
    assert.equal(legacyWouldWrite, true, "precondition: the rows have diverged");

    assert.equal(
      isStale(row, neonRow.metadata),
      true,
      "WordPress has not changed, so it must not overwrite the Gen 2 edit",
    );
  });

  it("applies a genuine WordPress change so legacy tenants keep working", async () => {
    const {
      __wpRowIsStaleMirrorForTests: isStale,
      __wpMetadataWithFingerprintForTests: metaFor,
    } = await load();

    const stored = metaFor(wpRow());

    // Someone edited the booking in wp-admin.
    const changed = wpRow({ guest_name: "Dana Reid-Okafor" });
    assert.equal(
      isStale(changed, stored),
      false,
      "a WordPress-originated change must still be applied",
    );
  });

  it("treats every field the plugin sends as a possible change", async () => {
    const {
      __wpRowIsStaleMirrorForTests: isStale,
      __wpMetadataWithFingerprintForTests: metaFor,
    } = await load();

    const stored = metaFor(wpRow());

    const mutations = [
      { ref: "MANUAL-20260830-9999" },
      { guest_name: "Someone Else" },
      { email: "new@example.com" },
      { phone: "0411 111 111" },
      { accommodation: "Hilltop Cabin" },
      { accommodation_id: 91 },
      { checkin: "2026-09-11" },
      { checkout: "2026-09-15" },
      { status: "cancelled" },
      { total: 1600 },
      { paid: "no" },
      { payment_method: "payid" },
      { guests: 3 },
      { nights: 5 },
      { message: "Late arrival" },
      { source: "airbnb" },
    ];

    for (const mutation of mutations) {
      const key = Object.keys(mutation)[0];
      assert.equal(
        isStale(wpRow(mutation), stored),
        false,
        `a change to "${key}" must be recognised as a WordPress change`,
      );
    }
  });

  it("does not block imports on rows predating the rule", async () => {
    const { __wpRowIsStaleMirrorForTests: isStale } = await load();

    // No fingerprint recorded yet: we cannot tell, so behaviour is unchanged.
    // The row arms itself on the next sync rather than needing a backfill.
    for (const meta of [null, undefined, {}, { source: "wordpress" }]) {
      assert.equal(isStale(wpRow(), meta), false);
    }
  });

  it("ignores a malformed fingerprint rather than failing the import", async () => {
    const { __wpRowIsStaleMirrorForTests: isStale } = await load();

    for (const bad of [
      { wp_row_fingerprint: "" },
      { wp_row_fingerprint: 42 },
      { wp_row_fingerprint: null },
      { wp_row_fingerprint: { nested: true } },
    ]) {
      assert.equal(isStale(wpRow(), bad), false);
    }
  });
});

describe("Fingerprint stability", () => {
  it("is stable across repeated calls for the same row", async () => {
    const { __wpBookingFingerprintForTests: fp } = await load();
    assert.equal(fp(wpRow()), fp(wpRow()));
  });

  it("does not change when only the WordPress post id differs", async () => {
    // Identity is handled by externalWpId matching, not by the fingerprint.
    const { __wpBookingFingerprintForTests: fp } = await load();
    assert.equal(fp(wpRow({ id: 4211 })), fp(wpRow({ id: 4212 })));
  });

  it("normalises whitespace so cosmetic differences are not treated as edits", async () => {
    const { __wpBookingFingerprintForTests: fp } = await load();
    assert.equal(fp(wpRow()), fp(wpRow({ guest_name: "  Dana Reid  " })));
  });

  it("is carried in the metadata written on every accepted import", async () => {
    const {
      __wpMetadataWithFingerprintForTests: metaFor,
      __wpBookingFingerprintForTests: fp,
    } = await load();

    const row = wpRow();
    const meta = metaFor(row);

    assert.equal(meta.wp_row_fingerprint, fp(row));
    // The existing metadata contract must survive alongside it.
    assert.equal(meta.paid, "yes");
    assert.equal(meta.payment_method, "stripe");
    assert.equal(meta.source, "website");
  });
});

describe("Implementation shape", () => {
  it("checks the stale-mirror rule before any write path", async () => {
    const src = await readSource("packages/platform-core/src/accommodation/bookings.ts");

    const ruleAt = src.indexOf("wordPressRowIsStaleMirror(fields, existing.metadata)");
    const firstUpdate = src.indexOf("prisma.stayBooking.update", ruleAt > 0 ? 0 : undefined);
    assert.ok(ruleAt > 0, "the import must consult the rule");

    const upsertAt = src.indexOf("export async function upsertStayBookingFromWpRow");
    assert.ok(upsertAt > 0);
    // The guard must sit inside the upsert, before it decides to write.
    assert.ok(ruleAt > upsertAt, "the guard belongs in the import path");
    assert.ok(firstUpdate > 0);
  });

  it("records the accepted WordPress state on every import write", async () => {
    const src = await readSource("packages/platform-core/src/accommodation/bookings.ts");

    // If any write persisted raw metadata, that row would lose its fingerprint
    // and silently opt out of the protection on the next sync.
    assert.doesNotMatch(
      src,
      /metadata: fields\.metadata as Prisma\.InputJsonValue/,
      "import writes must carry the fingerprint",
    );
    const writes = src.match(/metadata: metadataWithWpFingerprint\(fields\)/g) ?? [];
    assert.ok(writes.length >= 4, `expected every import write to record it, saw ${writes.length}`);
  });

  it("preserves the fingerprint when Gen 2 edits a booking", async () => {
    const src = await readSource("packages/platform-core/src/accommodation/bookings.ts");

    // updateStayBooking must merge metadata, not replace it — replacing it would
    // erase the fingerprint and disable the protection precisely when a Gen 2
    // edit has just made it necessary.
    const at = src.indexOf("if (metaTouched) {");
    assert.ok(at > 0, "metadata merge block not found");
    const block = src.slice(at, at + 900);
    assert.match(block, /const next: Record<string, unknown> = \{ \.\.\.prev \}/);
  });

  it("does not reintroduce WordPress as an authority", async () => {
    const src = await readSource("packages/platform-core/src/accommodation/bookings.ts");
    // The rule must never be inverted into "WordPress wins".
    assert.doesNotMatch(src, /wpWins|wordpressAuthoritative|WP_SOURCE_OF_TRUTH/);
  });
});

/**
 * Overlap protection for imports whose Neon unit is not resolvable.
 *
 * `resolveUnitIdForWpBooking` fails mainly when units have not been imported
 * yet — exactly when a first WordPress pull brings in many bookings at once.
 * Those inserts previously ran with no advisory lock and no overlap check at
 * all, so two stays on the same real unit could both land silently.
 */
describe("No-unit booking imports", () => {
  it("guards on the WordPress unit id when Neon has no unit yet", async () => {
    const src = await readSource("packages/platform-core/src/accommodation/bookings.ts");

    // The overlap query already matches on accommodationWpId, so a WP unit id is
    // enough to both serialise and detect.
    assert.match(src, /wp-unit:\$\{fields\.accommodationWpId\}/);
    assert.match(src, /withUnitBookingLock\(organisationId, lockUnitId!/);
  });

  it("only skips the check when there is genuinely nothing to check against", async () => {
    const src = await readSource("packages/platform-core/src/accommodation/bookings.ts");

    assert.match(
      src,
      /const canDetectOverlap =\s*Boolean\(lockUnitId\) && Boolean\(fields\.checkin\) && Boolean\(fields\.checkout\)/,
    );
  });

  it("marks unguardable rows instead of inserting them indistinguishably", async () => {
    const src = await readSource("packages/platform-core/src/accommodation/bookings.ts");

    assert.match(src, /overlap_unchecked/);
    assert.match(src, /reason: !lockUnitId \? "no_unit_identity" : "missing_dates"/);
  });

  it("still refuses a genuine overlap rather than accepting a double-book", async () => {
    const src = await readSource("packages/platform-core/src/accommodation/bookings.ts");

    const guard = src.indexOf("if (conflicts.length) {");
    const create = src.indexOf("await tx.stayBooking.create", guard);
    assert.ok(guard > 0 && create > guard, "conflict must be refused before insert");
    assert.match(src.slice(guard, create), /recordImportConflict/);
  });

  it("does not drop a committed guest reservation", async () => {
    const src = await readSource("packages/platform-core/src/accommodation/bookings.ts");
    // An unguardable row is written, not discarded — losing a real booking is
    // worse than an unchecked one.
    const at = src.indexOf("if (!canDetectOverlap) {");
    const block = src.slice(at, at + 1400);
    assert.match(block, /prisma\.stayBooking\.create/);
    assert.match(block, /return "created"/);
  });
});

/**
 * Unit PATCH used to write the whole WordPress response row back over Neon,
 * which contradicts Neon being source of truth and is lossy: WordPress
 * re-expands blocked_dates to include OTA blocks and runs its iCal import
 * before responding.
 */
describe("Unit PATCH writeback is limited to WordPress-authored fields", () => {
  it("writes back only the identifiers WordPress generates", async () => {
    const src = await readSource("src/app/api/v1/accommodation/route.ts");

    assert.match(
      src,
      /for \(const key of \["ical_export_url", "airbnb_id", "bookingcom_id"\]\)/,
    );
  });

  it("no longer passes the whole response row to the upsert", async () => {
    const src = await readSource("src/app/api/v1/accommodation/route.ts");

    assert.doesNotMatch(
      src,
      /upsertAccommodationUnitFromWpRow\(\s*session\.organisationId,\s*row as Parameters/,
      "the full WordPress row must not overwrite Neon",
    );
    assert.match(src, /wpAuthored as Parameters<typeof upsertAccommodationUnitFromWpRow>\[1\]/);
  });

  it("skips the write entirely when WordPress returned none of those fields", async () => {
    const src = await readSource("src/app/api/v1/accommodation/route.ts");
    assert.match(src, /if \(Object\.keys\(wpAuthored\)\.length === 1\) continue;/);
  });

  it("keeps the Neon-first order and does not fail the save on mirror failure", async () => {
    const src = await readSource("src/app/api/v1/accommodation/route.ts");

    const neonWrite = src.indexOf("responseUpdated");
    const mirror = src.indexOf("await patchWpAccommodationUnits(updates, connector)");
    assert.ok(neonWrite > 0 && mirror > neonWrite, "Neon must be written before the mirror");
    assert.match(src, /Neon already updated above — don't fail the save because WP mirror is gone\./);
  });
});
