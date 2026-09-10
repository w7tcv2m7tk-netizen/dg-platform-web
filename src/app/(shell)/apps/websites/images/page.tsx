import Link from "next/link";
import {
  listStudioLibraryImages,
  organisationHasWebsitesBuilder,
} from "@dg/platform-core";

import { StudioImagesPanel } from "@/components/websites/StudioImagesPanel";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

export default async function ImagesLibraryPage() {
  const session = await getAuthorisedPlatformPageSession("websites.read");

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
          Upload, copy, or delete hosted images for this organisation. Paste a URL
          or <code className="text-slate-300">&lt;img&gt;</code> tag into Header,
          Page or Footer HTML in Studio.
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        {!allowed ? (
          <div className="rounded-lg border border-amber-800/60 bg-amber-950/30 p-5 max-w-xl">
            <p className="text-sm text-amber-100/90">
              Enable Design Studio to use the image library.
            </p>
          </div>
        ) : (
          <>
            <StudioImagesPanel initialUploaded={uploaded} />
            <p className="text-sm text-slate-500">
              Paste into a site under{" "}
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
