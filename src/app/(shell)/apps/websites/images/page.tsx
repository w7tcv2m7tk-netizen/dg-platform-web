import Link from "next/link";
import {
  listStudioLibraryImages,
  organisationHasWebsitesBuilder,
} from "@dg/platform-core";

import { StudioImagesPanel } from "@/components/websites/StudioImagesPanel";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";
import { canAccessWebsiteStudio } from "@/lib/website-studio-access";

export default async function ImagesLibraryPage() {
  const session = await getAuthorisedPlatformPageSession("websites.read");
  const canEdit = session ? canAccessWebsiteStudio(session, "edit") : false;
  const canDelete = session ? canAccessWebsiteStudio(session, "delete") : false;

  const allowed = session
    ? await organisationHasWebsitesBuilder(session.organisationId)
    : false;

  const uploaded =
    session && allowed ? await listStudioLibraryImages(session.organisationId) : [];

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
        ) : (
          <>
            {!canEdit ? (
              <p className="text-sm text-slate-500">
                You have read-only access to this image library.
              </p>
            ) : null}
            <StudioImagesPanel
              initialUploaded={uploaded}
              canUpload={canEdit}
              canDelete={canDelete}
            />
            <p className="text-sm text-slate-500">
              Use these images in a site under{" "}
              <Link href="/apps/websites" className="text-slate-300 underline">
                Websites
              </Link>
              .
            </p>
          </>
        )}
      </main>
    </>
  );
}
