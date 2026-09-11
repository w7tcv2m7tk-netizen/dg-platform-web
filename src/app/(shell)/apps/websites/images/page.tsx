import Link from "next/link";
import {
  getOrganisationBusinessProfile,
  listStudioLibraryImages,
  organisationHasWebsitesBuilder,
} from "@dg/platform-core";

import { StudioImagesPanel } from "@/components/websites/StudioImagesPanel";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";
import { canAccessWebsiteStudio } from "@/lib/website-studio-access";

export default async function ImagesLibraryPage() {
  const session = await getAuthorisedPlatformPageSession("websites.read");
  const canEdit = session ? canAccessWebsiteStudio(session, "edit") : false;

  const allowed = session
    ? await organisationHasWebsitesBuilder(session.organisationId)
    : false;

  const [uploaded, profile] = await Promise.all([
    session && allowed ? listStudioLibraryImages(session.organisationId) : Promise.resolve([]),
    session ? getOrganisationBusinessProfile(session.organisationId) : Promise.resolve(null),
  ]);

  const businessName =
    profile && typeof profile.businessName === "string"
      ? profile.businessName.trim().toLowerCase()
      : "";
  const showDigitalGateMedia =
    session?.organisationName.trim().toLowerCase() === "digitalgate" ||
    businessName === "digitalgate";

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Images</h1>
        <p className="text-sm text-slate-400">
          Manage website images for this business and copy image links for use in Studio.
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        {!allowed ? (
          <div className="rounded-lg border border-amber-800/60 bg-amber-950/30 p-5 max-w-xl">
            <p className="text-sm text-amber-100/90">
              Design Studio isn&apos;t enabled for this business yet.
            </p>
          </div>
        ) : canEdit ? (
          <>
            <StudioImagesPanel
              initialUploaded={uploaded}
              showDigitalGateMedia={showDigitalGateMedia}
            />
            <p className="text-sm text-slate-500">
              Use these images in a site under{" "}
              <Link href="/apps/websites" className="text-slate-300 underline">
                Websites
              </Link>
              .
            </p>
          </>
        ) : (
          <div className="max-w-2xl space-y-4">
            <p className="text-sm text-slate-500">
              You have read-only access to this image library.
            </p>
            {uploaded.length === 0 ? (
              <p className="text-sm text-slate-400">No images have been uploaded for this business.</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {uploaded.map((image) => (
                  <li key={image.id} className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
                    <p className="truncate text-sm text-slate-200">{image.label}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {image.width && image.height ? `${image.width}×${image.height}` : "Image"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>
    </>
  );
}
