import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route = fs.readFileSync("src/app/api/v1/accommodation/route.ts", "utf8");
const migrationRoute = fs.readFileSync(
  "src/app/api/v1/migrations/wordpress/accommodation/route.ts",
  "utf8",
);
const migration = fs.readFileSync("src/lib/wordpress-migration.ts", "utf8");

test("native accommodation reads cannot select WordPress as a runtime source", () => {
  assert.doesNotMatch(route, /source\s*===\s*["']wp["']/);
  assert.doesNotMatch(route, /fetchWpAccommodation(?:Availability|Bookings|Housekeeping|Summary|Units)/);
});

test("native accommodation writes do not mirror or fall back to WordPress", () => {
  assert.doesNotMatch(route, /createWpAccommodationBookings/);
  assert.doesNotMatch(route, /patchWpAccommodation(?:Bookings|Guests|Housekeeping|Units)/);
  assert.doesNotMatch(route, /deleteWpAccommodationBookings/);
  assert.doesNotMatch(route, /syncWpAccommodationOtaCalendars/);
  assert.doesNotMatch(route, /writePath:\s*["'](?:wordpress|wp_then_neon|neon_then_wp)["']/);
});

test("WordPress import is isolated behind the dedicated migration endpoint", () => {
  assert.doesNotMatch(route, /migrate_wordpress/);
  assert.doesNotMatch(route, /wordpress-migration/);
  assert.doesNotMatch(route, /sync_wordpress/);
  assert.doesNotMatch(route, /sync_units/);
  assert.match(migrationRoute, /migrateAccommodationFromWordPress/);
  assert.match(migrationRoute, /["']owner["']/);
  assert.match(migrationRoute, /["']admin["']/);
  assert.match(migrationRoute, /["']dg:staff["']/);
  assert.match(migrationRoute, /boundary:\s*["']wordpress_to_platform_only["']/);
  assert.match(migration, /mode:\s*["']migration_only["']/);
});

test("native booking and OTA writes are explicitly Neon paths", () => {
  assert.match(route, /writePath:\s*["']neon["']/);
  assert.match(route, /writePath:\s*["']gen2_ical["']/);
  assert.match(route, /createStayBookingGen2First/);
  assert.match(route, /syncOtaCalendarsFromUnits/);
});

test("native booking edits fail closed on unit reassignment until atomic move exists", () => {
  assert.match(route, /booking_unit_move_requires_atomic_operation/);
  assert.match(
    route,
    /\(!existing\s*\|\|\s*patch\.accommodation_id\s*!==\s*existing\.accommodationWpId\)/,
  );
});
