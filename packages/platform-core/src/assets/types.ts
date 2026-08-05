/** Shared Asset Library — brand assets available to every App */

export type AssetType =
  | "logo"
  | "image"
  | "video"
  | "document"
  | "template"
  | "font"
  | "guideline"
  | "marketing";

export interface AssetRecord {
  id: string;
  organisationId: string;
  type: AssetType;
  name: string;
  mimeType?: string;
  url: string;
  tags?: string[];
  brandColours?: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface BrandKit {
  organisationId: string;
  primaryLogoAssetId?: string;
  colours: string[];
  fonts: string[];
  guidelineAssetIds: string[];
}
