export type StudioPublicationState = {
  siteStatus?: string | null;
  pageStatus?: string | null;
  previewRequested: boolean;
  previewAuthorised: boolean;
};

/**
 * Public traffic may render only published Studio content. Draft content is
 * available exclusively when the caller has already established an authorised
 * Studio preview session.
 */
export function canRenderStudioContent(state: StudioPublicationState): boolean {
  if (state.previewRequested && state.previewAuthorised) return true;
  if (state.siteStatus !== "published") return false;
  if (state.pageStatus && state.pageStatus !== "published") return false;
  return true;
}
