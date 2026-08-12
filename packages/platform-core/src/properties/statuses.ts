/**
 * Canonical property / listing status constants.
 * Keep this module free of Node/Prisma imports so client UI can import it safely.
 */

export const PROPERTY_STATUSES = [
  "prospect",
  "appraisal",
  "listed",
  "under_offer",
  "contract_signed",
  "unconditional",
  "sold",
  "withdrawn",
] as const;

export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

/** Human labels for listing status (AU agency flow). */
export const PROPERTY_STATUS_LABELS: Record<PropertyStatus, string> = {
  prospect: "Prospect",
  appraisal: "Appraisal",
  listed: "Listed",
  under_offer: "Under offer",
  contract_signed: "Contract signed",
  unconditional: "Unconditional",
  sold: "Sold",
  withdrawn: "Withdrawn",
};

/** Statuses shown on the Listings board (active marketing / sale pipeline). */
export const PROPERTY_LISTING_BOARD_STATUSES = [
  "listed",
  "under_offer",
  "contract_signed",
  "unconditional",
  "sold",
  "withdrawn",
] as const satisfies readonly PropertyStatus[];

/** Statuses that stay on the public website when published (not prospect/appraisal). */
export const WEBSITE_PUBLISH_STATUSES = new Set<string>([
  "listed",
  "under_offer",
  "contract_signed",
  "unconditional",
  "sold",
  "withdrawn",
]);

/** In-contract / sale-pipeline statuses (before settled sold). */
export const PROPERTY_IN_CONTRACT_STATUSES = [
  "under_offer",
  "contract_signed",
  "unconditional",
] as const satisfies readonly PropertyStatus[];

export const PROPERTY_STATUS_OPTIONS = PROPERTY_STATUSES.map((id) => ({
  id,
  value: id,
  label: PROPERTY_STATUS_LABELS[id],
}));

export const PROPERTY_LISTING_STATUS_OPTIONS = PROPERTY_LISTING_BOARD_STATUSES.map(
  (id) => ({
    id,
    value: id,
    label: PROPERTY_STATUS_LABELS[id],
  }),
);
