import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route = fs.readFileSync("src/app/api/v1/accommodation/route.ts", "utf8");
const bookingsPage = fs.readFileSync(
  "src/app/(shell)/apps/accommodation/bookings/page.tsx",
  "utf8",
);
const calendarPage = fs.readFileSync(
  "src/app/(shell)/apps/accommodation/calendar/page.tsx",
  "utf8",
);
const housekeepingPage = fs.readFileSync(
  "src/app/(shell)/apps/accommodation/housekeeping/page.tsx",
  "utf8",
);
const housekeepingRoute = fs.readFileSync(
  "src/app/api/v1/accommodation/housekeeping/route.ts",
  "utf8",
);
const bookingsPanel = fs.readFileSync(
  "src/components/accommodation/AccommodationBookingsPanel.tsx",
  "utf8",
);
const bookingsLoader = fs.readFileSync("src/lib/accommodation-stay-bookings.ts", "utf8");
const unitOpsLoader = fs.readFileSync("src/lib/accommodation-units.ts", "utf8");
const wordpressSync = fs.readFileSync("src/lib/wordpress-sync.ts", "utf8");
const migrationRoute = fs.readFileSync(
  "src/app/api/v1/migrations/wordpress/accommodation/route.ts",
  "utf8",
);
const migration = fs.readFileSync("src/lib/wordpress-migration.ts", "utf8");
const nativeUnits = fs.readFileSync(
  "packages/platform-core/src/accommodation/units.ts",
  "utf8",
);
const unitMigration = fs.readFileSync(
  "packages/platform-core/src/accommodation/wordpress-migration.ts",
  "utf8",
);
const platformPageContext = fs.readFileSync("src/lib/platform-page-context.ts", "utf8");
const platformShellLoader = fs.readFileSync("src/components/PlatformShellLoader.tsx", "utf8");
const nativePortalProfile = fs.readFileSync("src/lib/native-portal-profile.ts", "utf8");
const propertyPublish = fs.readFileSync(
  "packages/platform-core/src/connectors/wordpress/sync-property-publish.ts",
  "utf8",
);
const agentPublish = fs.readFileSync(
  "packages/platform-core/src/connectors/wordpress/sync-agent-publish.ts",
  "utf8",
);
const propertyImport = fs.readFileSync(
  "packages/platform-core/src/connectors/wordpress/sync-properties-from-wordpress.ts",
  "utf8",
);

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

test("native bookings UI and loader never resolve or sync a WordPress runtime connector", () => {
  assert.doesNotMatch(bookingsPage, /accommodationConnectorForSession/);
  assert.doesNotMatch(bookingsPage, /getWpAccommodationSite/);
  assert.doesNotMatch(bookingsPage, /hasLiveAccWordPressHost/);
  assert.doesNotMatch(bookingsPage, /listWpAccommodationSites/);
  assert.doesNotMatch(bookingsPage, /AccommodationSitePicker/);
  assert.doesNotMatch(bookingsPanel, /sync_wordpress/);
  assert.doesNotMatch(bookingsPanel, /syncFromWordPress/);
  assert.doesNotMatch(bookingsPanel, /Sync bookings from WordPress/);
  assert.doesNotMatch(bookingsPanel, /DG Platform plugin/);
  assert.doesNotMatch(bookingsLoader, /wordpress-sync/);
  assert.doesNotMatch(bookingsLoader, /syncWordPressAccBookings/);
  assert.doesNotMatch(bookingsLoader, /autoSyncWordPressAccBookingsIfNeeded/);
  assert.match(bookingsLoader, /listStayBookings/);
});

test("native calendar, housekeeping and unit ops paths are Neon-only", () => {
  for (const source of [calendarPage, housekeepingPage, housekeepingRoute, unitOpsLoader]) {
    assert.doesNotMatch(source, /organisationUses(?:Unit|Housekeeping)Sot/);
    assert.doesNotMatch(source, /accommodationConnectorForSession/);
    assert.doesNotMatch(source, /fetchWpAccommodation/);
    assert.doesNotMatch(source, /wordpress-sync/);
  }
  assert.doesNotMatch(housekeepingRoute, /patchWpAccommodationHousekeeping/);
  assert.doesNotMatch(housekeepingRoute, /neon_then_wp|writePath:\s*["']wordpress["']/);
  assert.match(housekeepingRoute, /writePath:\s*["']neon["']/);
  assert.doesNotMatch(unitOpsLoader, /syncAccommodationUnitsFromWordPress/);
  assert.doesNotMatch(unitOpsLoader, /autoSyncWordPressAccUnitsIfNeeded/);
  assert.match(calendarPage, /buildAvailabilityFromNeon/);
  assert.match(housekeepingPage, /listAccommodationUnits/);
  assert.match(unitOpsLoader, /listAccommodationUnits/);
});

test("legacy WordPress sync module has no Accommodation runtime sync machinery", () => {
  assert.doesNotMatch(wordpressSync, /syncWordPressAccBookings/);
  assert.doesNotMatch(wordpressSync, /syncWordPressAccUnits/);
  assert.doesNotMatch(wordpressSync, /autoSyncWordPressAccBookingsIfNeeded/);
  assert.doesNotMatch(wordpressSync, /autoSyncWordPressAccUnitsIfNeeded/);
  assert.doesNotMatch(wordpressSync, /fetchWpAccommodationBookings/);
  assert.doesNotMatch(wordpressSync, /syncAccommodationBookingsFromWordPress/);
  assert.doesNotMatch(wordpressSync, /syncAccommodationUnitsFromWordPress/);
  assert.doesNotMatch(wordpressSync, /upsertStayBookingFromWpRow/);
  assert.doesNotMatch(wordpressSync, /acc\.wp_auto_sync/);
});

test("native Platform Core units module has no WordPress runtime connector or fallback SoT switch", () => {
  assert.doesNotMatch(nativeUnits, /resolveOrgWordPressConnector/);
  assert.doesNotMatch(nativeUnits, /organisationUsesUnitSot/);
  assert.doesNotMatch(nativeUnits, /organisationUsesHousekeepingSot/);
  assert.doesNotMatch(nativeUnits, /syncAccommodationUnitsFromWordPress/);
  assert.match(unitMigration, /resolveOrgWordPressConnector/);
  assert.match(unitMigration, /syncAccommodationUnitsFromWordPress/);
  assert.match(unitMigration, /WordPress\s+→\s+Gen 2/);
});

test("native booking creation uses canonical Gen 2 unit identity", () => {
  assert.match(bookingsPanel, /accommodation_unit_id:\s*form\.accommodation_unit_id/);
  assert.match(bookingsPanel, /value=\{u\.platform_id\s*\?\?\s*["']{2}\}/);
  assert.doesNotMatch(bookingsPanel, /const\s+accommodationId\s*=\s*Number\(form\.accommodation_id\)/);
  assert.doesNotMatch(
    route,
    /typeof\s+payload\.platform_id\s*===\s*["']string["'][\s\S]{0,80}accommodationUnitId/,
  );
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

test("authenticated platform context resolves profile from Neon without WordPress portal fallback", () => {
  assert.match(platformPageContext, /resolveNativePortalProfile/);
  assert.doesNotMatch(platformPageContext, /fetchPortalMe/);
  assert.doesNotMatch(platformPageContext, /\/portal\/me/);
  assert.match(nativePortalProfile, /resolvePortalProfileFromNeon/);
  assert.doesNotMatch(nativePortalProfile, /fetchPortalMe/);
  assert.doesNotMatch(nativePortalProfile, /wpConnectorForOrg|fetchWp/);
});

test("authenticated platform shell never triggers background WordPress onboarding sync", () => {
  assert.doesNotMatch(platformShellLoader, /ensureOrganisationOnboardingSync/);
  assert.doesNotMatch(platformShellLoader, /org-onboarding-sync/);
  assert.doesNotMatch(platformShellLoader, /WordPress→Postgres onboarding sync/);
});

test("outbound property publishing is an inert compatibility shim", () => {
  assert.doesNotMatch(propertyPublish, /resolveOrgWordPressConnector/);
  assert.doesNotMatch(propertyPublish, /@dg\/database/);
  assert.doesNotMatch(propertyPublish, /fetch\s*\(/);
  assert.doesNotMatch(propertyPublish, /publishMembershipToWordPressAgent/);
  assert.match(propertyPublish, /WordPress is supported only as an inbound migration source/);
  assert.match(propertyPublish, /return WORDPRESS_PUBLISH_DISABLED/);
  assert.match(propertyPublish, /maybeAutoPublishPropertyToWordPress[\s\S]*return null/);
});

test("outbound agent publishing is an inert compatibility shim", () => {
  assert.doesNotMatch(agentPublish, /resolveOrgWordPressConnector/);
  assert.doesNotMatch(agentPublish, /setMembershipExternalRefs/);
  assert.doesNotMatch(agentPublish, /fetch\s*\(/);
  assert.match(agentPublish, /WordPress is supported only as an inbound migration source/);
  assert.match(agentPublish, /return WORDPRESS_AGENT_PUBLISH_DISABLED/);
});

test("property WordPress capability remains inbound migration only", () => {
  assert.match(propertyImport, /SyncPropertiesFromWordPressInput/);
  assert.match(propertyImport, /properties:\s*WpPropertyListing\[\]/);
  assert.doesNotMatch(propertyImport, /fetch\s*\([^)]*\/properties/);
});
