/**
 * Digital Identity — central record of an organisation's online presence.
 */

export interface DigitalIdentityProfile {
  organisationId: string;
  updatedAt: Date;

  domains: string[];
  websites: { url: string; platform?: string; connectorId?: string }[];
  emailDomains: string[];

  googleBusinessProfile?: { placeId?: string; url?: string };
  socialProfiles: { platform: string; url: string }[];

  reviewSources: { platform: string; url?: string; averageRating?: number }[];
  aiMentionSources: string[];

  structuredDataEnabled?: boolean;
  knowledgeGraphEntityId?: string;
  backlinkCount?: number;

  connectedConnectorIds: string[];
}
