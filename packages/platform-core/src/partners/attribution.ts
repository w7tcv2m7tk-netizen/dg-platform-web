/**
 * Customer partner attribution — immutable commercial chain per customer org.
 * See docs/partners/COMMERCIAL-MODEL-LOCK.md
 */

import { prisma } from "@dg/database";

import {
  BPS,
  type AcquisitionSource,
} from "./commercial-model";
import type { PartnerType } from "./types";
import { PARTNER_COMMISSION_CONFIG } from "./types";

export type CustomerPartnerAttributionRecord = {
  id: string;
  customerOrganisationId: string;
  acquisitionSource: AcquisitionSource | null;
  resellerPartnerId: string | null;
  channelManagerPartnerId: string | null;
  deliveryPartnerId: string | null;
  deliveryChannelManagerId: string | null;
  resellerCommissionBps: number | null;
  channelOverrideBps: number | null;
  deliveryShareBps: number | null;
  deliveryOverrideBps: number | null;
  commissionPeriodStart: string | null;
  commissionPeriodEnd: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapRow(row: {
  id: string;
  customerOrganisationId: string;
  acquisitionSource: string | null;
  resellerPartnerId: string | null;
  channelManagerPartnerId: string | null;
  deliveryPartnerId: string | null;
  deliveryChannelManagerId: string | null;
  resellerCommissionBps: number | null;
  channelOverrideBps: number | null;
  deliveryShareBps: number | null;
  deliveryOverrideBps: number | null;
  commissionPeriodStart: Date | null;
  commissionPeriodEnd: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): CustomerPartnerAttributionRecord {
  return {
    id: row.id,
    customerOrganisationId: row.customerOrganisationId,
    acquisitionSource: (row.acquisitionSource as AcquisitionSource | null) ?? null,
    resellerPartnerId: row.resellerPartnerId,
    channelManagerPartnerId: row.channelManagerPartnerId,
    deliveryPartnerId: row.deliveryPartnerId,
    deliveryChannelManagerId: row.deliveryChannelManagerId,
    resellerCommissionBps: row.resellerCommissionBps,
    channelOverrideBps: row.channelOverrideBps,
    deliveryShareBps: row.deliveryShareBps,
    deliveryOverrideBps: row.deliveryOverrideBps,
    commissionPeriodStart: row.commissionPeriodStart?.toISOString() ?? null,
    commissionPeriodEnd: row.commissionPeriodEnd?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getCustomerPartnerAttribution(
  customerOrganisationId: string,
): Promise<CustomerPartnerAttributionRecord | null> {
  try {
    const row = await prisma.customerPartnerAttribution.findUnique({
      where: { customerOrganisationId },
    });
    return row ? mapRow(row) : null;
  } catch {
    return null;
  }
}

/** Create or update attribution only when not yet locked — preserves historical snapshots. */
export async function upsertCustomerPartnerAttribution(input: {
  customerOrganisationId: string;
  acquisitionSource?: AcquisitionSource;
  resellerPartnerId?: string | null;
  channelManagerPartnerId?: string | null;
  deliveryPartnerId?: string | null;
  deliveryChannelManagerId?: string | null;
  resellerPartnerType?: PartnerType;
  commissionPeriodStart?: Date;
  commissionPeriodMonths?: number;
}): Promise<CustomerPartnerAttributionRecord | null> {
  try {
    const existing = await prisma.customerPartnerAttribution.findUnique({
      where: { customerOrganisationId: input.customerOrganisationId },
    });
    if (existing) return mapRow(existing);

    const resellerConfig = input.resellerPartnerType
      ? PARTNER_COMMISSION_CONFIG[input.resellerPartnerType]
      : null;
    const periodStart = input.commissionPeriodStart ?? new Date();
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + (input.commissionPeriodMonths ?? 12));

    const row = await prisma.customerPartnerAttribution.create({
      data: {
        customerOrganisationId: input.customerOrganisationId,
        acquisitionSource: input.acquisitionSource ?? null,
        resellerPartnerId: input.resellerPartnerId ?? null,
        channelManagerPartnerId: input.channelManagerPartnerId ?? null,
        deliveryPartnerId: input.deliveryPartnerId ?? null,
        deliveryChannelManagerId: input.deliveryChannelManagerId ?? null,
        resellerCommissionBps: resellerConfig?.commissionBps ?? null,
        channelOverrideBps: BPS.CHANNEL_MANAGER_OVERRIDE,
        deliveryShareBps: BPS.DELIVERY_PARTNER,
        deliveryOverrideBps: BPS.DELIVERY_CHANNEL_MANAGER_OVERRIDE,
        commissionPeriodStart: periodStart,
        commissionPeriodEnd: periodEnd,
      },
    });
    return mapRow(row);
  } catch {
    return null;
  }
}
