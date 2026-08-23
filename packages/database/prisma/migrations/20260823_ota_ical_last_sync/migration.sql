-- Gen 2 OTA iCal last-sync timestamps (cron + manual Sync Airbnb & Booking.com)

ALTER TABLE "accommodation_units"
  ADD COLUMN IF NOT EXISTS "airbnb_last_sync_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "airbnb_last_error" TEXT,
  ADD COLUMN IF NOT EXISTS "bookingcom_last_sync_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "bookingcom_last_error" TEXT;
