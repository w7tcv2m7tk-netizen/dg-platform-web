import { searchBusinessIdentityByName } from "../business-identity";
import { googlePlacesProvider } from "../business-discovery/providers/google-places";
import { AcquisitionError, verifyAcquisitionAbn } from "./identity";

const providers = { searchName: searchBusinessIdentityByName, verifyAbn: verifyAcquisitionAbn, google: googlePlacesProvider };

/** Read-only provider search. Registry identity and Google listings are never merged by name. */
export async function searchProspectIntake(
  input: { mode: "name" | "abn"; query: string; location?: string },
  dependencies = providers,
) {
  const query = input.query.trim();
  const location = input.location?.trim();
  if (query.length < 3 || query.length > 200 || (location?.length ?? 0) > 200)
    throw new AcquisitionError("invalid_search", "Enter a business name or ABN between 3 and 200 characters", 422);

  const warnings: string[] = [];
  let verifiedIdentity: Awaited<ReturnType<typeof verifyAcquisitionAbn>>["provenance"]["snapshot"] | null = null;
  let registry: Awaited<ReturnType<typeof searchBusinessIdentityByName>>["matches"] = [];
  let googleQuery = query;
  try {
    if (input.mode === "abn") {
      const verified = await dependencies.verifyAbn(query);
      verifiedIdentity = verified.provenance.snapshot;
      const names = [...new Set([
        verifiedIdentity.entity.legalName,
        ...(verifiedIdentity.entity.businessNames ?? []),
        ...(verifiedIdentity.entity.tradingNames ?? []),
      ].filter((name): name is string => Boolean(name?.trim())))];
      registry = names.length
        ? names.map((businessName) => ({ abn: verified.abn, businessName }))
        : [{ abn: verified.abn, businessName: verified.abn }];
      googleQuery = names[0] || "";
      if (names.length > 1) warnings.push(`This ABN has multiple registered names. Select the intended business. Google results use ${names[0]}; search another name directly if needed.`);
    } else {
      const result = await dependencies.searchName(query, 12);
      registry = result.matches;
      if (!result.configured) warnings.push("ABR search is unavailable. Try again later or enter an unverified prospect manually.");
    }
  } catch {
    warnings.push("ABR could not verify or find this business. Check the query and try again; no identity has been confirmed.");
    // A failed ABN lookup cannot establish the business name for Google.
    if (input.mode === "abn") googleQuery = "";
  }

  let google: Awaited<ReturnType<typeof googlePlacesProvider.search>> = [];
  if (!dependencies.google.isConfigured()) warnings.push("Google business search is currently unavailable.");
  else if (googleQuery) {
    try {
      google = await dependencies.google.search({ textQuery: [googleQuery, location].filter(Boolean).join(" "), location, limit: 12 });
    } catch { warnings.push("Google business search failed. ABR results can still be used."); }
  }
  return { registry, verifiedIdentity, google, warnings };
}
