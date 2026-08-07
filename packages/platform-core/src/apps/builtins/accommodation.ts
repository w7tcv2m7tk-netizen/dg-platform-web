import type { AppManifest } from "../manifest";

export const accommodationApp: AppManifest = {
  id: "accommodation",
  name: "Accommodation",
  description: "Hospitality units, bookings, availability, and housekeeping",
  tier: "business",
  version: "0.2.0",
  icon: "⛺",
  routes: [
    { path: "/apps/accommodation", label: "Overview" },
    { path: "/apps/accommodation/units", label: "Units" },
    { path: "/apps/accommodation/bookings", label: "Bookings" },
    { path: "/apps/accommodation/guests", label: "Guests" },
    { path: "/apps/accommodation/calendar", label: "Availability" },
    { path: "/apps/accommodation/housekeeping", label: "Housekeeping" },
  ],
  navigation: [{ href: "/apps/accommodation", label: "Accommodation", icon: "⛁" }],
  permissions: [
    { id: "accommodation.view", label: "View accommodation" },
    { id: "accommodation.manage", label: "Manage units and bookings" },
  ],
  features: [
    "accommodation.units.read",
    "accommodation.bookings.read",
    "accommodation.guests.read",
    "accommodation.calendar.read",
    "accommodation.housekeeping.read",
    "accommodation.housekeeping.write",
  ],
  entities: ["Accommodation", "Booking", "Contact", "Activity"],
  automationTriggers: [
    { id: "booking.confirmed", label: "Booking confirmed", objectType: "Booking" },
    { id: "booking.check_in", label: "Guest checked in", objectType: "Booking" },
    { id: "booking.check_out", label: "Guest checked out", objectType: "Booking" },
  ],
  automationActions: [
    { id: "accommodation.send_checkin", label: "Send check-in instructions" },
    { id: "accommodation.schedule_clean", label: "Schedule housekeeping" },
  ],
  aiTools: [
    {
      id: "accommodation.occupancy_forecast",
      label: "Occupancy forecast",
      description: "Predict occupancy and revenue from booking history",
    },
  ],
  reports: [
    { id: "accommodation.occupancy", label: "Occupancy report" },
    { id: "accommodation.revenue", label: "Booking revenue" },
  ],
};
