export type CommercialPropertyRecord = {
  id: string;
  organisationId: string;
  name: string;
  addressLine1: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
  status: string;
  propertyType: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type CommercialLeaseRecord = {
  id: string;
  organisationId: string;
  commercialPropertyId: string | null;
  title: string;
  stage: string;
  status: string;
  landlordContactId: string | null;
  tenantContactId: string | null;
  rentCents: number | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateCommercialPropertyInput = {
  organisationId: string;
  actorId?: string;
  name: string;
  addressLine1: string;
  suburb: string;
  state: string;
  postcode: string;
  country?: string;
  propertyType?: string;
};

export type CreateCommercialLeaseInput = {
  organisationId: string;
  actorId?: string;
  title: string;
  commercialPropertyId?: string;
  stage?: string;
  landlordContactId?: string;
  tenantContactId?: string;
  rentCents?: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
};
