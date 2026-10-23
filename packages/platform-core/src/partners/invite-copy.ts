import { PARTNER_COMMISSION_CONFIG } from "./types";

const RESELLER = PARTNER_COMMISSION_CONFIG.FOUNDING_RESELLER;

export const FOUNDING_RESELLER_INVITE_POINTS = [
  `${RESELLER.commissionBps / 100}% commission on qualifying Platform + App subscription fees`,
  `Paid for the first ${RESELLER.durationMonths} months of each new customer you directly refer`,
  "DigitalGate qualifies, demonstrates, contracts, onboards, and bills",
  "You introduce suitable Australian businesses — you do not sell, implement, or support",
  "Invitation only. Not an affiliate programme. Not automatic with Founding 10 membership",
] as const;

export const DELIVERY_PARTNER_INVITE_POINTS = [
  "You help DigitalGate deliver customer onboarding — configuration, migration support, training and go-live",
  "You work on customers assigned to you (or all delivery work if you are a Delivery Manager)",
  "DigitalGate owns the customer relationship, platform, billing and quality standard",
  "Head of Implementation / Delivery Managers allocate work and run QA",
  "Invitation only. Not a reseller commission role. Not a public marketplace listing",
] as const;
